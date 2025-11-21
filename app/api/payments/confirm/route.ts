import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  sendCustomerEventConfirmation,
  sendCustomerPaymentReceipt,
  type BookingWithExtras,
} from "@/lib/email";
import { ensureManagementTokenForBooking } from "@/lib/bookingTokens";

type RequestBody = {
  sessionId?: string;
};

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const { sessionId } = body;

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json(
      { error: "Missing sessionId." },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (!session || session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed." },
        { status: 400 }
      );
    }

    const bookingId = session.metadata?.bookingId;
    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json(
        { error: "Booking metadata missing from session." },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        addOns: {
          include: {
            addOn: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    // CRITICAL: Only event bookings have payments
    if (booking.bookingType !== "EVENT") {
      return NextResponse.json(
        { error: "Payment confirmation is only available for event bookings." },
        { status: 400 }
      );
    }

    const isDuplicateSession =
      booking.stripeCheckoutSessionId === session.id &&
      booking.stripePaymentStatus === "paid";

    if (isDuplicateSession) {
      const finalized = await ensureManagementTokenForBooking(booking);
      const managementToken =
        (finalized as { managementToken?: string | null })
          .managementToken ?? null;

      return NextResponse.json({
        success: true,
        booking: {
          id: finalized.id,
          bookingType: finalized.bookingType,
          eventDate: finalized.eventDate.toISOString(),
          startTime: finalized.startTime.toISOString(),
          endTime: finalized.endTime.toISOString(),
          status: finalized.status,
          amountPaidCents: finalized.amountPaidCents,
          totalCents: finalized.totalCents ?? null,
          managementToken,
        },
      });
    }

    const paymentAmount =
      typeof session.amount_total === "number" ? session.amount_total : 0;
    const paymentType = session.metadata?.type ?? "initial";
    const newAmountPaid =
      paymentType === "remaining-balance"
        ? booking.amountPaidCents + paymentAmount
        : paymentAmount || booking.amountPaidCents;

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        stripePaymentStatus: session.payment_status,
        amountPaidCents: newAmountPaid,
        status: "CONFIRMED",
      },
      include: {
        addOns: {
          include: {
            addOn: true,
          },
        },
      },
    });

    const finalizedBooking = (await ensureManagementTokenForBooking(
      updated
    )) as BookingWithExtras;

    // Send confirmation/receipt emails after successful payment (non-blocking)
    const wasAlreadyConfirmed = booking.status === "CONFIRMED";
    const isRemainingBalance = paymentType === "remaining-balance";
    if (!wasAlreadyConfirmed) {
      sendCustomerEventConfirmation(finalizedBooking).catch((err) => {
        console.error("Email sending failed after payment confirmation:", err);
      });
    }
    sendCustomerPaymentReceipt(
      finalizedBooking,
      paymentAmount,
      isRemainingBalance
    ).catch((err) => {
      console.error("Payment receipt email failed:", err);
    });

    const managementToken =
      (finalizedBooking as { managementToken?: string | null })
        .managementToken ?? null;

    return NextResponse.json({
      success: true,
      booking: {
        id: finalizedBooking.id,
        bookingType: finalizedBooking.bookingType,
        eventDate: finalizedBooking.eventDate.toISOString(),
        startTime: finalizedBooking.startTime.toISOString(),
        endTime: finalizedBooking.endTime.toISOString(),
        status: finalizedBooking.status,
        amountPaidCents: finalizedBooking.amountPaidCents,
        totalCents: finalizedBooking.totalCents ?? null,
        managementToken,
      },
    });
  } catch (error) {
    console.error("Error confirming Stripe payment", error);
    return NextResponse.json(
      { error: "Unexpected error confirming payment." },
      { status: 500 }
    );
  }
}

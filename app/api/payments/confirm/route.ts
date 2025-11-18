import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendBookingConfirmationEmail, sendAdminNotificationEmail } from "@/lib/email";

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

    // Idempotency: if already paid, return success without updating
    if (booking.stripePaymentStatus === "paid") {
      return NextResponse.json({
        success: true,
        booking: {
          id: booking.id,
          bookingType: booking.bookingType,
          eventDate: booking.eventDate.toISOString(),
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
          status: booking.status,
          amountPaidCents: booking.amountPaidCents,
          totalCents: booking.totalCents ?? null,
        },
      });
    }

    // Update booking if not already paid
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        stripePaymentStatus: session.payment_status,
        amountPaidCents:
          typeof session.amount_total === "number" ? session.amount_total : 0,
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

    // Send confirmation emails after successful payment
    // Errors are logged but won't break the payment confirmation flow
    sendBookingConfirmationEmail(updated).catch((err) => {
      console.error("Email sending failed after payment confirmation:", err);
    });
    
    sendAdminNotificationEmail(updated, "EVENT").catch((err) => {
      console.error("Admin notification failed after payment confirmation:", err);
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: updated.id,
        bookingType: updated.bookingType,
        eventDate: updated.eventDate.toISOString(),
        startTime: updated.startTime.toISOString(),
        endTime: updated.endTime.toISOString(),
        status: updated.status,
        amountPaidCents: updated.amountPaidCents,
        totalCents: updated.totalCents ?? null,
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


import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  loadBookingForManagement,
  ManagementTokenExpiredError,
} from "@/lib/manageBooking";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const booking = await loadBookingForManagement(token);

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.bookingType !== "EVENT") {
      return NextResponse.json(
        { error: "Remaining balance payments are only available for events." },
        { status: 400 }
      );
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "You cannot pay for a cancelled booking." },
        { status: 400 }
      );
    }

    const remainingCents = booking.totalCents - booking.amountPaidCents;
    if (remainingCents <= 0) {
      return NextResponse.json(
        { error: "There is no remaining balance to pay." },
        { status: 400 }
      );
    }

    const successUrl = process.env.STRIPE_SUCCESS_URL;
    const cancelUrl = process.env.STRIPE_CANCEL_URL;

    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Stripe success/cancel URLs are not configured." },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: remainingCents,
            product_data: {
              name: "Remaining Balance – Greenwood Hall Event",
              description: `Event for ${booking.contactName}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: booking.id,
        type: "remaining-balance",
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        stripeCheckoutSessionId: session.id,
        stripePaymentStatus: session.payment_status ?? "requires_payment_method",
      },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    if (error instanceof ManagementTokenExpiredError) {
      return NextResponse.json(
        { error: "This management link has expired." },
        { status: 410 }
      );
    }

    console.error(
      "Manage booking create-checkout-session error:",
      error
    );
    return NextResponse.json(
      { error: "Unable to start payment session." },
      { status: 500 }
    );
  }
}

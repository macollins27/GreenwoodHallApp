import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

type RequestBody = {
  bookingId?: string;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const DEFAULT_PAYMENT_STATUS = "requires_payment_method";

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

  if (!body.bookingId) {
    return NextResponse.json(
      { error: "bookingId is required." },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id: body.bookingId },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (booking.bookingType !== "EVENT") {
    return NextResponse.json(
      { error: "Only event bookings require payment." },
      { status: 400 }
    );
  }

  if (booking.totalCents <= 0) {
    return NextResponse.json(
      { error: "Booking total must be greater than zero." },
      { status: 400 }
    );
  }

  if (booking.stripePaymentStatus === "paid") {
    return NextResponse.json(
      { error: "This booking is already paid." },
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

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: booking.totalCents,
            product_data: {
              name: `Event Booking – ${booking.eventType || "Event"} at Greenwood Hall`,
              description: `Event on ${formatDate(booking.eventDate)} for ${booking.contactName}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: booking.id,
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        stripeCheckoutSessionId: session.id,
        stripePaymentStatus: session.payment_status ?? DEFAULT_PAYMENT_STATUS,
      },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Failed to create checkout session", error);
    return NextResponse.json(
      { error: "Unable to start payment session." },
      { status: 500 }
    );
  }
}


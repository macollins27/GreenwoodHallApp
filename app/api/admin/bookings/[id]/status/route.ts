import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";
import {
  sendAdminCancellationNotification,
  sendCustomerEventCancelled,
  sendCustomerShowingCancelled,
  type BookingWithExtras,
} from "@/lib/email";

const EVENT_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"] as const;
const SHOWING_STATUSES = ["PENDING", "COMPLETED", "CANCELLED"] as const;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  if (!cookieStore.get(ADMIN_COOKIE_NAME)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const status = body?.status;

  if (!status || typeof status !== "string") {
    return NextResponse.json(
      { error: "Status is required." },
      { status: 400 }
    );
  }

  try {
    // First, get the booking to check its type
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
      include: {
        addOns: {
          include: { addOn: true },
        },
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    // Validate status based on booking type
    const allowedStatuses =
      existingBooking.bookingType === "SHOWING"
        ? SHOWING_STATUSES
        : EVENT_STATUSES;

    if (!allowedStatuses.some((value) => value === status)) {
      return NextResponse.json(
        { 
          error: `Invalid status for ${existingBooking.bookingType} booking. Allowed: ${allowedStatuses.join(", ")}` 
        },
        { status: 400 }
      );
    }

    const previousStatus = existingBooking.status;
    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        addOns: {
          include: { addOn: true },
        },
      },
    });

    if (status === "CANCELLED" && previousStatus !== "CANCELLED") {
      const enhanced = booking as BookingWithExtras;
      if (booking.bookingType === "EVENT") {
        sendCustomerEventCancelled(enhanced).catch((err) =>
          console.error("Failed to send event cancellation notice:", err)
        );
      } else {
        sendCustomerShowingCancelled(enhanced).catch((err) =>
          console.error("Failed to send showing cancellation notice:", err)
        );
      }
      sendAdminCancellationNotification(enhanced).catch((err) =>
        console.error("Failed to send admin cancellation notice:", err)
      );
    }
    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error("Failed to update status", error);
    return NextResponse.json(
      { error: "Unable to update booking." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  return PATCH(request, context);
}

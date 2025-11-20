import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  loadBookingForManagement,
  ManagementTokenExpiredError,
} from "@/lib/manageBooking";

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

    if (booking.status === "CANCELLED") {
      return NextResponse.json({ success: true, alreadyCancelled: true });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({
      success: true,
      bookingId: updated.id,
    });
  } catch (error) {
    if (error instanceof ManagementTokenExpiredError) {
      return NextResponse.json(
        { error: "This management link has expired." },
        { status: 410 }
      );
    }

    console.error("Manage booking cancel error:", error);
    return NextResponse.json(
      { error: "Unable to cancel booking." },
      { status: 500 }
    );
  }
}

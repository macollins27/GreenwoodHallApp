import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    // Serialize dates
    const serialized = {
      ...booking,
      eventDate: booking.eventDate.toISOString(),
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      contractAcceptedAt: booking.contractAcceptedAt
        ? booking.contractAcceptedAt.toISOString()
        : null,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };

    return NextResponse.json(serialized, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch booking:", error);
    return NextResponse.json(
      { error: "Unable to fetch booking." },
      { status: 500 }
    );
  }
}


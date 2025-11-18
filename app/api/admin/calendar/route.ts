import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "start and end date parameters are required" },
      { status: 400 }
    );
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Fetch bookings within the date range
    const bookings = await prisma.booking.findMany({
      where: {
        eventDate: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        eventDate: "asc",
      },
    });

    // Fetch blocked dates within the date range
    const blockedDates = await prisma.blockedDate.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Serialize dates for JSON
    const serializedBookings = bookings.map((booking) => ({
      id: booking.id,
      bookingType: booking.bookingType,
      status: booking.status,
      contactName: booking.contactName,
      contactEmail: booking.contactEmail,
      eventType: booking.eventType,
      guestCount: booking.guestCount,
      eventDate: booking.eventDate.toISOString(),
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      totalCents: booking.totalCents,
      amountPaidCents: booking.amountPaidCents,
      stripePaymentStatus: booking.stripePaymentStatus,
      paymentMethod: booking.paymentMethod,
      contractAccepted: booking.contractAccepted,
    }));

    const serializedBlockedDates = blockedDates.map((blocked) => ({
      id: blocked.id,
      date: blocked.date.toISOString(),
      reason: blocked.reason ?? "",
    }));

    return NextResponse.json({
      bookings: serializedBookings,
      blockedDates: serializedBlockedDates,
    });
  } catch (error) {
    console.error("Calendar data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}

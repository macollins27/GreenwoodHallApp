import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { EVENT_BLOCKING_STATUS } from "@/lib/bookingStatus";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    if (!dateParam) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    // Parse date in local timezone
    const [year, month, day] = dateParam.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Check if date is blocked
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const blockedDate = await prisma.blockedDate.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    if (blockedDate) {
      return NextResponse.json({ status: "blocked", reason: blockedDate.reason });
    }

    // Check if there's already an event booking on this date
    const existingEvent = await prisma.booking.findFirst({
      where: {
        bookingType: "EVENT",
        eventDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: EVENT_BLOCKING_STATUS,
      },
    });

    if (existingEvent) {
      return NextResponse.json({ status: "booked" });
    }

    return NextResponse.json({ status: "available" });
  } catch (error) {
    console.error("Error checking event availability:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}

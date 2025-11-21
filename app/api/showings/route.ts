import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  sendAdminShowingNotification,
  sendCustomerShowingConfirmation,
  type BookingWithExtras,
} from "@/lib/email";
import {
  createLocalDateTime,
  getDayBoundaries,
  getLocalWeekday,
  parseTimeString,
} from "@/lib/datetime";
import { EVENT_BLOCKING_STATUS } from "@/lib/bookingStatus";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      showingDate,
      showingTime,
      contactName,
      contactEmail,
      contactPhone,
      notes,
    } = body;

    // Validate required fields
    if (!showingDate || !showingTime || !contactName || !contactEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Parse date to get start/end of day for range query
    const boundaries = getDayBoundaries(showingDate);
    if (!boundaries) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    const { startOfDay, endOfDay } = boundaries;

    // Get day of week
    const dayOfWeek = getLocalWeekday(showingDate);
    if (dayOfWeek === null) {
      return NextResponse.json(
        { error: "Invalid date" },
        { status: 400 }
      );
    }

    // Check if there's an event on this date (CRITICAL: Events block entire day for showings)
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
      return NextResponse.json(
        { error: "This date has an event booking. Showings are not available on event dates." },
        { status: 400 }
      );
    }

    // Check if date is blocked
    const blockedDate = await prisma.blockedDate.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    if (blockedDate) {
      return NextResponse.json(
        { error: "This date is blocked and not available for showings" },
        { status: 400 }
      );
    }

    // Check if this time slot is available for this day of week
    const availabilityWindow = await prisma.showingAvailability.findFirst({
      where: {
        dayOfWeek,
        enabled: true,
        startTime: {
          lte: showingTime,
        },
        endTime: {
          gt: showingTime,
        },
      },
    });

    if (!availabilityWindow) {
      return NextResponse.json(
        { error: "This time slot is not available for showings on this day" },
        { status: 400 }
      );
    }

    // Check if there's already a showing at this exact time
    const startTimeObj = createLocalDateTime(showingDate, showingTime);
    if (!startTimeObj) {
      return NextResponse.json(
        { error: "Invalid time format" },
        { status: 400 }
      );
    }

    const existingShowing = await prisma.booking.findFirst({
      where: {
        bookingType: "SHOWING",
        eventDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
        startTime: startTimeObj,
        status: {
          not: "CANCELLED",
        },
      },
    });

    if (existingShowing) {
      return NextResponse.json(
        { error: "This time slot is already booked. Please choose another time." },
        { status: 400 }
      );
    }

    // Calculate end time (30 minutes after start)
    const parsedTime = parseTimeString(showingTime);
    if (!parsedTime) {
      return NextResponse.json(
        { error: "Invalid time format" },
        { status: 400 }
      );
    }

    const { hours, minutes } = parsedTime;
    const endMinutes = minutes + 30;
    const endHours = hours + Math.floor(endMinutes / 60);
    const finalEndMinutes = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, "0")}:${finalEndMinutes.toString().padStart(2, "0")}`;

    const endTimeObj = createLocalDateTime(showingDate, endTime);
    if (!endTimeObj) {
      return NextResponse.json(
        { error: "Error calculating end time" },
        { status: 500 }
      );
    }

    // Create showing booking
    const booking = await prisma.booking.create({
      data: {
        bookingType: "SHOWING",
        eventDate: startOfDay,
        startTime: startTimeObj,
        endTime: endTimeObj,
        dayType: "weekday", // Showings don't use pricing, but field is required
        hourlyRateCents: 0,
        eventHours: 0,
        extraSetupHours: 0,
        baseAmountCents: 0,
        extraSetupCents: 0,
        depositCents: 0,
        totalCents: 0,
        eventType: "Showing",
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        notes: notes || null,
        status: "CONFIRMED",
      },
    });

    // Send confirmation emails (async, non-blocking)
    // Errors are logged but won't break the booking flow
    const enhancedBooking = booking as BookingWithExtras;
    sendCustomerShowingConfirmation(enhancedBooking).catch((err) => {
      console.error("Email sending failed, but booking was created:", err);
    });

    sendAdminShowingNotification(enhancedBooking).catch((err) => {
      console.error("Admin notification failed, but booking was created:", err);
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      booking,
    });
  } catch (error) {
    console.error("Error creating showing appointment:", error);
    return NextResponse.json(
      { error: "Failed to create showing appointment" },
      { status: 500 }
    );
  }
}

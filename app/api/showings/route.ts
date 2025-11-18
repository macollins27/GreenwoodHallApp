import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendShowingConfirmationEmail, sendAdminNotificationEmail } from "@/lib/email";

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
    const parts = showingDate.split("-");
    if (parts.length !== 3) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    const [yearStr, monthStr, dayStr] = parts;
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);

    const startOfDay = new Date(year, monthIndex, day);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Check if there's an event on this date (CRITICAL: Events block entire day for showings)
    const existingEvent = await prisma.booking.findFirst({
      where: {
        bookingType: "EVENT",
        eventDate: startOfDay,
        status: {
          not: "CANCELLED",
        },
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
        date: startOfDay,
      },
    });

    if (blockedDate) {
      return NextResponse.json(
        { error: "This date is blocked and not available for showings" },
        { status: 400 }
      );
    }

    // Get day of week from already parsed date
    const dayOfWeek = startOfDay.getDay();

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
    const existingShowing = await prisma.booking.findFirst({
      where: {
        bookingType: "SHOWING",
        eventDate: startOfDay,
        startTime: new Date(`${showingDate}T${showingTime}:00`),
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
    const [hourStr, minuteStr] = showingTime.split(":");
    const startHour = parseInt(hourStr, 10);
    const startMinute = parseInt(minuteStr, 10);
    const endDate = new Date(year, monthIndex, day, startHour, startMinute + 30);
    const endTime = `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;

    // Create showing booking
    const booking = await prisma.booking.create({
      data: {
        bookingType: "SHOWING",
        eventDate: startOfDay,
        startTime: new Date(`${showingDate}T${showingTime}:00`),
        endTime: new Date(`${showingDate}T${endTime}:00`),
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
    sendShowingConfirmationEmail(booking).catch((err) => {
      console.error("Email sending failed, but booking was created:", err);
    });
    
    sendAdminNotificationEmail(booking, "SHOWING").catch((err) => {
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

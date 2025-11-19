import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PRICING_DETAILS } from "@/lib/constants";

const prisma = new PrismaClient();

function getLocalWeekdayFromDateString(dateStr: string): number | null {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;

  const [yearStr, monthStr, dayStr] = parts;
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  if (Number.isNaN(year) || Number.isNaN(monthIndex) || Number.isNaN(day)) {
    return null;
  }

  const localDate = new Date(year, monthIndex, day);
  return localDate.getDay();
}

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

    // Check if date is blocked
    const blockedDate = await prisma.blockedDate.findFirst({
      where: { date: dateParam },
    });

    if (blockedDate) {
      return NextResponse.json({ status: "blocked" });
    }

    // Check if there's already an event booking on this date
    const existingEvent = await prisma.booking.findFirst({
      where: {
        bookingType: "EVENT",
        eventDate: dateParam,
        status: {
          not: "CANCELLED",
        },
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      eventDate,
      startTime,
      endTime,
      extraSetupHours = 0,
      eventType,
      guestCount,
      contactName,
      contactEmail,
      contactPhone,
      notes,
      addOns = [],
    } = body;

    // Validate required fields
    if (!eventDate || !startTime || !endTime || !eventType || !contactName || !contactEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Parse date to get start/end of day for range queries
    const [year, month, day] = eventDate.split('-').map(Number);
    
    // Create date in UTC to avoid timezone issues
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    // Validate date is not blocked
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
        { error: "This date is blocked and not available for bookings" },
        { status: 400 }
      );
    }

    // Validate no existing event on this date
    const existingEvent = await prisma.booking.findFirst({
      where: {
        bookingType: "EVENT",
        eventDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: {
          not: "CANCELLED",
        },
      },
    });

    if (existingEvent) {
      return NextResponse.json(
        { error: "This date already has an event booking" },
        { status: 400 }
      );
    }

    // Parse times
    const [startHourStr] = startTime.split(":");
    const [endHourStr] = endTime.split(":");
    const startHour = parseInt(startHourStr, 10);
    const endHour = parseInt(endHourStr, 10);

    if (Number.isNaN(startHour) || Number.isNaN(endHour) || endHour <= startHour) {
      return NextResponse.json(
        { error: "Invalid time selection" },
        { status: 400 }
      );
    }

    // Validate weekend minimum duration
    const weekday = getLocalWeekdayFromDateString(eventDate);
    if (weekday === null) {
      return NextResponse.json(
        { error: "Invalid event date" },
        { status: 400 }
      );
    }

    const isWeekend = weekday === 0 || weekday === 5 || weekday === 6;
    const durationHours = endHour - startHour;

    if (isWeekend && durationHours < 4) {
      return NextResponse.json(
        { error: "Weekend event bookings must be at least 4 hours" },
        { status: 400 }
      );
    }

    // Calculate pricing
    const dayType = isWeekend ? "weekend" : "weekday";
    const hourlyRateCents = isWeekend 
      ? PRICING_DETAILS.weekendRate * 100 
      : PRICING_DETAILS.weekdayRate * 100;
    
    const extraSetup = Math.max(0, Math.trunc(extraSetupHours));
    const baseAmountCents = durationHours * hourlyRateCents;
    const extraSetupCents = extraSetup * (PRICING_DETAILS.extraSetupHourly * 100);
    const depositCents = PRICING_DETAILS.securityDeposit * 100;
    
    // Calculate add-ons total
    const addOnsTotal = Array.isArray(addOns) 
      ? addOns.reduce((sum, addon) => sum + (addon.priceAtBooking * addon.quantity), 0)
      : 0;
    
    const totalCents = baseAmountCents + extraSetupCents + depositCents + addOnsTotal;

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        bookingType: "EVENT",
        eventDate: startOfDay,
        startTime: new Date(`${eventDate}T${startTime}:00.000Z`),
        endTime: new Date(`${eventDate}T${endTime}:00.000Z`),
        dayType,
        hourlyRateCents,
        eventHours: durationHours,
        extraSetupHours: extraSetup,
        eventType,
        guestCount:
          guestCount !== null && !Number.isNaN(Number(guestCount))
            ? Number(guestCount)
            : null,
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        notes: notes || null,
        status: "PENDING",
        baseAmountCents,
        extraSetupCents,
        depositCents,
        totalCents,
        addOns: addOns.length > 0
          ? {
              create: addOns.map((addon: any) => ({
                addOnId: addon.addOnId,
                quantity: addon.quantity,
                priceAtBooking: addon.priceAtBooking,
              })),
            }
          : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      booking,
    });
  } catch (error) {
    console.error("Error creating event booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PRICING_DETAILS } from "@/lib/constants";
import {
  createLocalDate,
  createLocalDateTime,
  getDayBoundaries,
  getLocalWeekday,
  parseTimeString,
} from "@/lib/datetime";
import { EVENT_BLOCKING_STATUS } from "@/lib/bookingStatus";
import { sendAdminEventNotification, type BookingWithExtras } from "@/lib/email";

const prisma = new PrismaClient();

type IncomingAddOn = {
  addOnId?: string;
  quantity?: number;
  priceAtBooking?: number;
};

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

    const boundaries = getDayBoundaries(dateParam);
    if (!boundaries) {
      return NextResponse.json(
        { error: "Invalid date parameter" },
        { status: 400 }
      );
    }
    const { startOfDay, endOfDay } = boundaries;

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
      return NextResponse.json({ status: "blocked" });
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
    const boundaries = getDayBoundaries(eventDate);
    if (!boundaries) {
      return NextResponse.json(
        { error: "Invalid event date format" },
        { status: 400 }
      );
    }
    
    const { startOfDay, endOfDay } = boundaries;

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
        status: EVENT_BLOCKING_STATUS,
      },
    });

    if (existingEvent) {
      return NextResponse.json(
        { error: "This date already has an event booking" },
        { status: 400 }
      );
    }

    // Parse times
    const parsedStartTime = parseTimeString(startTime);
    const parsedEndTime = parseTimeString(endTime);

    if (!parsedStartTime || !parsedEndTime) {
      return NextResponse.json(
        { error: "Invalid time format" },
        { status: 400 }
      );
    }

    const startHour = parsedStartTime.hours;
    const endHour = parsedEndTime.hours;

    if (endHour <= startHour) {
      return NextResponse.json(
        { error: "Invalid time selection" },
        { status: 400 }
      );
    }

    // Validate weekend minimum duration
    const weekday = getLocalWeekday(eventDate);
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
    
    const parsedAddOns: IncomingAddOn[] = Array.isArray(addOns)
      ? addOns
          .map((addon: Partial<IncomingAddOn>) => ({
            addOnId: typeof addon.addOnId === "string" ? addon.addOnId : undefined,
            quantity: Number(addon?.quantity ?? 0),
            priceAtBooking: Number(addon?.priceAtBooking ?? 0),
          }))
          .filter(
            (addon) =>
              typeof addon.addOnId === "string" &&
              Number.isFinite(addon.quantity) &&
              addon.quantity > 0 &&
              Number.isFinite(addon.priceAtBooking) &&
              addon.priceAtBooking >= 0
          )
      : [];

    // Calculate add-ons total
    const addOnsTotal = parsedAddOns.reduce(
      (sum, addon) => sum + (addon.priceAtBooking ?? 0) * (addon.quantity ?? 0),
      0
    );
    
    const totalCents = baseAmountCents + extraSetupCents + depositCents + addOnsTotal;

    // Create date/time objects for storage
    const eventDateObj = createLocalDate(eventDate);
    const startTimeObj = createLocalDateTime(eventDate, startTime);
    const endTimeObj = createLocalDateTime(eventDate, endTime);

    if (!eventDateObj || !startTimeObj || !endTimeObj) {
      return NextResponse.json(
        { error: "Invalid date or time values" },
        { status: 400 }
      );
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        bookingType: "EVENT",
        eventDate: eventDateObj,
        startTime: startTimeObj,
        endTime: endTimeObj,
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
        addOns: parsedAddOns.length > 0
          ? {
              create: parsedAddOns.map((addon) => ({
                addOnId: addon.addOnId as string,
                quantity: addon.quantity as number,
                priceAtBooking: addon.priceAtBooking as number,
              })),
            }
          : undefined,
      },
      include: {
        addOns: {
          include: {
            addOn: true,
          },
        },
      },
    });

    // Admin notification (non-blocking)
    sendAdminEventNotification(booking as BookingWithExtras).catch((err) => {
      console.error("Admin notification failed for new event booking:", err);
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

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  PricingError,
  validateAndCalculatePricing,
} from "@/lib/pricing";

type BookingRequestBody = {
  bookingType?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  appointmentTime?: string; // For SHOWING bookings
  extraSetupHours?: number;
  eventType?: string;
  guestCount?: number | string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  contractAccepted?: boolean;
  contractSignerName?: string;
};

function parseDateOnly(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function combineDateAndTime(
  dateStr: string | undefined,
  timeStr: string | undefined
): Date | null {
  if (!dateStr || !timeStr) return null;
  const baseDate = parseDateOnly(dateStr);
  if (!baseDate) return null;
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr ?? "0");
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 24 ||
    minute < 0 ||
    minute > 59 ||
    (hour === 24 && minute !== 0)
  ) {
    return null;
  }
  const date = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hour,
    minute
  );
  return date;
}

function getDayBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function POST(request: Request) {
  let body: BookingRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const {
    bookingType,
    eventDate,
    startTime,
    endTime,
    appointmentTime,
    extraSetupHours,
    eventType,
    guestCount,
    contactName,
    contactEmail,
    contactPhone,
    notes,
    contractAccepted,
    contractSignerName,
  } = body;

  const normalizedBookingType =
    bookingType === "SHOWING" ? "SHOWING" : "EVENT";

  // Basic validation
  if (!eventDate || !contactName || !contactEmail) {
    return NextResponse.json(
      { error: "Missing required fields: eventDate, contactName, contactEmail" },
      { status: 400 }
    );
  }

  // SHOWING-specific logic
  if (normalizedBookingType === "SHOWING") {
    if (!appointmentTime) {
      return NextResponse.json(
        { error: "Appointment time is required for showings." },
        { status: 400 }
      );
    }

    const eventDateObj = parseDateOnly(eventDate);
    if (!eventDateObj) {
      return NextResponse.json(
        { error: "Invalid date format." },
        { status: 400 }
      );
    }

    // Get showing configuration to determine duration
    const showingConfig = await prisma.showingConfig.findFirst();
    const durationMinutes = showingConfig?.defaultDurationMinutes || 30;

    const startDateTime = combineDateAndTime(eventDate, appointmentTime);
    if (!startDateTime) {
      return NextResponse.json(
        { error: "Invalid appointment time format." },
        { status: 400 }
      );
    }

    // Calculate end time
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);

    const normalizedEventDate = new Date(
      eventDateObj.getFullYear(),
      eventDateObj.getMonth(),
      eventDateObj.getDate()
    );

    try {
      const booking = await prisma.booking.create({
        data: {
          bookingType: "SHOWING",
          eventDate: normalizedEventDate,
          startTime: startDateTime,
          endTime: endDateTime,
          dayType: "weekday",
          hourlyRateCents: 0,
          eventHours: 0,
          extraSetupHours: 0,
          baseAmountCents: 0,
          extraSetupCents: 0,
          depositCents: 0,
          totalCents: 0,
          contactName,
          contactEmail,
          contactPhone: contactPhone?.trim() || null,
          eventType: eventType || "Hall Showing",
          guestCount: null,
          notes: notes?.trim() || null,
          contractAccepted: false,
          contractAcceptedAt: null,
          contractSignerName: null,
          contractVersion: null,
          contractText: null,
          status: "PENDING",
        },
      });

      return NextResponse.json(
        {
          bookingId: booking.id,
          booking: booking,
          bookingType: booking.bookingType,
          status: booking.status,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Failed to create showing booking:", error);
      return NextResponse.json(
        { error: "Unable to create showing at this time." },
        { status: 500 }
      );
    }
  }

  // EVENT-specific logic
  if (!startTime || !endTime || !eventType) {
    return NextResponse.json(
      { error: "Missing required fields for event booking: startTime, endTime, eventType" },
      { status: 400 }
    );
  }

  // Contract acceptance is now handled in the wizard flow via /api/bookings/[id]/accept-contract
  // No contract validation required at booking creation time

  const eventDateObj = parseDateOnly(eventDate);
  const startDateTime = combineDateAndTime(eventDate, startTime);
  const endDateTime = combineDateAndTime(eventDate, endTime);

  if (!eventDateObj || !startDateTime || !endDateTime) {
    return NextResponse.json(
      { error: "Invalid date or time format." },
      { status: 400 }
    );
  }

  const normalizedEventDate = new Date(
    eventDateObj.getFullYear(),
    eventDateObj.getMonth(),
    eventDateObj.getDate()
  );

  const extraSetupRaw = Number(
    typeof extraSetupHours === "undefined" ? 0 : extraSetupHours
  );
  const extraSetup = Number.isFinite(extraSetupRaw)
    ? Math.trunc(extraSetupRaw)
    : 0;

  let parsedGuestCount: number | null = null;
  if (typeof guestCount === "number" && !Number.isNaN(guestCount)) {
    parsedGuestCount = guestCount;
  } else if (
    typeof guestCount === "string" &&
    guestCount.trim() !== ""
  ) {
    const numericGuestCount = Number(guestCount);
    parsedGuestCount = Number.isNaN(numericGuestCount)
      ? null
      : numericGuestCount;
  }

  let breakdown;
  try {
    breakdown = validateAndCalculatePricing({
      eventDate: normalizedEventDate,
      startTime: startDateTime,
      endTime: endDateTime,
      extraSetupHours:
        normalizedBookingType === "EVENT" ? extraSetup : 0,
      bookingType: normalizedBookingType,
    });
  } catch (error) {
    if (error instanceof PricingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Pricing validation failed:", error);
    return NextResponse.json(
      { error: "Unable to calculate pricing." },
      { status: 500 }
    );
  }

  if (normalizedBookingType === "EVENT") {
    const { start, end } = getDayBounds(normalizedEventDate);
    const existingBooking = await prisma.booking.findFirst({
      where: {
        bookingType: "EVENT",
        eventDate: {
          gte: start,
          lt: end,
        },
        NOT: { status: "CANCELLED" },
      },
    });

    if (existingBooking) {
      return NextResponse.json(
        { error: "This date is already booked for an event." },
        { status: 409 }
      );
    }
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        bookingType: normalizedBookingType,
        eventDate: normalizedEventDate,
        startTime: startDateTime,
        endTime: endDateTime,
        dayType: breakdown.dayType,
        hourlyRateCents: breakdown.hourlyRateCents,
        eventHours: breakdown.eventHours,
        extraSetupHours: breakdown.extraSetupHours,
        baseAmountCents: breakdown.baseAmountCents,
        extraSetupCents: breakdown.extraSetupCents,
        depositCents: breakdown.depositCents,
        totalCents: breakdown.totalCents,
        contactName,
        contactEmail,
        contactPhone: contactPhone?.trim() || null,
        eventType,
        guestCount: parsedGuestCount,
        notes: notes?.trim() || null,
        // Contract acceptance handled in wizard flow via /api/bookings/[id]/accept-contract
        contractAccepted: false,
        contractAcceptedAt: null,
        contractSignerName: null,
        contractVersion: null,
        contractText: null,
        status: "PENDING",
      },
    });

    return NextResponse.json(
      {
        bookingId: booking.id,
        booking: booking,
        bookingType: booking.bookingType,
        status: booking.status,
        pricing: breakdown,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create booking:", error);
    return NextResponse.json(
      { error: "Unable to create booking at this time." },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { EVENT_BLOCKING_STATUS, EVENT_STATUS } from "@/lib/bookingStatus";
import {
  PricingError,
  validateAndCalculatePricing,
} from "@/lib/pricing";
import {
  sendAdminEventNotification,
  sendAdminShowingNotification,
  sendCustomerEventConfirmation,
  sendCustomerShowingConfirmation,
  type BookingWithExtras,
} from "@/lib/email";
import { ensureManagementTokenForBooking } from "@/lib/bookingTokens";

type AdminBookingRequestBody = {
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
  adminNotes?: string;
  paymentMethod?: string;
  status?: string;
  amountPaidCents?: number;
  // Setup fields (EVENT only)
  rectTablesRequested?: number | null;
  roundTablesRequested?: number | null;
  chairsRequested?: number | null;
  setupNotes?: string | null;
  // Add-ons (EVENT only)
  addOns?: Array<{
    addOnId: string;
    quantity: number;
    priceAtBooking: number;
  }>;
  // Email configuration
  sendAdminEmail?: boolean; // Optional flag to control admin notifications
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
  let body: AdminBookingRequestBody;
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
    adminNotes,
    paymentMethod,
    status,
    amountPaidCents,
    rectTablesRequested,
    roundTablesRequested,
    chairsRequested,
    setupNotes,
    addOns,
    sendAdminEmail = true, // Default to true for backwards compatibility
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

    const validatedStatus = status === "PENDING" || status === "CONFIRMED" ? status : "CONFIRMED";

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
          eventType: "Hall Showing",
          guestCount: null,
          notes: notes?.trim() || null,
          adminNotes: adminNotes?.trim() || null,
          paymentMethod: null, // Showings never have payment
          amountPaidCents: 0,
          contractAccepted: false, // Showings don't use contracts
          contractAcceptedAt: null,
          contractSignerName: null,
          contractVersion: null,
          contractText: null,
          stripeCheckoutSessionId: null,
          stripePaymentStatus: null,
          status: validatedStatus,
        },
      });

      // Notifications (non-blocking)
      const showingEnhanced = booking as BookingWithExtras;
      sendCustomerShowingConfirmation(showingEnhanced).catch((err) => {
        console.error("Customer showing confirmation failed:", err);
      });
      if (sendAdminEmail) {
        sendAdminShowingNotification(showingEnhanced).catch((err) => {
          console.error("Admin notification email failed for admin-created showing:", err);
        });
      }

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
      console.error("Failed to create admin showing booking:", error);
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

  // Validate payment method
  const validPaymentMethods = ["STRIPE", "CASH", "CHECK", "COMP", "OTHER"];
  const normalizedPaymentMethod = paymentMethod?.toUpperCase() || "CASH";
  if (!validPaymentMethods.includes(normalizedPaymentMethod)) {
    return NextResponse.json(
      { error: "Invalid payment method." },
      { status: 400 }
    );
  }

  // Validate status
  const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED"];
  const normalizedStatus = status?.toUpperCase() || "CONFIRMED";
  if (!validStatuses.includes(normalizedStatus)) {
    return NextResponse.json(
      { error: "Invalid status." },
      { status: 400 }
    );
  }

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

  // Check for existing event booking on this date
  if (normalizedBookingType === "EVENT") {
    const { start, end } = getDayBounds(normalizedEventDate);
    const existingBooking = await prisma.booking.findFirst({
      where: {
        bookingType: "EVENT",
        eventDate: {
          gte: start,
          lt: end,
        },
        status: EVENT_BLOCKING_STATUS,
      },
    });

    if (existingBooking) {
      return NextResponse.json(
        { error: "This date is already booked for an event." },
        { status: 409 }
      );
    }
  }

  // Parse amount paid
  const normalizedAmountPaid =
    typeof amountPaidCents === "number" && amountPaidCents >= 0
      ? Math.trunc(amountPaidCents)
      : 0;

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
        adminNotes: adminNotes?.trim() || null,
        paymentMethod: normalizedPaymentMethod,
        status: normalizedStatus,
        amountPaidCents: normalizedAmountPaid,
        // Setup fields (EVENT only)
        rectTablesRequested: normalizedBookingType === "EVENT" ? (rectTablesRequested ?? null) : null,
        roundTablesRequested: normalizedBookingType === "EVENT" ? (roundTablesRequested ?? null) : null,
        chairsRequested: normalizedBookingType === "EVENT" ? (chairsRequested ?? null) : null,
        setupNotes: normalizedBookingType === "EVENT" ? (setupNotes?.trim() || null) : null,
        // Admin bookings auto-accept contract
        contractAccepted: true,
        contractAcceptedAt: new Date(),
        contractSignerName: contactName,
        contractVersion: "ADMIN_MANUAL",
        contractText: "Manual booking created by administrator. Contract waived.",
        // No Stripe info for manual bookings
        stripeCheckoutSessionId: null,
        stripePaymentStatus:
          normalizedPaymentMethod === "STRIPE" ? null : "manual",
        // Add-ons (EVENT only)
        addOns: normalizedBookingType === "EVENT" && addOns && addOns.length > 0
          ? {
              create: addOns.map((addon) => ({
                addOnId: addon.addOnId,
                quantity: addon.quantity,
                priceAtBooking: addon.priceAtBooking,
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

    let bookingRecord = booking as BookingWithExtras;

    if (
      normalizedBookingType === "EVENT" &&
      normalizedStatus === EVENT_STATUS.CONFIRMED
    ) {
      bookingRecord = (await ensureManagementTokenForBooking(
        bookingRecord
      )) as BookingWithExtras;
    }

    // Notifications (non-blocking)
    if (normalizedBookingType === "EVENT") {
      if (normalizedStatus === EVENT_STATUS.CONFIRMED) {
        sendCustomerEventConfirmation(bookingRecord).catch((err) => {
          console.error("Customer event confirmation failed for admin-created event:", err);
        });
      }
      if (sendAdminEmail) {
        sendAdminEventNotification(bookingRecord).catch((err) => {
          console.error("Admin notification email failed for admin-created event:", err);
        });
      }
    }

    return NextResponse.json(
      {
        bookingId: booking.id,
        booking: bookingRecord,
        bookingType: bookingRecord.bookingType,
        status: bookingRecord.status,
        pricing: breakdown,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create admin booking:", error);
    return NextResponse.json(
      { error: "Unable to create booking at this time." },
      { status: 500 }
    );
  }
}

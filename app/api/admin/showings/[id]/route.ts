import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import {
  createLocalDateTime,
  getDayBoundaries,
  getLocalWeekday,
  parseTimeString,
} from "@/lib/datetime";
import { EVENT_BLOCKING_STATUS, SHOWING_STATUS } from "@/lib/bookingStatus";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";
import { sendCustomerShowingUpdated, type BookingWithExtras } from "@/lib/email";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ShowingStatusValue =
  (typeof SHOWING_STATUS)[keyof typeof SHOWING_STATUS];

const ALLOWED_SHOWING_STATUSES = new Set<ShowingStatusValue>([
  SHOWING_STATUS.PENDING,
  SHOWING_STATUS.COMPLETED,
  SHOWING_STATUS.CANCELLED,
]);

type ShowingUpdatePayload = {
  eventDate?: string;
  time?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string | null;
  status?: ShowingStatusValue | string;
  notes?: string | null;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  if (!cookieStore.get(ADMIN_COOKIE_NAME)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "Booking id is required." },
      { status: 400 }
    );
  }

  let body: ShowingUpdatePayload = {};
  try {
    body = (await request.json()) as ShowingUpdatePayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const { eventDate, time, contactName, contactEmail, contactPhone, status, notes } =
    body ?? {};

  if (!eventDate || !time) {
    return NextResponse.json(
      { error: "eventDate and time are required." },
      { status: 400 }
    );
  }

  if (!contactName || !contactEmail) {
    return NextResponse.json(
      { error: "Contact name and email are required." },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
  });

  if (!booking || booking.bookingType !== "SHOWING") {
    return NextResponse.json(
      { error: "Showing booking not found." },
      { status: 404 }
    );
  }

  const normalizedStatus: ShowingStatusValue =
    typeof status === "string"
      ? (status.toUpperCase() as ShowingStatusValue)
      : ((booking.status as ShowingStatusValue) ?? SHOWING_STATUS.PENDING);

  if (!ALLOWED_SHOWING_STATUSES.has(normalizedStatus)) {
    return NextResponse.json(
      { error: "Invalid showing status provided." },
      { status: 400 }
    );
  }

  const parsedTime = parseTimeString(time);
  if (!parsedTime) {
    return NextResponse.json(
      { error: "Invalid time format." },
      { status: 400 }
    );
  }

  const { startOfDay, endOfDay } = getDayBoundaries(eventDate) ?? {};
  if (!startOfDay || !endOfDay) {
    return NextResponse.json(
      { error: "Invalid date supplied." },
      { status: 400 }
    );
  }

  const dayOfWeek = getLocalWeekday(eventDate);
  if (dayOfWeek === null) {
    return NextResponse.json(
      { error: "Invalid date supplied." },
      { status: 400 }
    );
  }

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
      {
        error:
          "This date is blocked. Remove the block or choose another date.",
      },
      { status: 409 }
    );
  }

  const conflictingEvent = await prisma.booking.findFirst({
    where: {
      bookingType: "EVENT",
      status: EVENT_BLOCKING_STATUS,
      eventDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });

  if (conflictingEvent) {
    return NextResponse.json(
      {
        error:
          "Showings are not allowed on dates that already have confirmed events.",
      },
      { status: 409 }
    );
  }

  const availabilityWindow = await prisma.showingAvailability.findFirst({
    where: {
      dayOfWeek,
      enabled: true,
      startTime: {
        lte: time,
      },
      endTime: {
        gt: time,
      },
    },
  });

  if (!availabilityWindow) {
    return NextResponse.json(
      {
        error: "This time is not available for showings on the selected day.",
      },
      { status: 400 }
    );
  }

  const config = await prisma.showingConfig.findFirst({
    where: { key: "default" },
  });

  if (!config) {
    return NextResponse.json(
      { error: "Showing configuration missing." },
      { status: 500 }
    );
  }

  const startTimeObj = createLocalDateTime(eventDate, time);
  if (!startTimeObj) {
    return NextResponse.json(
      { error: "Unable to parse showing start time." },
      { status: 400 }
    );
  }

  const endTimeObj = new Date(startTimeObj);
  endTimeObj.setMinutes(endTimeObj.getMinutes() + config.defaultDurationMinutes);

  const [windowEndHour, windowEndMinute] = availabilityWindow.endTime
    .split(":")
    .map(Number);
  const windowEnd = windowEndHour * 60 + windowEndMinute;
  const showingEndMinutes =
    parsedTime.hours * 60 + parsedTime.minutes + config.defaultDurationMinutes;

  if (showingEndMinutes > windowEnd) {
    return NextResponse.json(
      {
        error: "Showing duration exceeds the allowed time window.",
      },
      { status: 400 }
    );
  }

  const conflictingShowing = await prisma.booking.findFirst({
    where: {
      id: { not: booking.id },
      bookingType: "SHOWING",
      eventDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
      startTime: startTimeObj,
      status: {
        not: SHOWING_STATUS.CANCELLED,
      },
    },
  });

  if (conflictingShowing) {
    return NextResponse.json(
      {
        error: "Another showing already exists at this time.",
      },
      { status: 409 }
    );
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      eventDate: startOfDay,
      startTime: startTimeObj,
      endTime: endTimeObj,
      contactName,
      contactEmail,
      contactPhone: contactPhone || null,
      status: normalizedStatus,
      notes: typeof notes === "string" ? notes : null,
    },
  });

  sendCustomerShowingUpdated(
    updatedBooking as BookingWithExtras
  ).catch((err) =>
    console.error("Failed to send showing updated email:", err)
  );

  return NextResponse.json({
    success: true,
    booking: {
      ...updatedBooking,
      eventDate: updatedBooking.eventDate.toISOString(),
      startTime: updatedBooking.startTime.toISOString(),
      endTime: updatedBooking.endTime.toISOString(),
      createdAt: updatedBooking.createdAt.toISOString(),
      updatedAt: updatedBooking.updatedAt.toISOString(),
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import {
  createLocalDate,
  createLocalDateTime,
  getDayBoundaries,
  getLocalWeekday,
} from "@/lib/datetime";
import {
  EVENT_BLOCKING_STATUS,
  EVENT_STATUS,
} from "@/lib/bookingStatus";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type EventStatusValue =
  (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

const ALLOWED_EVENT_STATUSES = new Set([
  EVENT_STATUS.PENDING,
  EVENT_STATUS.CONFIRMED,
  EVENT_STATUS.CANCELLED,
]);

function parseInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.trunc(parsed);
}

function normalizeOptionalInt(
  value: unknown,
  fallback: number | null
): number | null {
  if (value === undefined) {
    return fallback;
  }
  return parseInteger(value);
}

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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const {
    eventDate,
    startTime,
    endTime,
    contactName,
    contactEmail,
    contactPhone,
    eventType,
    guestCount,
    extraSetupHours,
    rectTablesRequested,
    roundTablesRequested,
    chairsRequested,
    setupNotes,
    status,
    notes,
    addOns,
  } = body ?? {};

  if (!eventDate || !startTime || !endTime) {
    return NextResponse.json(
      { error: "eventDate, startTime, and endTime are required." },
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
    include: {
      addOns: true,
    },
  });

  if (!booking || booking.bookingType !== "EVENT") {
    return NextResponse.json(
      { error: "Event booking not found." },
      { status: 404 }
    );
  }

  const normalizedStatus: EventStatusValue =
    typeof status === "string"
      ? (status.toUpperCase() as EventStatusValue)
      : ((booking.status as EventStatusValue) ?? EVENT_STATUS.PENDING);

  if (!ALLOWED_EVENT_STATUSES.has(normalizedStatus)) {
    return NextResponse.json(
      { error: "Invalid event status provided." },
      { status: 400 }
    );
  }

  const eventDateObj = createLocalDate(eventDate);
  const startTimeObj = createLocalDateTime(eventDate, startTime);
  const endTimeObj = createLocalDateTime(eventDate, endTime);

  if (!eventDateObj || !startTimeObj || !endTimeObj) {
    return NextResponse.json(
      { error: "Invalid date or time supplied." },
      { status: 400 }
    );
  }

  const { startOfDay, endOfDay } = getDayBoundaries(eventDate) ?? {};
  if (!startOfDay || !endOfDay) {
    return NextResponse.json(
      { error: "Unable to determine date boundaries." },
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
      id: { not: booking.id },
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
      { error: "This date already has a confirmed event." },
      { status: 409 }
    );
  }

  const weekday = getLocalWeekday(eventDate);
  if (weekday === null) {
    return NextResponse.json(
      { error: "Invalid event date." },
      { status: 400 }
    );
  }

  const durationHours =
    (endTimeObj.getTime() - startTimeObj.getTime()) / (1000 * 60 * 60);

  if (durationHours <= 0) {
    return NextResponse.json(
      { error: "Event end time must be after start time." },
      { status: 400 }
    );
  }

  const isWeekend = weekday === 0 || weekday === 5 || weekday === 6;
  if (isWeekend && durationHours < 4) {
    return NextResponse.json(
      {
        error: "Weekend events must be at least 4 hours.",
      },
      { status: 400 }
    );
  }

  let addOnUpdate:
    | {
        deleteMany: {};
        create: {
          addOnId: string;
          quantity: number;
          priceAtBooking: number;
        }[];
      }
    | undefined;

  if (Array.isArray(addOns)) {
    const sanitizedAddOns = addOns
      .map((addon: any) => ({
        addOnId: typeof addon?.addOnId === "string" ? addon.addOnId : null,
        quantity: parseInteger(addon?.quantity) ?? 0,
      }))
      .filter((addon) => addon.addOnId && addon.quantity > 0);

    if (sanitizedAddOns.length > 0) {
      const catalog = await prisma.addOn.findMany({
        where: {
          id: {
            in: sanitizedAddOns.map((addon) => addon.addOnId!) as string[],
          },
        },
      });

      addOnUpdate = {
        deleteMany: {},
        create: sanitizedAddOns
          .map(({ addOnId, quantity }) => {
            const fullAddOn = catalog.find((item) => item.id === addOnId);
            if (!fullAddOn) {
              return null;
            }
            return {
              addOnId,
              quantity,
              priceAtBooking: fullAddOn.priceCents,
            };
          })
          .filter(Boolean) as {
          addOnId: string;
          quantity: number;
          priceAtBooking: number;
        }[],
      };
    } else {
      addOnUpdate = {
        deleteMany: {},
        create: [],
      };
    }
  }

  const guestCountInt =
    guestCount === undefined ? booking.guestCount : parseInteger(guestCount);
  const extraSetupHoursInt =
    extraSetupHours === undefined
      ? booking.extraSetupHours
      : parseInteger(extraSetupHours) ?? 0;
  const rectTablesInt = normalizeOptionalInt(
    rectTablesRequested,
    booking.rectTablesRequested ?? null
  );
  const roundTablesInt = normalizeOptionalInt(
    roundTablesRequested,
    booking.roundTablesRequested ?? null
  );
  const chairsInt = normalizeOptionalInt(
    chairsRequested,
    booking.chairsRequested ?? null
  );

  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      eventDate: eventDateObj,
      startTime: startTimeObj,
      endTime: endTimeObj,
      contactName,
      contactEmail,
      contactPhone: contactPhone || null,
      eventType: eventType || booking.eventType,
      guestCount: guestCountInt,
      extraSetupHours: extraSetupHoursInt,
      rectTablesRequested: rectTablesInt,
      roundTablesRequested: roundTablesInt,
      chairsRequested: chairsInt,
      setupNotes: typeof setupNotes === "string" ? setupNotes : null,
      status: normalizedStatus,
      notes: typeof notes === "string" ? notes : null,
      addOns: addOnUpdate,
    },
    include: {
      addOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    booking: {
      ...updatedBooking,
      eventDate: updatedBooking.eventDate.toISOString(),
      startTime: updatedBooking.startTime.toISOString(),
      endTime: updatedBooking.endTime.toISOString(),
      createdAt: updatedBooking.createdAt.toISOString(),
      updatedAt: updatedBooking.updatedAt.toISOString(),
      contractAcceptedAt: updatedBooking.contractAcceptedAt
        ? updatedBooking.contractAcceptedAt.toISOString()
        : null,
    },
  });
}

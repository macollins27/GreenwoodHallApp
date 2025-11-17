import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type DayStatus = "available" | "booked" | "blocked";

function parseDateOnly(dateStr: string | null): Date | null {
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

function bounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function formatTime(date: Date) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const parsedDate = parseDateOnly(dateParam);

  if (!parsedDate) {
    return NextResponse.json(
      { error: "A valid date (YYYY-MM-DD) is required." },
      { status: 400 }
    );
  }

  const { start, end } = bounds(parsedDate);

  const [blockedDate, bookings] = await Promise.all([
    prisma.blockedDate.findFirst({
      where: {
        date: {
          gte: start,
          lt: end,
        },
      },
    }),
    prisma.booking.findMany({
      where: {
        eventDate: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  let status: DayStatus = "available";
  if (blockedDate) {
    status = "blocked";
  } else if (
    bookings.some(
      (booking) =>
        booking.bookingType === "EVENT" && booking.status !== "CANCELLED"
    )
  ) {
    status = "booked";
  }

  return NextResponse.json({
    date: dateParam ?? parsedDate.toISOString().slice(0, 10),
    status,
    blockedReason: blockedDate?.reason ?? null,
    bookings: bookings.map((booking) => ({
      id: booking.id,
      bookingType: booking.bookingType,
      status: booking.status,
      startTime: formatTime(booking.startTime),
      endTime: formatTime(booking.endTime),
      eventType: booking.eventType,
      guestCount: booking.guestCount,
      totalCents: booking.totalCents,
    })),
  });
}


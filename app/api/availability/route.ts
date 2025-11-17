import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type AvailabilityStatus = "available" | "booked" | "blocked";

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

function getBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const date = parseDateOnly(dateParam);

  if (!date) {
    return NextResponse.json(
      { error: "A valid date query parameter is required (YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  const { start, end } = getBounds(date);
  let status: AvailabilityStatus = "available";

  const blocked = await prisma.blockedDate.findFirst({
    where: {
      date: {
        gte: start,
        lt: end,
      },
    },
  });

  if (blocked) {
    status = "blocked";
  } else {
    const existingEvent = await prisma.booking.findFirst({
      where: {
        bookingType: "EVENT",
        eventDate: {
          gte: start,
          lt: end,
        },
        NOT: { status: "CANCELLED" },
      },
    });
    if (existingEvent) {
      status = "booked";
    }
  }

  return NextResponse.json({
    date: dateParam ?? date.toISOString().slice(0, 10),
    status,
  });
}


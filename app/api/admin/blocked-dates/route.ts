import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";

function parseDateOnly(dateStr?: string | null): Date | null {
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

export async function GET() {
  const blockedDates = await prisma.blockedDate.findMany({
    orderBy: { date: "asc" },
  });
  return NextResponse.json({
    blockedDates: blockedDates.map((blocked) => ({
      id: blocked.id,
      date: blocked.date.toISOString(),
      reason: blocked.reason,
    })),
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!cookieStore.get(ADMIN_COOKIE_NAME)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { date, reason } = await request.json().catch(() => ({
    date: undefined,
    reason: undefined,
  }));

  const parsedDate = parseDateOnly(date);
  if (!parsedDate) {
    return NextResponse.json(
      { error: "A valid date (YYYY-MM-DD) is required." },
      { status: 400 }
    );
  }

  try {
    const blocked = await prisma.blockedDate.upsert({
      where: { date: parsedDate },
      update: { reason: reason?.trim() || null },
      create: { date: parsedDate, reason: reason?.trim() || null },
    });

    return NextResponse.json({
      blockedDate: {
        id: blocked.id,
        date: blocked.date.toISOString(),
        reason: blocked.reason,
      },
    });
  } catch (error) {
    console.error("Failed to create blocked date", error);
    return NextResponse.json(
      { error: "Unable to save blocked date." },
      { status: 500 }
    );
  }
}


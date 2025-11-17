import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";

const ALLOWED_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"] as const;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  if (!cookieStore.get(ADMIN_COOKIE_NAME)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const status = body?.status as (typeof ALLOWED_STATUSES)[number] | undefined;

  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Invalid status value." },
      { status: 400 }
    );
  }

  try {
    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
    });
    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error("Failed to update status", error);
    return NextResponse.json(
      { error: "Unable to update booking." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  return PATCH(request, context);
}


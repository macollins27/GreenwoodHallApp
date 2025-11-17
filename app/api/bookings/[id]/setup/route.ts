import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type SetupRequestBody = {
  rectTablesRequested?: number | null;
  roundTablesRequested?: number | null;
  chairsRequested?: number | null;
  setupNotes?: string | null;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  let body: SetupRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const {
    rectTablesRequested,
    roundTablesRequested,
    chairsRequested,
    setupNotes,
  } = body;

  // Validate numbers are non-negative integers or null
  if (
    rectTablesRequested !== null &&
    rectTablesRequested !== undefined &&
    (!Number.isInteger(rectTablesRequested) || rectTablesRequested < 0)
  ) {
    return NextResponse.json(
      { error: "Rectangular tables requested must be a non-negative integer." },
      { status: 400 }
    );
  }

  if (
    roundTablesRequested !== null &&
    roundTablesRequested !== undefined &&
    (!Number.isInteger(roundTablesRequested) || roundTablesRequested < 0)
  ) {
    return NextResponse.json(
      { error: "Round tables requested must be a non-negative integer." },
      { status: 400 }
    );
  }

  if (
    chairsRequested !== null &&
    chairsRequested !== undefined &&
    (!Number.isInteger(chairsRequested) || chairsRequested < 0)
  ) {
    return NextResponse.json(
      { error: "Chairs requested must be a non-negative integer." },
      { status: 400 }
    );
  }

  try {
    const booking = await prisma.booking.update({
      where: { id },
      data: {
        rectTablesRequested:
          rectTablesRequested === null || rectTablesRequested === undefined
            ? null
            : rectTablesRequested,
        roundTablesRequested:
          roundTablesRequested === null || roundTablesRequested === undefined
            ? null
            : roundTablesRequested,
        chairsRequested:
          chairsRequested === null || chairsRequested === undefined
            ? null
            : chairsRequested,
        setupNotes: setupNotes?.trim() || null,
      },
      select: {
        rectTablesRequested: true,
        roundTablesRequested: true,
        chairsRequested: true,
        setupNotes: true,
      },
    });

    return NextResponse.json(booking, { status: 200 });
  } catch (error) {
    console.error("Failed to update booking setup:", error);
    return NextResponse.json(
      { error: "Booking not found or unable to update." },
      { status: 404 }
    );
  }
}


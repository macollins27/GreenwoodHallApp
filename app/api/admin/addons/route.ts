import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - List all add-ons
export async function GET() {
  try {
    const addOns = await prisma.addOn.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(addOns);
  } catch (error) {
    console.error("Error fetching add-ons:", error);
    return NextResponse.json(
      { error: "Failed to fetch add-ons" },
      { status: 500 }
    );
  }
}

// POST - Create new add-on
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, priceCents, active, sortOrder } = body;

    // Validation
    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (typeof priceCents !== "number" || priceCents < 0) {
      return NextResponse.json(
        { error: "Price must be a non-negative number" },
        { status: 400 }
      );
    }

    const addOn = await prisma.addOn.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        priceCents,
        active: active !== undefined ? active : true,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(addOn, { status: 201 });
  } catch (error) {
    console.error("Error creating add-on:", error);
    return NextResponse.json(
      { error: "Failed to create add-on" },
      { status: 500 }
    );
  }
}

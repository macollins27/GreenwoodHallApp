import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH - Update an add-on
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const { name, description, priceCents, active, sortOrder } = body;

    // Validation
    if (name !== undefined && (!name || name.trim() === "")) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    if (priceCents !== undefined && (typeof priceCents !== "number" || priceCents < 0)) {
      return NextResponse.json(
        { error: "Price must be a non-negative number" },
        { status: 400 }
      );
    }

    const addOn = await prisma.addOn.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(priceCents !== undefined && { priceCents }),
        ...(active !== undefined && { active }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(addOn);
  } catch (error) {
    console.error("Error updating add-on:", error);
    return NextResponse.json(
      { error: "Failed to update add-on" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an add-on
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // Check if add-on is used in any bookings
    const usageCount = await prisma.bookingAddOn.count({
      where: { addOnId: id },
    });

    if (usageCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete add-on: used in ${usageCount} booking(s). Deactivate it instead.` },
        { status: 400 }
      );
    }

    await prisma.addOn.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting add-on:", error);
    return NextResponse.json(
      { error: "Failed to delete add-on" },
      { status: 500 }
    );
  }
}

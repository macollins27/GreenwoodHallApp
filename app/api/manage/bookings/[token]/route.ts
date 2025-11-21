import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  loadBookingForManagement,
  ManagementTokenExpiredError,
  serializeManagedBooking,
} from "@/lib/manageBooking";
import {
  sendCustomerEventUpdated,
  sendCustomerShowingUpdated,
  type BookingWithExtras,
} from "@/lib/email";
import { Prisma } from "@prisma/client";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const booking = await loadBookingForManagement(token);

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeManagedBooking(booking));
  } catch (error) {
    if (error instanceof ManagementTokenExpiredError) {
      return NextResponse.json(
        { error: "This management link has expired." },
        { status: 410 }
      );
    }

    console.error("Manage booking GET error:", error);
    return NextResponse.json(
      { error: "Unable to load booking." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const booking = await loadBookingForManagement(token);

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "You can’t edit a cancelled booking." },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      contactName?: unknown;
      contactEmail?: unknown;
      contactPhone?: unknown;
      rectTablesRequested?: unknown;
      roundTablesRequested?: unknown;
      chairsRequested?: unknown;
      setupNotes?: unknown;
      notes?: unknown;
      addOns?: { addOnId?: unknown; quantity?: unknown }[];
    };
    const {
      contactName,
      contactEmail,
      contactPhone,
      rectTablesRequested,
      roundTablesRequested,
      chairsRequested,
      setupNotes,
      notes,
      addOns,
    } = body ?? {};

    const updateData: Prisma.BookingUpdateInput = {};

    if (typeof contactName === "string") updateData.contactName = contactName;
    if (typeof contactEmail === "string") updateData.contactEmail = contactEmail;
    if (typeof contactPhone === "string" || contactPhone === null)
      updateData.contactPhone = contactPhone ?? null;
    if (rectTablesRequested !== undefined)
      updateData.rectTablesRequested =
        rectTablesRequested === null ? null : Number(rectTablesRequested);
    if (roundTablesRequested !== undefined)
      updateData.roundTablesRequested =
        roundTablesRequested === null ? null : Number(roundTablesRequested);
    if (chairsRequested !== undefined)
      updateData.chairsRequested =
        chairsRequested === null ? null : Number(chairsRequested);
    if (setupNotes !== undefined)
      updateData.setupNotes =
        typeof setupNotes === "string" ? setupNotes : null;
    if (notes !== undefined)
      updateData.notes = typeof notes === "string" ? notes : null;

    const addOnsProvided =
      booking.bookingType === "EVENT" && Array.isArray(addOns);

    if (addOnsProvided) {
      const sanitized = addOns
        .map((addon) => ({
          addOnId: typeof addon?.addOnId === "string" ? addon.addOnId : null,
          quantity:
            typeof addon?.quantity === "number"
              ? Math.trunc(addon.quantity)
              : Number(addon?.quantity ?? 0),
        }))
        .filter(
          (addon) =>
            addon.addOnId &&
            Number.isFinite(addon.quantity) &&
            addon.quantity > 0
        );

      if (sanitized.length > 0) {
        const catalog = await prisma.addOn.findMany({
          where: {
            id: {
              in: sanitized
                .map((addon) => addon.addOnId)
                .filter(Boolean) as string[],
            },
          },
        });

        const createAddOns: {
          addOnId: string;
          quantity: number;
          priceAtBooking: number;
        }[] = [];

        sanitized.forEach((addon) => {
          const match = catalog.find((item) => item.id === addon.addOnId);
          if (!match || !addon.addOnId) return;
          createAddOns.push({
            addOnId: addon.addOnId,
            quantity: addon.quantity,
            priceAtBooking: match.priceCents,
          });
        });

        updateData.addOns = {
          deleteMany: {},
          create: createAddOns,
        };
      } else {
        updateData.addOns = {
          deleteMany: {},
          create: [],
        };
      }
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: updateData,
      include: {
        addOns: {
          include: {
            addOn: true,
          },
        },
      },
    });

    if (
      (Object.keys(updateData).length > 0 || addOnsProvided) &&
      booking.bookingType === "EVENT"
    ) {
      sendCustomerEventUpdated(updated as BookingWithExtras).catch((err) => {
        console.error("Failed to send event updated email:", err);
      });
    } else if (
      (Object.keys(updateData).length > 0 || addOnsProvided) &&
      booking.bookingType === "SHOWING"
    ) {
      sendCustomerShowingUpdated(updated as BookingWithExtras).catch((err) => {
        console.error("Failed to send showing updated email:", err);
      });
    }

    return NextResponse.json(serializeManagedBooking(updated));
  } catch (error) {
    if (error instanceof ManagementTokenExpiredError) {
      return NextResponse.json(
        { error: "This management link has expired." },
        { status: 410 }
      );
    }

    console.error("Manage booking PATCH error:", error);
    return NextResponse.json(
      { error: "Unable to update booking." },
      { status: 500 }
    );
  }
}

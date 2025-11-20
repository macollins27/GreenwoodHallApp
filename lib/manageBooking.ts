import prisma from "@/lib/prisma";

export class ManagementTokenExpiredError extends Error {
  constructor() {
    super("Management token expired");
  }
}

export async function loadBookingForManagement(token: string) {
  if (!token || token.trim() === "") return null;

  const booking = await prisma.booking.findFirst({
    where: { managementToken: token } as any,
    include: {
      addOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  if (!booking) return null;

  const expiresAt = (
    booking as { managementTokenExpiresAt?: Date | null }
  ).managementTokenExpiresAt;

  if (expiresAt && expiresAt.getTime() < Date.now()) {
    throw new ManagementTokenExpiredError();
  }

  return booking;
}

export function serializeManagedBooking(booking: any) {
  return {
    bookingId: booking.id,
    bookingType: booking.bookingType,
    status: booking.status,
    eventDate: booking.eventDate?.toISOString?.() ?? null,
    startTime: booking.startTime?.toISOString?.() ?? null,
    endTime: booking.endTime?.toISOString?.() ?? null,
    contactName: booking.contactName,
    contactEmail: booking.contactEmail,
    contactPhone: booking.contactPhone,
    totalCents: booking.totalCents,
    amountPaidCents: booking.amountPaidCents,
    rectTablesRequested: booking.rectTablesRequested,
    roundTablesRequested: booking.roundTablesRequested,
    chairsRequested: booking.chairsRequested,
    setupNotes: booking.setupNotes,
    notes: booking.notes,
    addons:
      booking.addOns?.map((addon: any) => ({
        id: addon.id,
        addOnId: addon.addOnId,
        quantity: addon.quantity,
        priceAtBooking: addon.priceAtBooking,
        name: addon.addOn?.name ?? "",
        description: addon.addOn?.description ?? null,
      })) ?? [],
  };
}

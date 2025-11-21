import crypto from "crypto";
import type { Booking } from "@prisma/client";
import prisma from "@/lib/prisma";

export function generateManagementToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function ensureManagementTokenForBooking(
  booking: Booking
): Promise<Booking> {
  const existingToken = booking.managementToken;

  if (existingToken) {
    return booking;
  }

  const token = generateManagementToken();

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      managementToken: token,
      managementTokenExpiresAt: null,
    },
  });

  return updated;
}

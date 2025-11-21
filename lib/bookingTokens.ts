import crypto from "crypto";
import type { Booking } from "@prisma/client";
import prisma from "@/lib/prisma";

type BookingWithToken = Booking & { managementToken?: string | null };

export function generateManagementToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function ensureManagementTokenForBooking(
  booking: BookingWithToken
): Promise<BookingWithToken> {
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
    select: {
      id: true,
      bookingType: true,
      eventDate: true,
      startTime: true,
      endTime: true,
      dayType: true,
      hourlyRateCents: true,
      eventHours: true,
      extraSetupHours: true,
      baseAmountCents: true,
      extraSetupCents: true,
      depositCents: true,
      totalCents: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      eventType: true,
      guestCount: true,
      notes: true,
      status: true,
      contractAccepted: true,
      contractAcceptedAt: true,
      contractSignerName: true,
      contractVersion: true,
      contractText: true,
      stripeCheckoutSessionId: true,
      stripePaymentStatus: true,
      amountPaidCents: true,
      paymentMethod: true,
      adminNotes: true,
      rectTablesRequested: true,
      roundTablesRequested: true,
      chairsRequested: true,
      setupNotes: true,
      managementToken: true,
      managementTokenExpiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updated;
}

import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import BookingWizardClient from "@/components/BookingWizardClient";
import { Booking } from "@prisma/client";

function serializeBooking(booking: Booking) {
  return {
    ...booking,
    eventDate: booking.eventDate.toISOString(),
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    contractAcceptedAt: booking.contractAcceptedAt
      ? booking.contractAcceptedAt.toISOString()
      : null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

type PageProps = {
  params: Promise<{
    id?: string;
    bookingId?: string;
  }>;
};

export default async function BookingWizardPage({ params }: PageProps) {
  const resolvedParams = await params;
  
  const bookingId = resolvedParams.id ?? resolvedParams.bookingId;

  if (!bookingId || typeof bookingId !== "string" || bookingId.trim() === "") {
    notFound();
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    notFound();
  }

  // CRITICAL: Prevent showings from entering event wizard/payment flow
  if (booking.bookingType === "SHOWING") {
    // Showings should never access the wizard - redirect to homepage
    redirect("/");
  }

  const serializedBooking = serializeBooking(booking);

  return (
    <main className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8 py-10">
      <BookingWizardClient booking={serializedBooking} />
    </main>
  );
}


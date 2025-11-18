import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import EventDetailClient from "@/components/admin/EventDetailClient";
import ShowingDetailClient from "@/components/admin/ShowingDetailClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BookingDetailPage({ params }: PageProps) {
  const { id: bookingId } = await params;

  if (!bookingId || bookingId.trim() === "") {
    notFound();
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    notFound();
  }

  const serializedBooking = {
    ...booking,
    eventDate: booking.eventDate.toISOString(),
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    contractAcceptedAt: booking.contractAcceptedAt
      ? booking.contractAcceptedAt.toISOString()
      : null,
    paymentMethod: booking.paymentMethod,
    adminNotes: booking.adminNotes,
  };

  // Route to completely different detail views based on booking type
  if (booking.bookingType === "SHOWING") {
    return <ShowingDetailClient booking={serializedBooking} />;
  }

  // Default to event detail for EVENT bookings
  return <EventDetailClient booking={serializedBooking} />;
}


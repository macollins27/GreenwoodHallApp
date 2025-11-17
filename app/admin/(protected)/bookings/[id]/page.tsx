import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import BookingDetailClient from "@/components/admin/BookingDetailClient";

type PageProps = {
  params: {
    id?: string;
    bookingId?: string;
  };
};

export default async function BookingDetailPage({ params }: PageProps) {
  const bookingId = params.id ?? params.bookingId;

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
  };

  return <BookingDetailClient booking={serializedBooking} />;
}


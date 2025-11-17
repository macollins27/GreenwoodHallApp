import prisma from "@/lib/prisma";
import DashboardClient from "@/components/admin/DashboardClient";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export default async function AdminDashboardPage() {
  const today = startOfToday();

  const [bookings, blockedDates] = await Promise.all([
    prisma.booking.findMany({
      where: {
        eventDate: {
          gte: today,
        },
      },
      orderBy: {
        eventDate: "asc",
      },
      take: 60,
    }),
    prisma.blockedDate.findMany({
      orderBy: {
        date: "asc",
      },
    }),
  ]);

  const serializedBookings = bookings.map((booking) => ({
    id: booking.id,
    bookingType: booking.bookingType,
    status: booking.status,
    contactName: booking.contactName,
    eventType: booking.eventType,
    eventDate: booking.eventDate.toISOString(),
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    totalCents: booking.totalCents,
  }));

  const serializedBlockedDates = blockedDates.map((blocked) => ({
    id: blocked.id,
    date: blocked.date.toISOString(),
    reason: blocked.reason ?? "",
  }));

  return (
    <DashboardClient
      initialBookings={serializedBookings}
      initialBlockedDates={serializedBlockedDates}
    />
  );
}


import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import AdminEventEditForm from "@/components/admin/AdminEventEditForm";
import AdminShowingEditForm from "@/components/admin/AdminShowingEditForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminBookingEditPage({ params }: PageProps) {
  const { id } = await params;

  if (!id || id.trim() === "") {
    notFound();
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      addOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  if (!booking) {
    notFound();
  }

  if (booking.bookingType === "EVENT") {
    const addOns = await prisma.addOn.findMany({
      where: { active: true },
      orderBy: [
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    });

    const serializedBooking = {
      id: booking.id,
      eventDate: booking.eventDate.toISOString(),
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      status: booking.status,
      contactName: booking.contactName,
      contactEmail: booking.contactEmail,
      contactPhone: booking.contactPhone,
      eventType: booking.eventType,
      guestCount: booking.guestCount,
      extraSetupHours: booking.extraSetupHours,
      rectTablesRequested: booking.rectTablesRequested,
      roundTablesRequested: booking.roundTablesRequested,
      chairsRequested: booking.chairsRequested,
      setupNotes: booking.setupNotes,
      notes: booking.notes,
      addOns: booking.addOns.map((addon) => ({
        id: addon.id,
        addOnId: addon.addOnId,
        quantity: addon.quantity,
        addOn: {
          id: addon.addOn.id,
          name: addon.addOn.name,
          priceCents: addon.addOn.priceCents,
        },
      })),
    };

    return (
      <AdminEventEditForm
        booking={serializedBooking}
        addOns={addOns.map((addon) => ({
          id: addon.id,
          name: addon.name,
          priceCents: addon.priceCents,
          description: addon.description,
        }))}
      />
    );
  }

  const serializedShowing = {
    id: booking.id,
    eventDate: booking.eventDate.toISOString(),
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    status: booking.status,
    contactName: booking.contactName,
    contactEmail: booking.contactEmail,
    contactPhone: booking.contactPhone,
    notes: booking.notes,
  };

  return <AdminShowingEditForm booking={serializedShowing} />;
}

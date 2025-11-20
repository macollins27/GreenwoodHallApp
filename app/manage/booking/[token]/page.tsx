import prisma from "@/lib/prisma";
import BookingManageClient from "@/components/manage/BookingManageClient";
import {
  loadBookingForManagement,
  ManagementTokenExpiredError,
  serializeManagedBooking,
} from "@/lib/manageBooking";

type PageProps = {
  params: { token: string };
};

export default async function ManageBookingPage({ params }: PageProps) {
  const { token } = params;

  try {
    const booking = await loadBookingForManagement(token);

    if (!booking) {
      return (
        <main className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold text-textMain">
            Booking link not found
          </h1>
          <p className="mt-4 text-slate-600">
            This booking management link is invalid. Please contact us if you
            need assistance.
          </p>
        </main>
      );
    }

    const [availableAddOns, serializedBooking] = await Promise.all([
      prisma.addOn.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      Promise.resolve(serializeManagedBooking(booking)),
    ]);

    return (
      <BookingManageClient
        token={token}
        initialBooking={serializedBooking}
        availableAddOns={availableAddOns.map((addon) => ({
          id: addon.id,
          name: addon.name,
          description: addon.description,
          priceCents: addon.priceCents,
        }))}
      />
    );
  } catch (error) {
    if (error instanceof ManagementTokenExpiredError) {
      return (
        <main className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold text-textMain">
            Management link expired
          </h1>
          <p className="mt-4 text-slate-600">
            This booking management link has expired. Please contact us to
            request a new link or update your booking.
          </p>
        </main>
      );
    }

    console.error("Manage booking page error:", error);
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-textMain">
          Something went wrong
        </h1>
        <p className="mt-4 text-slate-600">
          We couldn’t load your booking. Please refresh the page or contact us
          for help.
        </p>
      </main>
    );
  }
}

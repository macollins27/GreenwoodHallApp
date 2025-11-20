"use client";

import { useMemo, useState, useEffect } from "react";
import { formatDateForDisplay, formatTimeForDisplay } from "@/lib/datetime";

type ManagedAddOn = {
  id: string;
  addOnId: string;
  quantity: number;
  priceAtBooking: number;
  name: string;
  description: string | null;
};

type ManagedBooking = {
  bookingId: string;
  bookingType: "EVENT" | "SHOWING";
  status: string;
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  totalCents: number;
  amountPaidCents: number;
  rectTablesRequested: number | null;
  roundTablesRequested: number | null;
  chairsRequested: number | null;
  setupNotes: string | null;
  notes: string | null;
  addons: ManagedAddOn[];
};

type AddOnOption = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
};

type BookingManageClientProps = {
  token: string;
  initialBooking: ManagedBooking;
  availableAddOns: AddOnOption[];
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

export default function BookingManageClient({
  token,
  initialBooking,
  availableAddOns,
}: BookingManageClientProps) {
  const [booking, setBooking] = useState<ManagedBooking>(initialBooking);
  const [contactForm, setContactForm] = useState({
    contactName: initialBooking.contactName,
    contactEmail: initialBooking.contactEmail,
    contactPhone: initialBooking.contactPhone ?? "",
  });
  const toInputValue = (value: number | null) =>
    value === null || value === undefined ? "" : String(value);

  const [setupForm, setSetupForm] = useState({
    rectTablesRequested: toInputValue(initialBooking.rectTablesRequested),
    roundTablesRequested: toInputValue(initialBooking.roundTablesRequested),
    chairsRequested: toInputValue(initialBooking.chairsRequested),
    setupNotes: initialBooking.setupNotes ?? "",
    notes: initialBooking.notes ?? "",
  });
  const [addOnQuantities, setAddOnQuantities] = useState<
    Record<string, number>
  >(() => {
    const map: Record<string, number> = {};
    initialBooking.addons.forEach((addon) => {
      map[addon.addOnId] = addon.quantity;
    });
    return map;
  });

  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState(false);

  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState(false);

  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  useEffect(() => {
    setContactForm({
      contactName: booking.contactName,
      contactEmail: booking.contactEmail,
      contactPhone: booking.contactPhone ?? "",
    });
    setSetupForm({
      rectTablesRequested: toInputValue(booking.rectTablesRequested),
      roundTablesRequested: toInputValue(booking.roundTablesRequested),
      chairsRequested: toInputValue(booking.chairsRequested),
      setupNotes: booking.setupNotes ?? "",
      notes: booking.notes ?? "",
    });
    const map: Record<string, number> = {};
    booking.addons.forEach((addon) => {
      map[addon.addOnId] = addon.quantity;
    });
    setAddOnQuantities(map);
  }, [booking]);

  const remainingCents = useMemo(() => {
    return Math.max(booking.totalCents - booking.amountPaidCents, 0);
  }, [booking.totalCents, booking.amountPaidCents]);

  const isCancelled = booking.status === "CANCELLED";

  async function handleContactSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContactError(null);
    setContactSuccess(false);
    setContactSaving(true);

    try {
      const response = await fetch(`/api/manage/bookings/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to update contact details.");
      }

      const data = await response.json();
      setBooking(data);
      setContactSuccess(true);
    } catch (error) {
      setContactError(
        error instanceof Error ? error.message : "Unable to save changes."
      );
    } finally {
      setContactSaving(false);
    }
  }

  async function handleSetupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSetupError(null);
    setSetupSuccess(false);
    setSetupSaving(true);

    try {
      const payload: any = {
        rectTablesRequested:
          setupForm.rectTablesRequested === ""
            ? null
            : Number(setupForm.rectTablesRequested),
        roundTablesRequested:
          setupForm.roundTablesRequested === ""
            ? null
            : Number(setupForm.roundTablesRequested),
        chairsRequested:
          setupForm.chairsRequested === ""
            ? null
            : Number(setupForm.chairsRequested),
        setupNotes: setupForm.setupNotes,
        notes: setupForm.notes,
      };

      if (booking.bookingType === "EVENT") {
        payload.addOns = Object.entries(addOnQuantities)
          .filter(([, quantity]) => Number(quantity) > 0)
          .map(([addOnId, quantity]) => ({
            addOnId,
            quantity: Number(quantity),
          }));
      }

      const response = await fetch(`/api/manage/bookings/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to update setup details.");
      }

      const data = await response.json();
      setBooking(data);
      setSetupSuccess(true);
    } catch (error) {
      setSetupError(
        error instanceof Error ? error.message : "Unable to save changes."
      );
    } finally {
      setSetupSaving(false);
    }
  }

  async function handlePayRemaining() {
    setPaymentError(null);
    try {
      const response = await fetch(
        `/api/manage/bookings/${token}/create-checkout-session`,
        { method: "POST" }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Unable to start payment.");
      }

      const data = await response.json();
      if (!data.checkoutUrl) {
        throw new Error("Payment link not available.");
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      setPaymentError(
        error instanceof Error ? error.message : "Payment failed to start."
      );
    }
  }

  async function handleCancel() {
    setCancelError(null);
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/manage/bookings/${token}/cancel`,
        { method: "POST" }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Unable to cancel booking.");
      }

      setBooking((prev) => ({ ...prev, status: "CANCELLED" }));
      setCancelSuccess(true);
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : "Cancellation failed."
      );
    }
  }

  function handleAddOnQuantityChange(addOnId: string, value: string) {
    const quantity = Number(value);
    setAddOnQuantities((prev) => ({
      ...prev,
      [addOnId]: Number.isNaN(quantity) || quantity < 0 ? 0 : quantity,
    }));
  }

  const dateLabel = booking.eventDate
    ? formatDateForDisplay(booking.eventDate)
    : "Date pending";
  const timeLabel =
    booking.startTime && booking.endTime
      ? `${formatTimeForDisplay(booking.startTime)} – ${formatTimeForDisplay(
          booking.endTime
        )}`
      : "Time pending";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <section className="rounded-3xl bg-white p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          Manage your booking
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-textMain">
          {booking.bookingType === "EVENT" ? "Event Booking" : "Showing"}
        </h1>
        <p className="mt-2 text-slate-600">
          {dateLabel} • {timeLabel}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Status:{" "}
          <span className="font-semibold text-textMain">
            {booking.status}
          </span>
        </p>

        {cancelSuccess && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            This booking has been cancelled. Please contact us if you need to
            rebook.
          </div>
        )}
      </section>

      <section className="mt-8 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold text-textMain">
          Your contact details
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Update your contact information so we can reach you about this
          booking.
        </p>
        {contactError && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {contactError}
          </p>
        )}
        {contactSuccess && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            Contact details updated.
          </p>
        )}
        <form
          onSubmit={handleContactSubmit}
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">
              Name
            </label>
            <input
              type="text"
              value={contactForm.contactName}
              onChange={(e) =>
                setContactForm((prev) => ({
                  ...prev,
                  contactName: e.target.value,
                }))
              }
              disabled={isCancelled || contactSaving}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={contactForm.contactEmail}
              onChange={(e) =>
                setContactForm((prev) => ({
                  ...prev,
                  contactEmail: e.target.value,
                }))
              }
              disabled={isCancelled || contactSaving}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">
              Phone
            </label>
            <input
              type="tel"
              value={contactForm.contactPhone}
              onChange={(e) =>
                setContactForm((prev) => ({
                  ...prev,
                  contactPhone: e.target.value,
                }))
              }
              disabled={isCancelled || contactSaving}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isCancelled || contactSaving}
              className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {contactSaving ? "Saving..." : "Save contact details"}
            </button>
          </div>
        </form>
      </section>

      {booking.bookingType === "EVENT" && (
        <section className="mt-8 space-y-4 rounded-3xl bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold text-textMain">
            Setup & Add-ons
          </h2>
          {setupError && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {setupError}
            </p>
          )}
          {setupSuccess && (
            <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
              Setup preferences updated.
            </p>
          )}
          <form onSubmit={handleSetupSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  Rectangular tables
                </label>
                <input
                  type="number"
                  min={0}
                  value={setupForm.rectTablesRequested}
                  onChange={(e) =>
                    setSetupForm((prev) => ({
                      ...prev,
                      rectTablesRequested: e.target.value,
                    }))
                  }
                  disabled={isCancelled || setupSaving}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  Round tables
                </label>
                <input
                  type="number"
                  min={0}
                  value={setupForm.roundTablesRequested}
                  onChange={(e) =>
                    setSetupForm((prev) => ({
                      ...prev,
                      roundTablesRequested: e.target.value,
                    }))
                  }
                  disabled={isCancelled || setupSaving}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  Chairs
                </label>
                <input
                  type="number"
                  min={0}
                  value={setupForm.chairsRequested}
                  onChange={(e) =>
                    setSetupForm((prev) => ({
                      ...prev,
                      chairsRequested: e.target.value,
                    }))
                  }
                  disabled={isCancelled || setupSaving}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  Setup notes
                </label>
                <textarea
                  rows={3}
                  value={setupForm.setupNotes}
                  onChange={(e) =>
                    setSetupForm((prev) => ({
                      ...prev,
                      setupNotes: e.target.value,
                    }))
                  }
                  disabled={isCancelled || setupSaving}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  Notes to our team
                </label>
                <textarea
                  rows={3}
                  value={setupForm.notes}
                  onChange={(e) =>
                    setSetupForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  disabled={isCancelled || setupSaving}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-textMain">
                Add-ons
              </h3>
              {availableAddOns.length === 0 && (
                <p className="text-sm text-slate-500">
                  No add-ons are currently available.
                </p>
              )}
              {availableAddOns.map((addon) => (
                <div
                  key={addon.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {addon.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      {formatCurrency(addon.priceCents)}
                      {addon.description ? ` • ${addon.description}` : ""}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={addOnQuantities[addon.id] ?? 0}
                    onChange={(e) =>
                      handleAddOnQuantityChange(addon.id, e.target.value)
                    }
                    disabled={isCancelled || setupSaving}
                    className="w-24 rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isCancelled || setupSaving}
              className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {setupSaving ? "Saving..." : "Save setup preferences"}
            </button>
          </form>
        </section>
      )}

      {booking.bookingType === "EVENT" && (
        <section className="mt-8 space-y-4 rounded-3xl bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold text-textMain">Payments</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase text-slate-500">Total</p>
              <p className="text-lg font-semibold text-textMain">
                {formatCurrency(booking.totalCents)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase text-slate-500">Paid</p>
              <p className="text-lg font-semibold text-textMain">
                {formatCurrency(booking.amountPaidCents)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase text-slate-500">Remaining</p>
              <p className="text-lg font-semibold text-textMain">
                {formatCurrency(remainingCents)}
              </p>
            </div>
          </div>
          {paymentError && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {paymentError}
            </p>
          )}
          {remainingCents > 0 ? (
            <button
              type="button"
              onClick={handlePayRemaining}
              disabled={isCancelled}
              className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              Pay remaining balance
            </button>
          ) : (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-700">
              Paid in full
            </span>
          )}
        </section>
      )}

      <section className="mt-8 space-y-3 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold text-textMain">
          Cancel booking
        </h2>
        <p className="text-sm text-slate-600">
          Need to cancel? Click below. If you cancel within the required notice
          period, we’ll follow up about any applicable refunds.
        </p>
        {cancelError && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {cancelError}
          </p>
        )}
        <button
          type="button"
          onClick={handleCancel}
          disabled={isCancelled}
          className="rounded-full border border-red-200 px-6 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          {isCancelled ? "Booking cancelled" : "Cancel this booking"}
        </button>
      </section>
    </main>
  );
}

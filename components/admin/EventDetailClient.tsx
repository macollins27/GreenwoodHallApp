"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateForDisplay, formatTimeForDisplay } from "@/lib/datetime";

type EventBooking = {
  id: string;
  bookingType: string;
  status: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  eventType: string;
  guestCount: number | null;
  notes: string | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  hourlyRateCents: number;
  eventHours: number;
  extraSetupHours: number;
  extraSetupCents: number;
  depositCents: number;
  totalCents: number;
  baseAmountCents: number;
  contractAccepted: boolean;
  contractAcceptedAt: string | null;
  contractSignerName: string | null;
  contractVersion: string | null;
  contractText: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentStatus: string | null;
  amountPaidCents: number;
  paymentMethod: string | null;
  adminNotes: string | null;
  rectTablesRequested: number | null;
  roundTablesRequested: number | null;
  chairsRequested: number | null;
  setupNotes: string | null;
  addOns?: Array<{
    id: string;
    quantity: number;
    priceAtBooking: number;
    addOn: {
      id: string;
      name: string;
      description: string | null;
    };
  }>;
  createdAt: string;
  updatedAt: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

export default function EventDetailClient({
  booking,
}: {
  booking: EventBooking;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const eventDateSource = booking.eventDate ?? booking.startTime ?? null;
  const eventDateLabel = eventDateSource
    ? formatDateForDisplay(eventDateSource)
    : "Date not set";
  const startTimeLabel = booking.startTime
    ? formatTimeForDisplay(booking.startTime)
    : null;
  const endTimeLabel = booking.endTime
    ? formatTimeForDisplay(booking.endTime)
    : null;
  const eventTimeLabel =
    startTimeLabel && endTimeLabel
      ? `${startTimeLabel} – ${endTimeLabel}`
      : "Time not set";

  async function updateStatus(status: "PENDING" | "CONFIRMED" | "CANCELLED") {
    setIsUpdating(true);
    setMessage(null);
    const response = await fetch(`/api/admin/bookings/${booking.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setMessage(payload?.error ?? "Unable to update status.");
    } else {
      setMessage("Status updated.");
      router.refresh();
    }
    setIsUpdating(false);
  }

  const isPaidInFull =
    booking.stripePaymentStatus === "paid" &&
    booking.amountPaidCents >= booking.totalCents;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/admin")}
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← Back to dashboard
      </button>
      <div className="rounded-3xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Event Booking
            </p>
            <h1 className="text-2xl font-semibold text-textMain">
              {booking.eventType} on {eventDateLabel}
            </h1>
            <p className="text-sm text-slate-600">
              {eventTimeLabel} ({booking.eventHours} hours)
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {booking.status}
              </span>
              {isPaidInFull && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Paid in full
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {(["PENDING", "CONFIRMED", "CANCELLED"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => updateStatus(status)}
                  disabled={isUpdating || booking.status === status}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                    booking.status === status
                      ? "bg-primary text-white"
                      : "border border-primary text-primary hover:bg-primary/5"
                  } disabled:opacity-60`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
        {message && <p className="mt-4 text-sm text-primary">{message}</p>}

        {/* Contact Information */}
        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Contact Information
          </h2>
          <div className="mt-3 space-y-2">
            <p className="text-lg font-semibold text-textMain">
              {booking.contactName}
            </p>
            <p className="text-sm text-slate-600">
              <a href={`mailto:${booking.contactEmail}`} className="text-primary hover:underline">
                {booking.contactEmail}
              </a>
            </p>
            {booking.contactPhone && (
              <p className="text-sm text-slate-600">
                <a href={`tel:${booking.contactPhone}`} className="text-primary hover:underline">
                  {booking.contactPhone}
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Event Details */}
        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Event Details
          </h2>
          <dl className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <dt className="font-semibold">Event Type</dt>
              <dd>{booking.eventType}</dd>
            </div>
            {booking.guestCount && (
              <div>
                <dt className="font-semibold">Guest Count</dt>
                <dd>{booking.guestCount}</dd>
              </div>
            )}
            <div>
              <dt className="font-semibold">Event Date</dt>
              <dd>{eventDateLabel}</dd>
            </div>
            <div>
              <dt className="font-semibold">Event Time</dt>
              <dd>{eventTimeLabel}</dd>
            </div>
            <div>
              <dt className="font-semibold">Event Hours</dt>
              <dd>{booking.eventHours} hours</dd>
            </div>
            <div>
              <dt className="font-semibold">Extra Setup Hours</dt>
              <dd>{booking.extraSetupHours} hours</dd>
            </div>
          </dl>
          {booking.notes && (
            <div className="mt-4">
              <p className="font-semibold text-sm text-slate-700">Client Notes</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                {booking.notes}
              </p>
            </div>
          )}
        </div>

        {/* Setup Preferences */}
        {(booking.rectTablesRequested || booking.roundTablesRequested || booking.chairsRequested || booking.setupNotes) && (
          <div className="mt-6 rounded-2xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Setup Preferences
            </h2>
            <dl className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
              {booking.rectTablesRequested !== null && (
                <div>
                  <dt className="font-semibold">Rectangular Tables</dt>
                  <dd>{booking.rectTablesRequested}</dd>
                </div>
              )}
              {booking.roundTablesRequested !== null && (
                <div>
                  <dt className="font-semibold">Round Tables</dt>
                  <dd>{booking.roundTablesRequested}</dd>
                </div>
              )}
              {booking.chairsRequested !== null && (
                <div>
                  <dt className="font-semibold">Chairs</dt>
                  <dd>{booking.chairsRequested}</dd>
                </div>
              )}
            </dl>
            {booking.setupNotes && (
              <div className="mt-4">
                <p className="font-semibold text-sm text-slate-700">Setup Notes</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                  {booking.setupNotes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Add-ons */}
        {booking.addOns && booking.addOns.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Add-ons
            </h2>
            <div className="mt-3 space-y-3">
              {booking.addOns.map((bookingAddOn) => (
                <div key={bookingAddOn.id} className="flex justify-between items-start text-sm">
                  <div>
                    <p className="font-semibold text-slate-700">{bookingAddOn.addOn.name}</p>
                    {bookingAddOn.addOn.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{bookingAddOn.addOn.description}</p>
                    )}
                    <p className="text-xs text-slate-600 mt-1">
                      Quantity: {bookingAddOn.quantity} × {formatCurrency(bookingAddOn.priceAtBooking)}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-700">
                    {formatCurrency(bookingAddOn.quantity * bookingAddOn.priceAtBooking)}
                  </p>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-semibold">
                <span>Add-ons Subtotal</span>
                <span>
                  {formatCurrency(
                    booking.addOns.reduce(
                      (sum, addon) => sum + addon.quantity * addon.priceAtBooking,
                      0
                    )
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Pricing Breakdown
          </h2>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex justify-between">
              <dt>Hourly Rate</dt>
              <dd className="font-semibold">{formatCurrency(booking.hourlyRateCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Event Hours ({booking.eventHours})</dt>
              <dd className="font-semibold">{formatCurrency(booking.baseAmountCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Extra Setup Hours ({booking.extraSetupHours})</dt>
              <dd className="font-semibold">{formatCurrency(booking.extraSetupCents)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <dt>Refundable Deposit</dt>
              <dd className="font-semibold">{formatCurrency(booking.depositCents)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-2 text-base">
              <dt className="font-bold text-textMain">Total Due</dt>
              <dd className="font-bold text-primary">{formatCurrency(booking.totalCents)}</dd>
            </div>
          </dl>
        </div>

        {/* Payment Information */}
        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Payment Information
          </h2>
          <dl className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <dt className="font-semibold">Payment Method</dt>
              <dd>
                {booking.paymentMethod === "STRIPE"
                  ? "Online (Stripe)"
                  : booking.paymentMethod === "CASH"
                    ? "Cash"
                    : booking.paymentMethod === "CHECK"
                      ? "Check"
                      : booking.paymentMethod === "COMP"
                        ? "Complimentary"
                        : booking.paymentMethod || "Stripe"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Amount Paid</dt>
              <dd className={isPaidInFull ? "text-green-600 font-bold" : ""}>
                {formatCurrency(booking.amountPaidCents)}
              </dd>
            </div>
            {booking.paymentMethod === "STRIPE" && (
              <>
                <div>
                  <dt className="font-semibold">Stripe Payment Status</dt>
                  <dd className="capitalize">{booking.stripePaymentStatus ?? "Not started"}</dd>
                </div>
                {booking.stripeCheckoutSessionId && (
                  <div className="md:col-span-2">
                    <dt className="font-semibold">Stripe Checkout Session ID</dt>
                    <dd className="font-mono text-xs text-slate-500">
                      {booking.stripeCheckoutSessionId}
                    </dd>
                  </div>
                )}
              </>
            )}
          </dl>
        </div>

        {/* Contract Information */}
        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Contract Status
          </h2>
          <dl className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <dt className="font-semibold">Contract Accepted</dt>
              <dd className={booking.contractAccepted ? "text-green-600 font-bold" : "text-amber-600"}>
                {booking.contractAccepted ? "Yes" : "No"}
              </dd>
            </div>
            {booking.contractAccepted && (
              <>
                <div>
                  <dt className="font-semibold">Signed By</dt>
                  <dd>{booking.contractSignerName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Accepted At</dt>
                  <dd>
                    {booking.contractAcceptedAt
                      ? formatDateForDisplay(booking.contractAcceptedAt, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Contract Version</dt>
                  <dd>{booking.contractVersion ?? "—"}</dd>
                </div>
              </>
            )}
          </dl>
          {booking.contractText && (
            <div className="mt-4">
              <p className="font-semibold text-sm text-slate-700 mb-2">Contract Text</p>
              <div className="max-h-48 overflow-y-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 whitespace-pre-line">
                {booking.contractText}
              </div>
            </div>
          )}
        </div>

        {/* Admin Notes */}
        {booking.adminNotes && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Admin Notes (Internal Only)
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
              {booking.adminNotes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

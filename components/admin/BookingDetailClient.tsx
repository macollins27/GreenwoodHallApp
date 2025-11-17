"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BookingDetail = {
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
  createdAt: string;
  updatedAt: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

export default function BookingDetailClient({
  booking,
}: {
  booking: BookingDetail;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const eventDate = new Date(booking.eventDate);
  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
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
              Booking Detail
            </p>
            <h1 className="text-2xl font-semibold text-textMain">
              {booking.bookingType} on {dateFormatter.format(eventDate)}
            </h1>
            <p className="text-sm text-slate-600">
              {timeFormatter.format(startTime)} – {timeFormatter.format(endTime)}
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
        {message && (
          <p className="mt-4 text-sm text-primary">{message}</p>
        )}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Contact
            </h2>
            <p className="text-lg font-semibold text-textMain">
              {booking.contactName}
            </p>
            <p className="text-sm text-slate-600">{booking.contactEmail}</p>
            {booking.contactPhone && (
              <p className="text-sm text-slate-600">{booking.contactPhone}</p>
            )}
            <div className="text-sm text-slate-600">
              <p>Event Type: {booking.eventType}</p>
              {booking.guestCount && <p>Guests: {booking.guestCount}</p>}
              {booking.notes && (
                <p className="mt-2 whitespace-pre-line text-xs text-slate-500">
                  {booking.notes}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Pricing
            </h2>
            {booking.bookingType === "EVENT" ? (
              <ul className="text-sm text-slate-700">
                <li>
                  Event hours: <strong>{booking.eventHours}</strong>
                </li>
                <li>
                  Hourly rate:{" "}
                  <strong>{formatCurrency(booking.hourlyRateCents)}</strong>
                </li>
                <li>
                  Extra setup hours: <strong>{booking.extraSetupHours}</strong>
                </li>
                <li>
                  Base amount:{" "}
                  <strong>{formatCurrency(booking.baseAmountCents)}</strong>
                </li>
                <li>
                  Extra setup:{" "}
                  <strong>{formatCurrency(booking.extraSetupCents)}</strong>
                </li>
                <li>
                  Deposit:{" "}
                  <strong>{formatCurrency(booking.depositCents)}</strong>
                </li>
                <li className="text-base font-semibold text-textMain">
                  Total: {formatCurrency(booking.totalCents)}
                </li>
              </ul>
            ) : (
              <p className="text-sm text-slate-600">
                Showings are complimentary. No rental or deposit required.
              </p>
            )}
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Payment
            </h2>
            <p className="text-sm text-slate-600">
              Stripe status:{" "}
              <span className="font-semibold">
                {booking.stripePaymentStatus ?? "Not started"}
              </span>
            </p>
            <p className="text-sm text-slate-600">
              Amount paid:{" "}
              <span className="font-semibold">
                {formatCurrency(booking.amountPaidCents)}
              </span>
            </p>
            {booking.stripeCheckoutSessionId && (
              <p className="text-xs text-slate-500">
                Checkout session: {booking.stripeCheckoutSessionId}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Contract
          </h2>
          {booking.bookingType === "EVENT" ? (
            <dl className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <div>
                <dt>Accepted</dt>
                <dd className="font-semibold">
                  {booking.contractAccepted ? "Yes" : "No"}
                </dd>
              </div>
              <div>
                <dt>Signed by</dt>
                <dd className="font-semibold">
                  {booking.contractSignerName ?? "—"}
                </dd>
              </div>
              <div>
                <dt>Accepted at</dt>
                <dd className="font-semibold">
                  {booking.contractAcceptedAt
                    ? new Date(booking.contractAcceptedAt).toLocaleString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Contract version</dt>
                <dd className="font-semibold">
                  {booking.contractVersion ?? "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-600">
              No contract required for showings.
            </p>
          )}
          {booking.contractText && (
            <div className="mt-4 max-h-48 overflow-y-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 whitespace-pre-line">
              {booking.contractText}
            </div>
          )}
        </div>
      </div>
      <div className="rounded-3xl bg-slate-900 p-4 text-xs text-slate-100">
        <p className="mb-2 font-semibold text-primaryLight">Debug JSON</p>
        <pre className="overflow-auto whitespace-pre-wrap">
{JSON.stringify(booking, null, 2)}
        </pre>
      </div>
    </div>
  );
}


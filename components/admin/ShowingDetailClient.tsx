"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDateForDisplay, formatTimeForDisplay } from "@/lib/datetime";

type ShowingAppointment = {
  id: string;
  bookingType: string;
  status: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  notes: string | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ShowingDetailClient({
  booking,
}: {
  booking: ShowingAppointment;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  async function updateStatus(status: "PENDING" | "COMPLETED" | "CANCELLED") {
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

  // Calculate duration in minutes using ISO strings directly
  const startTimeDate = new Date(booking.startTime);
  const endTimeDate = new Date(booking.endTime);
  const durationMs = endTimeDate.getTime() - startTimeDate.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  const backView = searchParams.get("view") === "list" ? "list" : "calendar";
  const editHref =
    backView === "list"
      ? `/admin/bookings/${booking.id}/edit?view=list`
      : `/admin/bookings/${booking.id}/edit?view=calendar`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            router.push(
              backView === "list" ? "/admin?view=list" : "/admin?view=calendar"
            )
          }
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back to dashboard
        </button>
        <button
          type="button"
          onClick={() => router.push(editHref)}
          className="rounded-full border border-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/5"
        >
          Edit Showing
        </button>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Hall Showing
            </p>
            <h1 className="text-2xl font-semibold text-textMain">
              {formatDateForDisplay(booking.eventDate)}
            </h1>
            <p className="text-sm text-slate-600">
              {formatTimeForDisplay(booking.startTime)} (Approx. {durationMinutes}-minute visit)
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {booking.status}
            </span>
            <div className="flex gap-2">
              {(["PENDING", "COMPLETED", "CANCELLED"] as const).map((status) => (
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
              <a
                href={`mailto:${booking.contactEmail}`}
                className="text-primary hover:underline"
              >
                {booking.contactEmail}
              </a>
            </p>
            {booking.contactPhone && (
              <p className="text-sm text-slate-600">
                <a
                  href={`tel:${booking.contactPhone}`}
                  className="text-primary hover:underline"
                >
                  {booking.contactPhone}
                </a>
              </p>
            )}
          </div>
          {booking.notes && (
            <div className="mt-4">
              <p className="font-semibold text-sm text-slate-700">
                Notes from Prospective Client
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                {booking.notes}
              </p>
            </div>
          )}
        </div>

        {/* Appointment Details */}
        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Appointment Details
          </h2>
          <dl className="mt-3 space-y-3 text-sm text-slate-700">
            <div className="flex justify-between">
              <dt className="font-semibold">Date</dt>
              <dd>{formatDateForDisplay(booking.eventDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-semibold">Appointment Time</dt>
              <dd>{formatTimeForDisplay(booking.startTime)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-semibold">Expected Duration</dt>
              <dd>Approx. {durationMinutes} minutes</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-semibold">Status</dt>
              <dd className="capitalize">{booking.status.toLowerCase()}</dd>
            </div>
          </dl>
        </div>

        {/* Showing Information Notice */}
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            <strong>Showings are complimentary</strong> — no rental fee, deposit, or contract required. 
            This is a simple appointment for prospective clients to tour Greenwood Hall.
          </p>
        </div>

        {/* Admin Internal Notes */}
        {booking.adminNotes && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Internal Staff Notes
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
              {booking.adminNotes}
            </p>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Record Information
          </h2>
          <dl className="mt-3 grid gap-3 text-xs text-slate-600 md:grid-cols-2">
            <div>
              <dt className="font-semibold">Booking ID</dt>
              <dd className="font-mono">{booking.id}</dd>
            </div>
            <div>
              <dt className="font-semibold">Created</dt>
              <dd>{formatDateForDisplay(booking.createdAt, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</dd>
            </div>
            <div>
              <dt className="font-semibold">Last Updated</dt>
              <dd>{formatDateForDisplay(booking.updatedAt, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

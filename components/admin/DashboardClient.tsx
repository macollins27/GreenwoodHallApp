"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminCalendar from "./AdminCalendar";

type BookingRow = {
  id: string;
  bookingType: string;
  status: string;
  contactName: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  totalCents: number;
};

type BlockedDateRow = {
  id: string;
  date: string;
  reason: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

export default function DashboardClient({
  initialBookings,
  initialBlockedDates,
}: {
  initialBookings: BookingRow[];
  initialBlockedDates: BlockedDateRow[];
}) {
  const router = useRouter();
  const [blockedDate, setBlockedDate] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [dashboardView, setDashboardView] = useState<"list" | "calendar">("list");

  async function addBlockedDate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(null);
    if (!blockedDate) {
      setFormMessage("Please select a date to block.");
      return;
    }
    const response = await fetch("/api/admin/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: blockedDate, reason: blockedReason }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setFormMessage(payload?.error ?? "Unable to save blocked date.");
      return;
    }
    setBlockedDate("");
    setBlockedReason("");
    router.refresh();
  }

  async function removeBlockedDate(id: string) {
    setFormMessage(null);
    const response = await fetch(`/api/admin/blocked-dates/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setFormMessage(payload?.error ?? "Unable to remove blocked date.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg border border-slate-300 overflow-hidden bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setDashboardView("list")}
            className={`px-6 py-3 text-sm font-semibold transition ${
              dashboardView === "list"
                ? "bg-primary text-white"
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            📋 List View
          </button>
          <button
            type="button"
            onClick={() => setDashboardView("calendar")}
            className={`px-6 py-3 text-sm font-semibold transition ${
              dashboardView === "calendar"
                ? "bg-primary text-white"
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            📅 Calendar View
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {dashboardView === "calendar" && <AdminCalendar />}

      {/* List View */}
      {dashboardView === "list" && (
        <>
          <section className="rounded-3xl bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Bookings
            </p>
            <h2 className="text-xl font-semibold text-textMain">
              Upcoming Events &amp; Showings
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">
              Showing next {initialBookings.length} records
            </p>
            <button
              type="button"
              onClick={() => router.push("/admin/bookings/create")}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              + Create Booking
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm text-slate-700">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {initialBookings.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    No upcoming bookings yet.
                  </td>
                </tr>
              )}
              {initialBookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b border-slate-100 last:border-none"
                >
                  <td className="py-3 pr-4 font-medium text-textMain">
                    {formatDate(booking.eventDate)}
                  </td>
                  <td className="py-3 pr-4">
                    {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                  </td>
                  <td className="py-3 pr-4">{booking.bookingType}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {booking.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{booking.contactName}</td>
                  <td className="py-3 pr-4">{booking.eventType}</td>
                  <td className="py-3 pr-4 font-semibold text-textMain">
                    {booking.bookingType === "EVENT"
                      ? formatCurrency(booking.totalCents)
                      : "Free"}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/bookings/${booking.id}`)}
                      className="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/5"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Blocked Dates
            </p>
            <h2 className="text-xl font-semibold text-textMain">
              Hold or blackout days
            </h2>
          </div>
          {formMessage && (
            <p className="text-sm text-danger">{formMessage}</p>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {initialBlockedDates.length === 0 && (
            <p className="rounded-2xl border border-dashed border-primary/30 bg-primaryLight/20 p-4 text-sm text-slate-600">
              No blocked dates. Add one below to prevent bookings on specific days.
            </p>
          )}
          {initialBlockedDates.map((blocked) => (
            <div
              key={blocked.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-semibold text-textMain">
                  {formatDate(blocked.date)}
                </p>
                {blocked.reason && (
                  <p className="text-xs text-slate-600">{blocked.reason}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeBlockedDate(blocked.id)}
                className="rounded-full border border-danger px-3 py-1 text-xs font-semibold text-danger transition hover:bg-danger/10"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addBlockedDate} className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="blocked-date" className="text-sm font-semibold text-textMain">
              Block date
            </label>
            <input
              id="blocked-date"
              type="date"
              value={blockedDate}
              onChange={(event) => setBlockedDate(event.target.value)}
              required
              className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="blocked-reason" className="text-sm font-semibold text-textMain">
              Reason (optional)
            </label>
            <textarea
              id="blocked-reason"
              rows={2}
              value={blockedReason}
              onChange={(event) => setBlockedReason(event.target.value)}
              placeholder="Maintenance, holiday, etc."
              className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            Block this date
          </button>
        </form>
      </section>
        </>
      )}
    </div>
  );
}


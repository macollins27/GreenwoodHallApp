"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBusinessDate } from "@/lib/datetime";

type ShowingBookingForEdit = {
  id: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  status: string;
  notes: string | null;
};

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function formatDateInput(isoString: string) {
  const date = getBusinessDate(isoString);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatTimeInput(isoString: string) {
  const date = getBusinessDate(isoString);
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default function AdminShowingEditForm({
  booking,
}: {
  booking: ShowingBookingForEdit;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const returnSuffix = viewParam ? `?view=${viewParam}` : "";

  const [selectedDate, setSelectedDate] = useState(
    formatDateInput(booking.startTime)
  );
  const [selectedTime, setSelectedTime] = useState(
    formatTimeInput(booking.startTime)
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([
    formatTimeInput(booking.startTime),
  ]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [dateHasEvent, setDateHasEvent] = useState(false);
  const [contactName, setContactName] = useState(booking.contactName);
  const [contactEmail, setContactEmail] = useState(booking.contactEmail);
  const [contactPhone, setContactPhone] = useState(booking.contactPhone ?? "");
  const [status, setStatus] = useState(booking.status);
  const [notes, setNotes] = useState(booking.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      setDateHasEvent(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingSlots(true);
    setDateHasEvent(false);

    fetch(`/api/showing-slots?date=${selectedDate}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.blocked) {
          setDateHasEvent(true);
          setAvailableSlots([]);
          return;
        }

        const slots = Array.isArray(data.slots)
          ? data.slots.map((slot: any) =>
              typeof slot === "string" ? slot : slot?.time
            )
          : [];

        const normalizedSlots = slots.filter(
          (slot: unknown): slot is string => typeof slot === "string"
        );

        if (!normalizedSlots.includes(selectedTime)) {
          normalizedSlots.unshift(selectedTime);
        }

        setAvailableSlots(normalizedSlots);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to load showing slots:", err);
          setAvailableSlots((prev) =>
            prev.includes(selectedTime) ? prev : [selectedTime]
          );
        }
      })
      .finally(() => {
        setIsLoadingSlots(false);
      });

    return () => controller.abort();
  }, [selectedDate, selectedTime]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (dateHasEvent) {
      setError(
        "This date is blocked or already has an event. Please choose another date."
      );
      return;
    }

    const payload = {
      eventDate: selectedDate,
      time: selectedTime,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      status,
      notes: notes || null,
    };

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/showings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to update showing.");
      }

      router.push(`/admin/bookings/${booking.id}${returnSuffix}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 rounded-3xl bg-white p-8 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Edit Showing
          </p>
          <h1 className="text-2xl font-semibold text-textMain">
            Showing on {selectedDate}
          </h1>
          <p className="text-sm text-slate-600">
            Update appointment details or move to another slot.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            router.push(`/admin/bookings/${booking.id}${returnSuffix}`)
          }
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {dateHasEvent && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700">
          This date currently has a block or confirmed event. Please choose
          another day.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Schedule
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Showing Date
              </label>
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Time
              </label>
              <select
                required
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
                disabled={isLoadingSlots}
              >
                {availableSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {isLoadingSlots && (
            <p className="mt-2 text-sm text-slate-500">Loading time slots…</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Status
          </h2>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-2xl border border-slate-200 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Contact
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Name
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Notes</h2>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes for staff"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-primary focus:outline-none"
          />
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSaving || dateHasEvent}
            className="rounded-full bg-primary px-8 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() =>
              router.push(`/admin/bookings/${booking.id}${returnSuffix}`)
            }
            className="rounded-full border border-slate-300 px-8 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Discard
          </button>
        </div>
      </form>
    </div>
  );
}

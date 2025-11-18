"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const statusOptions = [
  { value: "PENDING", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function AdminShowingForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [dateHasEvent, setDateHasEvent] = useState(false);

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
        if (data.blocked && data.reason?.includes("event")) {
          setDateHasEvent(true);
          setAvailableSlots([]);
        } else if (data.slots && Array.isArray(data.slots)) {
          const slots = data.slots
            .filter((slot: any) => slot.available)
            .map((slot: any) => slot.time);
          setAvailableSlots(slots);
        } else {
          setAvailableSlots([]);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Error fetching slots:", err);
          setAvailableSlots([]);
        }
      })
      .finally(() => {
        setIsLoadingSlots(false);
      });

    return () => controller.abort();
  }, [selectedDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (dateHasEvent) {
      setError("Cannot create showing - this date has an event booking.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    
    const payload = {
      bookingType: "SHOWING",
      eventDate: formData.get("showingDate") as string,
      appointmentTime: formData.get("appointmentTime") as string,
      contactName: formData.get("contactName") as string,
      contactEmail: formData.get("contactEmail") as string,
      contactPhone: formData.get("contactPhone") as string,
      notes: formData.get("notes") as string,
      adminNotes: formData.get("adminNotes") as string,
      status: formData.get("status") as string,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to create showing appointment");
      }

      const data = await response.json();
      router.push(`/admin/bookings/${data.bookingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white p-8 shadow-card">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary">Create Hall Showing</h2>
        <p className="mt-2 text-sm text-slate-600">
          Schedule a complimentary showing appointment. No payment or contract required.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {dateHasEvent && selectedDate && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Event Conflict:</strong> This date has an event booking. Showings are not allowed on event dates.
          Please choose another date.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Appointment Details */}
        <div className="rounded-2xl border border-slate-200 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Appointment Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="showingDate" className="block text-sm font-semibold text-slate-700">
                Showing Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                id="showingDate"
                name="showingDate"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="appointmentTime" className="block text-sm font-semibold text-slate-700">
                Appointment Time <span className="text-danger">*</span>
              </label>
              <select
                id="appointmentTime"
                name="appointmentTime"
                required
                disabled={!selectedDate || isLoadingSlots || dateHasEvent}
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">
                  {!selectedDate
                    ? "Select a date first"
                    : isLoadingSlots
                      ? "Loading times..."
                      : dateHasEvent
                        ? "Date has event"
                        : availableSlots.length === 0
                          ? "No times available"
                          : "Select a time"}
                </option>
                {availableSlots.map((time) => (
                  <option key={time} value={time}>
                    {new Intl.DateTimeFormat("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(`2024-01-01T${time}`))}
                  </option>
                ))}
              </select>
              {selectedDate && !isLoadingSlots && !dateHasEvent && availableSlots.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  No showing times configured for this day of the week.
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="status" className="block text-sm font-semibold text-slate-700">
                Status <span className="text-danger">*</span>
              </label>
              <select
                id="status"
                name="status"
                required
                defaultValue="PENDING"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-2xl border border-slate-200 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Contact Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="contactName" className="block text-sm font-semibold text-slate-700">
                Contact Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="contactName"
                name="contactName"
                required
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-semibold text-slate-700">
                Contact Email <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                required
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="contactPhone" className="block text-sm font-semibold text-slate-700">
                Contact Phone
              </label>
              <input
                type="tel"
                id="contactPhone"
                name="contactPhone"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-2xl border border-slate-200 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Notes</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-slate-700">
                Visitor Notes / Questions
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Any questions or special requests from the prospective client"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="adminNotes" className="block text-sm font-semibold text-slate-700">
                Internal Staff Notes
              </label>
              <textarea
                id="adminNotes"
                name="adminNotes"
                rows={3}
                placeholder="For staff use only"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Info Notice */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Showings are complimentary appointments. No payment, deposit, or contract is required.
            The system will automatically schedule a 30-minute visit.
          </p>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || dateHasEvent}
            className="rounded-full bg-primary px-8 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Showing Appointment"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-full border border-slate-300 px-8 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

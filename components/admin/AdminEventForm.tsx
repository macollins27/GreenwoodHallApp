"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const timeSlots = Array.from({ length: 17 }, (_, index) => {
  const hour = 8 + index;
  const label = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2024, 0, 1, hour));
  return { value: `${hour.toString().padStart(2, "0")}:00`, label };
});

const eventTypes = [
  "Birthday",
  "Wedding",
  "Baby Shower",
  "Corporate",
  "Other",
];

const paymentMethods = [
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "STRIPE", label: "Stripe/Online" },
  { value: "COMP", label: "Complimentary" },
  { value: "OTHER", label: "Other" },
];

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function AdminEventForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    
    const payload = {
      bookingType: "EVENT",
      eventDate: formData.get("eventDate") as string,
      startTime: formData.get("startTime") as string,
      endTime: formData.get("endTime") as string,
      extraSetupHours: Number(formData.get("extraSetupHours") || 0),
      eventType: formData.get("eventType") as string,
      guestCount: formData.get("guestCount") ? Number(formData.get("guestCount")) : null,
      contactName: formData.get("contactName") as string,
      contactEmail: formData.get("contactEmail") as string,
      contactPhone: formData.get("contactPhone") as string,
      notes: formData.get("notes") as string,
      adminNotes: formData.get("adminNotes") as string,
      paymentMethod: formData.get("paymentMethod") as string,
      status: formData.get("status") as string,
      amountPaidCents: Number(formData.get("amountPaid") || 0) * 100,
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
        throw new Error(errorData?.error || "Failed to create event booking");
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
        <h2 className="text-2xl font-bold text-primary">Create Event Booking</h2>
        <p className="mt-2 text-sm text-slate-600">
          Manually create a new event rental booking with full pricing and payment tracking.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Event Details */}
        <div className="rounded-2xl border border-slate-200 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Event Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="eventDate" className="block text-sm font-semibold text-slate-700">
                Event Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                id="eventDate"
                name="eventDate"
                required
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="eventType" className="block text-sm font-semibold text-slate-700">
                Event Type <span className="text-danger">*</span>
              </label>
              <select
                id="eventType"
                name="eventType"
                required
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="startTime" className="block text-sm font-semibold text-slate-700">
                Start Time <span className="text-danger">*</span>
              </label>
              <select
                id="startTime"
                name="startTime"
                required
                defaultValue="12:00"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {timeSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-semibold text-slate-700">
                End Time <span className="text-danger">*</span>
              </label>
              <select
                id="endTime"
                name="endTime"
                required
                defaultValue="18:00"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {timeSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="extraSetupHours" className="block text-sm font-semibold text-slate-700">
                Extra Setup Hours
              </label>
              <input
                type="number"
                id="extraSetupHours"
                name="extraSetupHours"
                min="0"
                defaultValue="0"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="guestCount" className="block text-sm font-semibold text-slate-700">
                Guest Count
              </label>
              <input
                type="number"
                id="guestCount"
                name="guestCount"
                min="1"
                placeholder="Optional"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
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

        {/* Payment & Status */}
        <div className="rounded-2xl border border-slate-200 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Payment & Status</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-semibold text-slate-700">
                Payment Method <span className="text-danger">*</span>
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                required
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="amountPaid" className="block text-sm font-semibold text-slate-700">
                Amount Paid ($)
              </label>
              <input
                type="number"
                id="amountPaid"
                name="amountPaid"
                min="0"
                step="0.01"
                defaultValue="0"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-slate-700">
                Status <span className="text-danger">*</span>
              </label>
              <select
                id="status"
                name="status"
                required
                defaultValue="CONFIRMED"
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

        {/* Notes */}
        <div className="rounded-2xl border border-slate-200 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Notes</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-slate-700">
                Customer Notes / Special Requests
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="adminNotes" className="block text-sm font-semibold text-slate-700">
                Admin/Internal Notes
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

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-primary px-8 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Event Booking"}
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

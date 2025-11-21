"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type AddOn = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  active: boolean;
};

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
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, number>>({});

  useEffect(() => {
    // Fetch active add-ons
    async function fetchAddOns() {
      try {
        const response = await fetch("/api/admin/addons");
        if (response.ok) {
          const data = await response.json();
          setAddOns(data.filter((a: AddOn) => a.active));
        }
      } catch (err) {
        console.error("Failed to load add-ons:", err);
      }
    }
    fetchAddOns();
  }, []);

  function handleAddOnChange(addOnId: string, quantity: number) {
    setSelectedAddOns((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[addOnId];
        return next;
      }
      return { ...next, [addOnId]: quantity };
    });
  }

  function calculateAddOnsSubtotal() {
    return Object.entries(selectedAddOns).reduce((total, [addOnId, quantity]) => {
      const addOn = addOns.find(a => a.id === addOnId);
      return total + (addOn ? addOn.priceCents * quantity : 0);
    }, 0);
  }

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
      // Setup fields
      rectTablesRequested: formData.get("rectTables") ? Number(formData.get("rectTables")) : null,
      roundTablesRequested: formData.get("roundTables") ? Number(formData.get("roundTables")) : null,
      chairsRequested: formData.get("chairs") ? Number(formData.get("chairs")) : null,
      setupNotes: formData.get("setupNotes") as string || null,
      // Add-ons
      addOns: Object.entries(selectedAddOns).map(([addOnId, quantity]) => {
        const addOn = addOns.find(a => a.id === addOnId)!;
        return {
          addOnId,
          quantity,
          priceAtBooking: addOn.priceCents,
        };
      }),
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

        {/* Setup Preferences */}
        <div className="rounded-2xl border border-slate-200 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Setup Preferences</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="rectTables" className="block text-sm font-semibold text-slate-700">
                Rectangular Tables
              </label>
              <input
                type="number"
                id="rectTables"
                name="rectTables"
                min="0"
                placeholder="Optional"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="roundTables" className="block text-sm font-semibold text-slate-700">
                Round Tables
              </label>
              <input
                type="number"
                id="roundTables"
                name="roundTables"
                min="0"
                placeholder="Optional"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="chairs" className="block text-sm font-semibold text-slate-700">
                Chairs
              </label>
              <input
                type="number"
                id="chairs"
                name="chairs"
                min="0"
                placeholder="Optional"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="setupNotes" className="block text-sm font-semibold text-slate-700">
              Setup Notes
            </label>
            <textarea
              id="setupNotes"
              name="setupNotes"
              rows={2}
              placeholder="Any special setup requirements or instructions"
              className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Add-ons */}
        {addOns.length > 0 && (
          <div className="rounded-2xl border border-slate-200 p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Optional Add-ons</h3>
            <div className="space-y-3">
              {addOns.map((addOn) => (
                <div key={addOn.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{addOn.name}</p>
                    {addOn.description && (
                      <p className="text-sm text-slate-600">{addOn.description}</p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-primary">
                      ${(addOn.priceCents / 100).toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`addon-${addOn.id}`} className="text-sm font-semibold text-slate-700">
                      Quantity:
                    </label>
                    <input
                      type="number"
                      id={`addon-${addOn.id}`}
                      min="0"
                      value={selectedAddOns[addOn.id] || 0}
                      onChange={(e) => handleAddOnChange(addOn.id, parseInt(e.target.value) || 0)}
                      className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(selectedAddOns).length > 0 && (
              <div className="mt-4 rounded-xl bg-primary/5 p-4">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-900">Add-ons Subtotal:</span>
                  <span className="font-bold text-primary">
                    ${(calculateAddOnsSubtotal() / 100).toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  (For reference only - adjust &quot;Amount Paid&quot; above as needed)
                </p>
              </div>
            )}
          </div>
        )}

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

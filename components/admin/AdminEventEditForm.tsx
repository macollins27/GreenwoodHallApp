"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBusinessDate } from "@/lib/datetime";

type BookingAddOn = {
  id: string;
  addOnId: string;
  quantity: number;
  addOn: {
    id: string;
    name: string;
    priceCents: number;
  };
};

type EventBookingForEdit = {
  id: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  status: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  eventType: string;
  guestCount: number | null;
  extraSetupHours: number;
  rectTablesRequested: number | null;
  roundTablesRequested: number | null;
  chairsRequested: number | null;
  setupNotes: string | null;
  notes: string | null;
  addOns: BookingAddOn[];
};

type AddOnOption = {
  id: string;
  name: string;
  priceCents: number;
  description: string | null;
};

type AdminEventEditFormProps = {
  booking: EventBookingForEdit;
  addOns: AddOnOption[];
};

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
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

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function AdminEventEditForm({
  booking,
  addOns,
}: AdminEventEditFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const returnSuffix = viewParam ? `?view=${viewParam}` : "";

  const [formState, setFormState] = useState(() => ({
    eventDate: formatDateInput(booking.eventDate),
    startTime: formatTimeInput(booking.startTime),
    endTime: formatTimeInput(booking.endTime),
    contactName: booking.contactName,
    contactEmail: booking.contactEmail,
    contactPhone: booking.contactPhone ?? "",
    eventType: booking.eventType,
    guestCount: booking.guestCount?.toString() ?? "",
    extraSetupHours: booking.extraSetupHours.toString(),
    rectTablesRequested: booking.rectTablesRequested?.toString() ?? "",
    roundTablesRequested: booking.roundTablesRequested?.toString() ?? "",
    chairsRequested: booking.chairsRequested?.toString() ?? "",
    setupNotes: booking.setupNotes ?? "",
    notes: booking.notes ?? "",
    status: booking.status,
  }));

  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, number>>(
    () => {
      const initial: Record<string, number> = {};
      booking.addOns.forEach((addon) => {
        initial[addon.addOnId] = addon.quantity;
      });
      return initial;
    }
  );

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addOnSummary = useMemo(() => {
    return Object.entries(selectedAddOns).reduce(
      (total, [id, quantity]) => {
        const match = addOns.find((addon) => addon.id === id);
        if (!match) return total;
        const lineTotal = match.priceCents * quantity;
        return {
          quantity: total.quantity + quantity,
          amount: total.amount + lineTotal,
        };
      },
      { quantity: 0, amount: 0 }
    );
  }, [selectedAddOns, addOns]);

  function handleInputChange(
    field: keyof typeof formState,
    value: string
  ) {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleAddOnChange(id: string, value: string) {
    const quantity = Number(value);
    setSelectedAddOns((prev) => {
      if (!Number.isFinite(quantity) || quantity <= 0) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: quantity };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!formState.eventDate || !formState.startTime || !formState.endTime) {
      setError("Date and time are required.");
      return;
    }

    const payload = {
      eventDate: formState.eventDate,
      startTime: formState.startTime,
      endTime: formState.endTime,
      contactName: formState.contactName.trim(),
      contactEmail: formState.contactEmail.trim(),
      contactPhone: formState.contactPhone.trim(),
      eventType: formState.eventType.trim(),
      guestCount: formState.guestCount ? Number(formState.guestCount) : null,
      extraSetupHours: formState.extraSetupHours
        ? Number(formState.extraSetupHours)
        : 0,
      rectTablesRequested: formState.rectTablesRequested
        ? Number(formState.rectTablesRequested)
        : null,
      roundTablesRequested: formState.roundTablesRequested
        ? Number(formState.roundTablesRequested)
        : null,
      chairsRequested: formState.chairsRequested
        ? Number(formState.chairsRequested)
        : null,
      setupNotes: formState.setupNotes || null,
      notes: formState.notes || null,
      status: formState.status,
      addOns: Object.entries(selectedAddOns).map(([addOnId, quantity]) => ({
        addOnId,
        quantity,
      })),
    };

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/events/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to update event.");
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
            Edit Event
          </p>
          <h1 className="text-2xl font-semibold text-textMain">
            {booking.eventType} • {formState.eventDate}
          </h1>
          <p className="text-sm text-slate-600">
            Update event details, setup, and contact info.
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date & Time */}
        <section className="rounded-2xl border border-slate-200 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Schedule
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Event Date
              </label>
              <input
                type="date"
                required
                value={formState.eventDate}
                onChange={(e) =>
                  handleInputChange("eventDate", e.target.value)
                }
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Start Time
              </label>
              <input
                type="time"
                required
                value={formState.startTime}
                onChange={(e) =>
                  handleInputChange("startTime", e.target.value)
                }
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                End Time
              </label>
              <input
                type="time"
                required
                value={formState.endTime}
                onChange={(e) => handleInputChange("endTime", e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Status */}
        <section className="rounded-2xl border border-slate-200 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Status
          </h2>
          <select
            value={formState.status}
            onChange={(e) => handleInputChange("status", e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </section>

        {/* Contact */}
        <section className="rounded-2xl border border-slate-200 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Contact Information
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="text-sm font-semibold text-slate-700">
                Contact Name
              </label>
              <input
                type="text"
                required
                value={formState.contactName}
                onChange={(e) =>
                  handleInputChange("contactName", e.target.value)
                }
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-sm font-semibold text-slate-700">
                Contact Email
              </label>
              <input
                type="email"
                required
                value={formState.contactEmail}
                onChange={(e) =>
                  handleInputChange("contactEmail", e.target.value)
                }
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-sm font-semibold text-slate-700">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formState.contactPhone}
                onChange={(e) =>
                  handleInputChange("contactPhone", e.target.value)
                }
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Setup */}
        <section className="rounded-2xl border border-slate-200 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Setup Preferences
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Rectangular Tables
              </label>
              <input
                type="number"
                min={0}
                value={formState.rectTablesRequested}
                onChange={(e) =>
                  handleInputChange("rectTablesRequested", e.target.value)
                }
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Round Tables
              </label>
              <input
                type="number"
                min={0}
                value={formState.roundTablesRequested}
                onChange={(e) =>
                  handleInputChange("roundTablesRequested", e.target.value)
                }
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Chairs
              </label>
              <input
                type="number"
                min={0}
                value={formState.chairsRequested}
                onChange={(e) =>
                  handleInputChange("chairsRequested", e.target.value)
                }
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Extra Setup Hours
              </label>
              <input
                type="number"
                min={0}
                value={formState.extraSetupHours}
                onChange={(e) =>
                  handleInputChange("extraSetupHours", e.target.value)
                }
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-sm font-semibold text-slate-700">
              Setup Notes
            </label>
            <textarea
              rows={3}
              value={formState.setupNotes}
              onChange={(e) =>
                handleInputChange("setupNotes", e.target.value)
              }
              placeholder="Diagram instructions, DJ location, cake table, etc."
              className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </section>

        {/* Add-ons */}
        <section className="rounded-2xl border border-slate-200 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Add-ons</h2>
            <p className="text-sm text-slate-600">
              {addOnSummary.quantity > 0
                ? `${addOnSummary.quantity} items • ${formatCurrency(
                    addOnSummary.amount
                  )}`
                : "No add-ons selected"}
            </p>
          </div>
          <div className="space-y-4">
            {addOns.length === 0 && (
              <p className="text-sm text-slate-600">
                No add-ons are currently active.
              </p>
            )}
            {addOns.map((addon) => (
              <div
                key={addon.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between gap-4">
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
                    value={selectedAddOns[addon.id] ?? 0}
                    onChange={(e) =>
                      handleAddOnChange(addon.id, e.target.value)
                    }
                    className="w-24 rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Notes */}
        <section className="rounded-2xl border border-slate-200 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Notes
          </h2>
          <textarea
            rows={4}
            value={formState.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            placeholder="Internal notes, payment info, or reminders."
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-primary focus:outline-none"
          />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
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

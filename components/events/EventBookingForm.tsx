"use client";

import { FormEvent, useEffect, useState } from "react";
import type { PricingBreakdown } from "@/lib/pricing";
import { MAX_GUESTS, PRICING_DETAILS } from "@/lib/constants";

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

type AvailabilityStatus =
  | "unknown"
  | "checking"
  | "available"
  | "booked"
  | "blocked"
  | "error";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatCurrency = (cents: number) =>
  currencyFormatter.format(cents / 100);

function getLocalWeekdayFromDateString(dateStr: string): number | null {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;

  const [yearStr, monthStr, dayStr] = parts;
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  if (Number.isNaN(year) || Number.isNaN(monthIndex) || Number.isNaN(day)) {
    return null;
  }

  const localDate = new Date(year, monthIndex, day);
  return localDate.getDay();
}

export default function EventBookingForm() {
  const [selectedDate, setSelectedDate] = useState("");
  const [availabilityStatus, setAvailabilityStatus] =
    useState<AvailabilityStatus>("unknown");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pricingSummary, setPricingSummary] =
    useState<PricingBreakdown | null>(null);
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

  useEffect(() => {
    if (!selectedDate) {
      setAvailabilityStatus("unknown");
      return;
    }

    const controller = new AbortController();
    setAvailabilityStatus("checking");
    fetch(`/api/events/availability?date=${selectedDate}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to check availability.");
        }
        return response.json();
      })
      .then((data) => {
        if (data.status === "blocked") {
          setAvailabilityStatus("blocked");
        } else if (data.status === "booked") {
          setAvailabilityStatus("booked");
        } else {
          setAvailabilityStatus("available");
        }
      })
      .catch((availabilityError) => {
        if (availabilityError.name === "AbortError") return;
        setAvailabilityStatus("error");
      });

    return () => controller.abort();
  }, [selectedDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setPricingSummary(null);

    if (availabilityStatus === "blocked") {
      setError("This date is blocked and not available for bookings.");
      return;
    }

    if (availabilityStatus === "booked") {
      setError("This date already has an event booking. Please choose another.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const eventDateValue = (formData.get("eventDate") as string)?.trim();
    const startTimeValue = (formData.get("startTime") as string)?.trim();
    const endTimeValue = (formData.get("endTime") as string)?.trim();
    const eventTypeValue = (formData.get("eventType") as string)?.trim();
    const contactNameValue = (formData.get("contactName") as string)?.trim();
    const contactEmailValue = (formData.get("contactEmail") as string)?.trim();

    if (!eventDateValue) {
      setError("Please choose an event date.");
      return;
    }

    if (!startTimeValue || !endTimeValue) {
      setError("Please choose both a start time and an end time.");
      return;
    }

    if (!eventTypeValue || !contactNameValue || !contactEmailValue) {
      setError("Please complete all required fields.");
      return;
    }

    const [startHourStr] = startTimeValue.split(":");
    const [endHourStr] = endTimeValue.split(":");
    const startHour = parseInt(startHourStr, 10);
    const endHour = parseInt(endHourStr, 10);

    if (Number.isNaN(startHour) || Number.isNaN(endHour)) {
      setError("Invalid time selection.");
      return;
    }

    if (endHour <= startHour) {
      setError("End time must be after the start time.");
      return;
    }

    const weekday = getLocalWeekdayFromDateString(eventDateValue);
    if (weekday === null) {
      setError("Invalid event date.");
      return;
    }

    const isWeekend = weekday === 0 || weekday === 5 || weekday === 6;
    const durationHours = endHour - startHour;

    if (isWeekend && durationHours < 4) {
      setError("Weekend event bookings must be at least 4 hours.");
      return;
    }

    const extraSetupInput = Number(formData.get("extraSetupHours") ?? 0);
    const extraSetupHours = Number.isFinite(extraSetupInput)
      ? Math.max(0, Math.trunc(extraSetupInput))
      : 0;

    const guestCountRaw = formData.get("guestCount");
    const guestCountNumber =
      guestCountRaw && guestCountRaw.toString().trim() !== ""
        ? Number(guestCountRaw)
        : null;

    const payload = {
      eventDate: eventDateValue,
      startTime: startTimeValue,
      endTime: endTimeValue,
      extraSetupHours,
      eventType: eventTypeValue,
      guestCount:
        guestCountNumber !== null && !Number.isNaN(guestCountNumber)
          ? guestCountNumber
          : null,
      contactName: contactNameValue,
      contactEmail: contactEmailValue,
      contactPhone: (formData.get("contactPhone") as string) ?? "",
      notes: (formData.get("notes") as string) ?? "",
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
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(
          errorPayload?.error ?? "Unable to submit your booking right now."
        );
      }

      const data = await response.json();

      const bookingId = data.bookingId ?? data.booking?.id ?? data.id ?? null;

      if (!bookingId || typeof bookingId !== "string" || bookingId.trim() === "") {
        setError(
          "We couldn't create your booking. Please try again or contact us if the problem continues."
        );
        return;
      }

      // Redirect to event booking wizard
      window.location.href = `/booking/${bookingId}`;
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const disableForDate =
    availabilityStatus === "blocked" || availabilityStatus === "booked";

  return (
    <section id="availability" className="py-12 lg:py-16">
      <div className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-primary/10 sm:p-10">
        <h2>Book Your Event</h2>
        <p className="mb-8 text-lg text-slate-700">
          Share your ideal date and timing. We&apos;ll confirm availability and
          walk you through the contract and payment process.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-primary/20 bg-primaryLight/40 p-4 text-sm font-semibold text-primary">
              {success}
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="event-date" className="text-sm font-semibold">
                Event date
              </label>
              <input
                id="event-date"
                name="eventDate"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                required
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
              />
              <p className="text-xs text-slate-600" aria-live="polite">
                {availabilityStatus === "checking" && "Checking availability..."}
                {availabilityStatus === "available" && selectedDate && (
                  <span className="text-primary">
                    This date is currently available.
                  </span>
                )}
                {availabilityStatus === "booked" && selectedDate && (
                  <span className="text-danger">
                    This date already has an event booking.
                  </span>
                )}
                {availabilityStatus === "blocked" && selectedDate && (
                  <span className="text-danger">
                    This date is blocked (maintenance/holiday). Please choose
                    another day.
                  </span>
                )}
                {availabilityStatus === "error" &&
                  "We couldn't verify availability. You can still submit the form."}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="event-type" className="text-sm font-semibold">
                Event type
              </label>
              <select
                id="event-type"
                name="eventType"
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
                defaultValue={eventTypes[0]}
              >
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="start-time" className="text-sm font-semibold">
                Start time
              </label>
              <select
                id="start-time"
                name="startTime"
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
                defaultValue="12:00"
              >
                {timeSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="end-time" className="text-sm font-semibold">
                End time
              </label>
              <select
                id="end-time"
                name="endTime"
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
                defaultValue="18:00"
              >
                {timeSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="extra-setup" className="text-sm font-semibold">
                Extra setup hours (beyond {PRICING_DETAILS.includedSetupHours}{" "}
                free) - ${PRICING_DETAILS.extraSetupHourly}/hour
              </label>
              <input
                id="extra-setup"
                name="extraSetupHours"
                type="number"
                min={0}
                defaultValue={0}
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="guest-count" className="text-sm font-semibold">
                Guest count (max {MAX_GUESTS})
              </label>
              <input
                id="guest-count"
                name="guestCount"
                type="number"
                min={10}
                max={MAX_GUESTS}
                placeholder="e.g., 80"
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="contact-name" className="text-sm font-semibold">
                Contact name
              </label>
              <input
                id="contact-name"
                name="contactName"
                required
                placeholder="Full name"
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="contact-email" className="text-sm font-semibold">
                Contact email
              </label>
              <input
                id="contact-email"
                name="contactEmail"
                type="email"
                required
                placeholder="you@email.com"
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="contact-phone" className="text-sm font-semibold">
                Contact phone
              </label>
              <input
                id="contact-phone"
                name="contactPhone"
                type="tel"
                placeholder="Optional"
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
              />
            </div>

            {/* Add-ons Section */}
            {addOns.length > 0 && (
              <div className="md:col-span-2 space-y-3">
                <h3 className="text-base font-semibold text-primary">
                  Optional Add-ons
                </h3>
                <div className="space-y-2">
                  {addOns.map((addOn) => (
                    <div key={addOn.id} className="flex items-center justify-between rounded-xl border border-primary/20 bg-white p-4 shadow-sm">
                      <div className="flex-1">
                        <p className="font-semibold text-textMain">{addOn.name}</p>
                        {addOn.description && (
                          <p className="text-sm text-slate-600 mt-1">{addOn.description}</p>
                        )}
                        <p className="mt-1 text-sm font-semibold text-primary">
                          {formatCurrency(addOn.priceCents)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label htmlFor={`addon-${addOn.id}`} className="text-sm font-semibold text-slate-700">
                          Qty:
                        </label>
                        <input
                          type="number"
                          id={`addon-${addOn.id}`}
                          min="0"
                          value={selectedAddOns[addOn.id] || 0}
                          onChange={(e) => handleAddOnChange(addOn.id, parseInt(e.target.value) || 0)}
                          className="w-20 rounded-lg border border-primary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {Object.keys(selectedAddOns).length > 0 && (
                  <div className="rounded-xl bg-primary/5 p-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-slate-900">Add-ons Subtotal:</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(calculateAddOnsSubtotal())}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 md:col-span-2">
              <label htmlFor="notes" className="text-sm font-semibold">
                Notes &amp; special requests
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                placeholder="Tell us about your celebration..."
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-primary/40 bg-primaryLight/30 p-5 text-sm text-slate-700">
            {pricingSummary ? (
              <div className="space-y-3">
                <p className="text-base font-semibold text-primary">
                  Estimated total: {formatCurrency(pricingSummary.totalCents + calculateAddOnsSubtotal())}
                </p>
                <div className="space-y-1 text-sm text-slate-700">
                  {/* Base rental */}
                  <p>
                    {pricingSummary.dayType === "weekday"
                      ? "Weekday"
                      : "Weekend"}{" "}
                    rate ({pricingSummary.eventHours} hrs @{" "}
                    {formatCurrency(pricingSummary.hourlyRateCents)} /hr):{" "}
                    <span className="font-semibold">
                      {formatCurrency(pricingSummary.baseAmountCents)}
                    </span>
                  </p>
                  
                  {/* Extra setup hours */}
                  <p>
                    Extra setup ({pricingSummary.extraSetupHours} hrs):{" "}
                    <span className="font-semibold">
                      {formatCurrency(pricingSummary.extraSetupCents)}
                    </span>
                  </p>
                  
                  {/* Add-ons section - itemized */}
                  {Object.keys(selectedAddOns).length > 0 && (
                    <div className="pt-2 pb-1 border-t border-primary/20">
                      <p className="font-medium text-primary mb-1">Add-ons:</p>
                      <div className="pl-3 space-y-0.5">
                        {Object.entries(selectedAddOns).map(([addOnId, quantity]) => {
                          const addOn = addOns.find(a => a.id === addOnId);
                          if (!addOn || quantity <= 0) return null;
                          
                          const lineTotal = addOn.priceCents * quantity;
                          
                          return (
                            <p key={addOnId} className="text-xs text-slate-600">
                              {addOn.name}
                              {quantity > 1 && (
                                <span className="text-slate-500">
                                  {" "}({quantity} × {formatCurrency(addOn.priceCents)})
                                </span>
                              )}
                              :{" "}
                              <span className="font-semibold text-slate-700">
                                {formatCurrency(lineTotal)}
                              </span>
                            </p>
                          );
                        })}
                        <p className="text-sm font-medium text-slate-700 pt-1">
                          Add-ons subtotal:{" "}
                          <span className="font-semibold">
                            {formatCurrency(calculateAddOnsSubtotal())}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Refundable deposit */}
                  <p>
                    Refundable deposit:{" "}
                    <span className="font-semibold">
                      {formatCurrency(pricingSummary.depositCents)}
                    </span>
                  </p>
                  
                  {/* Note about Stripe total matching */}
                  {/* The displayed total must always match the Stripe Checkout amount, including add-ons. */}
                </div>
              </div>
            ) : (
              <>
                <p className="font-semibold text-primary">
                  Estimated price will appear after you submit the form.
                </p>
                <p className="mt-2 text-slate-600">
                  Every booking includes {PRICING_DETAILS.includedSetupHours}{" "}
                  free setup hours. Additional time is{" "}
                  {formatCurrency(PRICING_DETAILS.extraSetupHourly * 100)} per
                  hour. A ${PRICING_DETAILS.securityDeposit} refundable deposit
                  is required to hold the date.
                </p>
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || disableForDate}
              className="w-full rounded-full bg-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
            >
              {isSubmitting ? "Submitting..." : "Request Event Booking"}
            </button>
            <p
              aria-live="polite"
              className="mt-3 text-sm font-medium text-primary"
            >
              {disableForDate &&
                "Select another date to proceed with this booking."}
              {!disableForDate && isSubmitting && "Sending your request..."}
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}

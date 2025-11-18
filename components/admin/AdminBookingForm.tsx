"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PricingBreakdown, BookingType } from "@/lib/pricing";
import { MAX_GUESTS, PRICING_DETAILS } from "@/lib/constants";

type ShowingSlot = {
  time: string;
  available: boolean;
  reason?: string;
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
  { value: "COMP", label: "Complimentary" },
  { value: "OTHER", label: "Other" },
];

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
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

  if (
    Number.isNaN(year) ||
    Number.isNaN(monthIndex) ||
    Number.isNaN(day)
  ) {
    return null;
  }

  const localDate = new Date(year, monthIndex, day);
  return localDate.getDay();
}

export default function AdminBookingForm() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState("");
  const [availabilityStatus, setAvailabilityStatus] =
    useState<AvailabilityStatus>("unknown");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingSummary, setPricingSummary] =
    useState<PricingBreakdown | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>("EVENT");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("18:00");
  const [extraSetupHours, setExtraSetupHours] = useState(0);

  // SHOWING-specific state
  const [showingSlots, setShowingSlots] = useState<ShowingSlot[]>([]);
  const [showingSlotsLoading, setShowingSlotsLoading] = useState(false);
  const [selectedShowingTime, setSelectedShowingTime] = useState<string>("");
  const [showingTimeOutsideAvailability, setShowingTimeOutsideAvailability] = useState(false);

  useEffect(() => {
    if (!selectedDate) {
      setAvailabilityStatus("unknown");
      return;
    }

    const controller = new AbortController();
    setAvailabilityStatus("checking");
    fetch(`/api/availability?date=${selectedDate}`, {
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

  // Fetch showing slots when date changes for SHOWING type
  useEffect(() => {
    if (!selectedDate || bookingType !== "SHOWING") {
      setShowingSlots([]);
      setSelectedShowingTime("");
      setShowingTimeOutsideAvailability(false);
      return;
    }

    const controller = new AbortController();
    setShowingSlotsLoading(true);

    fetch(`/api/showing-slots?date=${selectedDate}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.slots && Array.isArray(data.slots)) {
          setShowingSlots(data.slots);
          // Auto-select first available slot if any
          const firstAvailable = data.slots.find((s: ShowingSlot) => s.available);
          if (firstAvailable) {
            setSelectedShowingTime(firstAvailable.time);
            setShowingTimeOutsideAvailability(false);
          }
        } else {
          setShowingSlots([]);
        }
        setShowingSlotsLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Failed to fetch showing slots:", err);
        setShowingSlots([]);
        setShowingSlotsLoading(false);
      });

    return () => controller.abort();
  }, [selectedDate, bookingType]);

  // Calculate pricing preview when inputs change
  useEffect(() => {
    if (!selectedDate || !startTime || !endTime) {
      setPricingSummary(null);
      return;
    }

    const [startHourStr] = startTime.split(":");
    const [endHourStr] = endTime.split(":");
    const startHour = parseInt(startHourStr, 10);
    const endHour = parseInt(endHourStr, 10);

    if (endHour <= startHour || bookingType === "SHOWING") {
      setPricingSummary(null);
      return;
    }

    const weekday = getLocalWeekdayFromDateString(selectedDate);
    if (weekday === null) return;

    const isWeekend = weekday === 0 || weekday === 5 || weekday === 6;
    const hours = endHour - startHour;
    const hourlyRate = isWeekend
      ? PRICING_DETAILS.weekendRate
      : PRICING_DETAILS.weekdayRate;
    const baseAmount = hours * hourlyRate;
    const extraSetupCost = extraSetupHours * PRICING_DETAILS.extraSetupHourly;
    const deposit = PRICING_DETAILS.securityDeposit;

    setPricingSummary({
      dayType: isWeekend ? "weekend" : "weekday",
      hourlyRateCents: hourlyRate * 100,
      eventHours: hours,
      baseAmountCents: baseAmount * 100,
      extraSetupHours,
      extraSetupCents: extraSetupCost * 100,
      depositCents: deposit * 100,
      totalCents: (baseAmount + extraSetupCost + deposit) * 100,
    });
  }, [selectedDate, startTime, endTime, extraSetupHours, bookingType]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (availabilityStatus === "blocked") {
      setError(
        "This date is blocked and not available for bookings or showings."
      );
      return;
    }

    if (bookingType === "EVENT" && availabilityStatus === "booked") {
      setError("This date already has an event booking. Please choose another.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const eventDateValue = (formData.get("eventDate") as string)?.trim();
    const contactNameValue = (formData.get("contactName") as string)?.trim();
    const contactEmailValue = (formData.get("contactEmail") as string)?.trim();

    if (!eventDateValue) {
      setError("Please choose a date.");
      return;
    }

    if (!contactNameValue || !contactEmailValue) {
      setError("Please provide contact name and email.");
      return;
    }

    // SHOWING-specific logic
    if (bookingType === "SHOWING") {
      if (!selectedShowingTime) {
        setError("Please select an appointment time.");
        return;
      }

      const amountPaidRaw = formData.get("amountPaid");
      const amountPaidDollars =
        amountPaidRaw && amountPaidRaw.toString().trim() !== ""
          ? Number(amountPaidRaw)
          : 0;

      const payload = {
        bookingType: "SHOWING" as const,
        eventDate: eventDateValue,
        appointmentTime: selectedShowingTime,
        eventType: "Hall Showing",
        contactName: contactNameValue,
        contactEmail: contactEmailValue,
        contactPhone: (formData.get("contactPhone") as string) ?? "",
        notes: (formData.get("notes") as string) ?? "",
        adminNotes: (formData.get("adminNotes") as string) ?? "",
        paymentMethod: (formData.get("paymentMethod") as string) ?? "CASH",
        status: (formData.get("status") as string) ?? "CONFIRMED",
        amountPaidCents:
          !Number.isNaN(amountPaidDollars) && amountPaidDollars >= 0
            ? Math.trunc(amountPaidDollars * 100)
            : 0,
      };

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/admin/bookings/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          throw new Error(
            errorPayload?.error ?? "Unable to create booking right now."
          );
        }

        const data = await response.json();

        const bookingId = data.bookingId ?? data.booking?.id ?? data.id ?? null;

        if (
          !bookingId ||
          typeof bookingId !== "string" ||
          bookingId.trim() === ""
        ) {
          setError(
            "We couldn't create your booking. Please try again or check the server logs."
          );
          return;
        }

        router.push(`/admin/bookings/${bookingId}`);
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Something went wrong. Please try again."
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // EVENT-specific logic
    const startTimeValue = (formData.get("startTime") as string)?.trim();
    const endTimeValue = (formData.get("endTime") as string)?.trim();
    const eventTypeValue = (formData.get("eventType") as string)?.trim();

    if (!startTimeValue || !endTimeValue) {
      setError("Please choose both a start time and an end time.");
      return;
    }

    if (!eventTypeValue) {
      setError("Please select an event type.");
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
    const extraSetupHoursValue = Number.isFinite(extraSetupInput)
      ? Math.max(0, Math.trunc(extraSetupInput))
      : 0;

    const guestCountRaw = formData.get("guestCount");
    const guestCountNumber =
      guestCountRaw && guestCountRaw.toString().trim() !== ""
        ? Number(guestCountRaw)
        : null;

    const amountPaidRaw = formData.get("amountPaid");
    const amountPaidDollars =
      amountPaidRaw && amountPaidRaw.toString().trim() !== ""
        ? Number(amountPaidRaw)
        : 0;

    const payload = {
      bookingType,
      eventDate: eventDateValue,
      startTime: startTimeValue,
      endTime: endTimeValue,
      extraSetupHours: bookingType === "EVENT" ? extraSetupHoursValue : 0,
      eventType: eventTypeValue,
      guestCount:
        guestCountNumber !== null && !Number.isNaN(guestCountNumber)
          ? guestCountNumber
          : null,
      contactName: contactNameValue,
      contactEmail: contactEmailValue,
      contactPhone: (formData.get("contactPhone") as string) ?? "",
      notes: (formData.get("notes") as string) ?? "",
      adminNotes: (formData.get("adminNotes") as string) ?? "",
      paymentMethod: (formData.get("paymentMethod") as string) ?? "CASH",
      status: (formData.get("status") as string) ?? "CONFIRMED",
      amountPaidCents:
        !Number.isNaN(amountPaidDollars) && amountPaidDollars >= 0
          ? Math.trunc(amountPaidDollars * 100)
          : 0,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(
          errorPayload?.error ?? "Unable to create booking right now."
        );
      }

      const data = await response.json();

      const bookingId = data.bookingId ?? data.booking?.id ?? data.id ?? null;

      if (
        !bookingId ||
        typeof bookingId !== "string" ||
        bookingId.trim() === ""
      ) {
        setError(
          "We couldn't create your booking. Please try again or check the server logs."
        );
        return;
      }

      router.push(`/admin/bookings/${bookingId}`);
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
    availabilityStatus === "blocked" ||
    (bookingType === "EVENT" && availabilityStatus === "booked");

  return (
    <div className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-primary/10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          Admin Only
        </p>
        <h2 className="text-2xl font-semibold text-textMain">
          Create Manual Booking
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          For cash payments, walk-ins, comps, or internal events. No contract or
          online payment required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-slate-700">Booking Type</p>
          <div className="flex flex-col gap-2 md:flex-row">
            <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition hover:border-primary/40">
              <input
                type="radio"
                name="bookingType"
                value="EVENT"
                checked={bookingType === "EVENT"}
                onChange={() => setBookingType("EVENT")}
                className="h-4 w-4 accent-primary"
              />
              <span>
                <span className="block font-semibold">Event Rental</span>
                <span className="text-xs text-slate-600">
                  Includes pricing calculation
                </span>
              </span>
            </label>
            <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition hover:border-primary/40">
              <input
                type="radio"
                name="bookingType"
                value="SHOWING"
                checked={bookingType === "SHOWING"}
                onChange={() => setBookingType("SHOWING")}
                className="h-4 w-4 accent-primary"
              />
              <span>
                <span className="block font-semibold">Hall Showing (Free)</span>
                <span className="text-xs text-slate-600">No charges apply</span>
              </span>
            </label>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="event-date" className="text-sm font-semibold">
              Event date <span className="text-danger">*</span>
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
                <span className="text-primary">Available</span>
              )}
              {availabilityStatus === "booked" && selectedDate && (
                <span className="text-danger">
                  Event already booked (showings OK)
                </span>
              )}
              {availabilityStatus === "blocked" && selectedDate && (
                <span className="text-danger">Blocked date</span>
              )}
              {availabilityStatus === "error" && "Couldn't verify availability"}
            </p>
          </div>

          {bookingType === "SHOWING" ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="showing-time" className="text-sm font-semibold">
                Appointment time <span className="text-danger">*</span>
              </label>
              {showingSlotsLoading ? (
                <div className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-slate-500">
                  Loading available times...
                </div>
              ) : showingSlots.length === 0 && selectedDate ? (
                <>
                  <input
                    type="time"
                    value={selectedShowingTime}
                    onChange={(e) => {
                      setSelectedShowingTime(e.target.value);
                      setShowingTimeOutsideAvailability(true);
                    }}
                    required
                    className="rounded-2xl border border-amber-500 bg-amber-50 px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
                  />
                  <p className="text-xs text-amber-700">
                    ⚠️ No standard showing times available. Manually enter time (admin override).
                  </p>
                </>
              ) : showingSlots.length > 0 ? (
                <>
                  <select
                    id="showing-time"
                    value={selectedShowingTime}
                    onChange={(e) => {
                      setSelectedShowingTime(e.target.value);
                      const slot = showingSlots.find(s => s.time === e.target.value);
                      setShowingTimeOutsideAvailability(slot ? !slot.available : false);
                    }}
                    required
                    className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
                  >
                    {showingSlots.map((slot) => (
                      <option key={slot.time} value={slot.time}>
                        {slot.time} {!slot.available ? `(${slot.reason || 'Unavailable'})` : ''}
                      </option>
                    ))}
                  </select>
                  {showingTimeOutsideAvailability && (
                    <p className="text-xs text-amber-700">
                      ⚠️ This time is outside normal availability (admin override)
                    </p>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-slate-500">
                  Select a date to see available times
                </div>
              )}
              <p className="text-xs text-slate-600">
                Admins can book showings at any time, even outside configured windows.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor="event-type" className="text-sm font-semibold">
                Event type <span className="text-danger">*</span>
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
          )}

          {bookingType === "EVENT" && (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="start-time" className="text-sm font-semibold">
                  Start time <span className="text-danger">*</span>
                </label>
                <select
                  id="start-time"
                  name="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
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
                  End time <span className="text-danger">*</span>
                </label>
                <select
                  id="end-time"
                  name="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {bookingType === "EVENT" && (
            <div className="flex flex-col gap-2">
              <label htmlFor="extra-setup" className="text-sm font-semibold">
                Extra setup hours (beyond {PRICING_DETAILS.includedSetupHours}{" "}
                free)
              </label>
              <input
                id="extra-setup"
                name="extraSetupHours"
                type="number"
                min={0}
                value={extraSetupHours}
                onChange={(e) =>
                  setExtraSetupHours(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
              />
            </div>
          )}

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
              Contact name <span className="text-danger">*</span>
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
              Contact email <span className="text-danger">*</span>
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

          <div className="flex flex-col gap-2">
            <label htmlFor="payment-method" className="text-sm font-semibold">
              Payment method <span className="text-danger">*</span>
            </label>
            <select
              id="payment-method"
              name="paymentMethod"
              className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
              defaultValue="CASH"
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="status" className="text-sm font-semibold">
              Status <span className="text-danger">*</span>
            </label>
            <select
              id="status"
              name="status"
              className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
              defaultValue="CONFIRMED"
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {bookingType === "EVENT" && (
            <div className="flex flex-col gap-2">
              <label htmlFor="amount-paid" className="text-sm font-semibold">
                Amount paid ($)
              </label>
              <input
                id="amount-paid"
                name="amountPaid"
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
              />
            </div>
          )}

          <div className="flex flex-col gap-2 md:col-span-2">
            <label htmlFor="notes" className="text-sm font-semibold">
              Customer notes &amp; special requests
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Customer's notes about the event..."
              className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label htmlFor="admin-notes" className="text-sm font-semibold">
              Admin notes (internal only)
            </label>
            <textarea
              id="admin-notes"
              name="adminNotes"
              rows={3}
              placeholder="Internal notes for staff only..."
              className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {bookingType === "EVENT" && pricingSummary && (
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primaryLight/30 p-5 text-sm text-slate-700">
            <div className="space-y-3">
              <p className="text-base font-semibold text-primary">
                Estimated total: {formatCurrency(pricingSummary.totalCents)}
              </p>
              <div className="space-y-1 text-sm text-slate-700">
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
                <p>
                  Extra setup ({pricingSummary.extraSetupHours} hrs):{" "}
                  <span className="font-semibold">
                    {formatCurrency(pricingSummary.extraSetupCents)}
                  </span>
                </p>
                <p>
                  Refundable deposit:{" "}
                  <span className="font-semibold">
                    {formatCurrency(pricingSummary.depositCents)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-full border border-slate-300 px-8 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || disableForDate}
            className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating..." : "Create Booking"}
          </button>
        </div>
        {disableForDate && (
          <p className="text-sm font-medium text-danger">
            Select another date to proceed with this booking type.
          </p>
        )}
      </form>
    </div>
  );
}

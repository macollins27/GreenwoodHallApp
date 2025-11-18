"use client";

import { FormEvent, useEffect, useState } from "react";

interface ShowingSlot {
  time: string;
  available: boolean;
  reason?: string;
}

export default function ShowingScheduleForm() {
  const [selectedDate, setSelectedDate] = useState("");
  const [showingSlots, setShowingSlots] = useState<ShowingSlot[]>([]);
  const [showingSlotsLoading, setShowingSlotsLoading] = useState(false);
  const [selectedShowingTime, setSelectedShowingTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDate) {
      setShowingSlots([]);
      setSelectedShowingTime("");
      return;
    }

    const controller = new AbortController();
    setShowingSlotsLoading(true);
    setSelectedShowingTime("");

    fetch(`/api/showing-slots?date=${selectedDate}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to fetch showing times.");
        }
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data.slots)) {
          setShowingSlots(data.slots);
        } else {
          setShowingSlots([]);
        }
      })
      .catch((fetchError) => {
        if (fetchError.name === "AbortError") return;
        setShowingSlots([]);
      })
      .finally(() => {
        setShowingSlotsLoading(false);
      });

    return () => controller.abort();
  }, [selectedDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const showingDateValue = (formData.get("showingDate") as string)?.trim();
    const showingTimeValue = (formData.get("showingTime") as string)?.trim();
    const contactNameValue = (formData.get("contactName") as string)?.trim();
    const contactEmailValue = (formData.get("contactEmail") as string)?.trim();

    if (!showingDateValue || !showingTimeValue) {
      setError("Please select both a date and a time for your showing.");
      return;
    }

    if (!contactNameValue || !contactEmailValue) {
      setError("Please provide your name and email.");
      return;
    }

    const payload = {
      showingDate: showingDateValue,
      showingTime: showingTimeValue,
      contactName: contactNameValue,
      contactEmail: contactEmailValue,
      contactPhone: (formData.get("contactPhone") as string) ?? "",
      notes: (formData.get("notes") as string) ?? "",
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/showings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(
          errorPayload?.error ?? "Unable to schedule your showing right now."
        );
      }

      await response.json();

      setSuccess(
        "Your showing appointment is confirmed! We've sent a confirmation email."
      );
      (event.target as HTMLFormElement).reset();
      setSelectedDate("");
      setShowingSlots([]);
      setSelectedShowingTime("");
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

  const availableSlots = showingSlots.filter((slot) => slot.available);

  return (
    <section id="showing-schedule" className="py-12 lg:py-16">
      <div className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-primary/10 sm:p-10">
        <h2>Schedule a Showing</h2>
        <p className="mb-8 text-lg text-slate-700">
          Book a 30-minute showing appointment to tour Greenwood Hall.
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
              <label htmlFor="showing-date" className="text-sm font-semibold">
                Showing date
              </label>
              <input
                id="showing-date"
                name="showingDate"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                required
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="showing-time" className="text-sm font-semibold">
                Available times
              </label>
              <select
                id="showing-time"
                name="showingTime"
                value={selectedShowingTime}
                onChange={(event) => setSelectedShowingTime(event.target.value)}
                required
                disabled={showingSlotsLoading || availableSlots.length === 0}
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {showingSlotsLoading
                    ? "Loading times..."
                    : availableSlots.length === 0
                      ? "No times available"
                      : "Select a time"}
                </option>
                {availableSlots.map((slot) => (
                  <option key={slot.time} value={slot.time}>
                    {new Intl.DateTimeFormat("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(
                      new Date(`2024-01-01T${slot.time}`)
                    )}
                  </option>
                ))}
              </select>
              {selectedDate && availableSlots.length === 0 && !showingSlotsLoading && (
                <p className="text-xs text-danger">
                  No showing times available on this date. This may be because there&apos;s an event booking or the date is blocked.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="contact-name" className="text-sm font-semibold">
                Your name
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
                Your email
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
                Your phone
              </label>
              <input
                id="contact-phone"
                name="contactPhone"
                type="tel"
                placeholder="Optional"
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label htmlFor="notes" className="text-sm font-semibold">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Any questions or special requests..."
                className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-textMain shadow-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || availableSlots.length === 0}
              className="w-full rounded-full bg-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
            >
              {isSubmitting ? "Scheduling..." : "Schedule Showing"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

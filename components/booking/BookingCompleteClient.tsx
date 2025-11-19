"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BUSINESS_PHONE } from "@/lib/constants";
import { formatDateForDisplay, formatTimeForDisplay } from "@/lib/datetime";

type BookingCompleteClientProps = {
  sessionId: string | null;
};

type BookingData = {
  id: string;
  bookingType: string;
  eventDate: string; // ISO
  startTime: string; // ISO
  endTime: string; // ISO
  status: string;
  amountPaidCents: number;
  totalCents?: number | null;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatCurrency = (cents: number) => currencyFormatter.format(cents / 100);

export default function BookingCompleteClient({
  sessionId,
}: BookingCompleteClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [effectiveSessionId, setEffectiveSessionId] = useState<string | null>(
    sessionId ?? null
  );
  const [hasTriedUrlFallback, setHasTriedUrlFallback] = useState(false);

  const bookingDateSource = booking?.eventDate ?? booking?.startTime ?? null;
  const bookingDateLabel = bookingDateSource
    ? formatDateForDisplay(bookingDateSource)
    : null;
  const bookingTimeRangeLabel =
    booking?.startTime && booking?.endTime
      ? `${formatTimeForDisplay(booking.startTime)} – ${formatTimeForDisplay(
          booking.endTime
        )}`
      : null;

  // Fallback: try to read session_id from URL if not provided via props
  useEffect(() => {
    if (effectiveSessionId === null && !hasTriedUrlFallback) {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = params.get("session_id") || params.get("sessionId");
        if (fromUrl) {
          setEffectiveSessionId(fromUrl);
        }
        setHasTriedUrlFallback(true);
      } else {
        setHasTriedUrlFallback(true);
      }
    }
  }, [effectiveSessionId, hasTriedUrlFallback]);

  // Main effect: confirm payment when we have a session ID
  useEffect(() => {
    async function confirmPayment(sessionIdToUse: string) {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdToUse }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          setError(
            data?.error ||
              "We had an issue confirming your payment. Please contact us and mention your event date and the email you booked with."
          );
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (!data.success || !data.booking) {
          setError(
            "We had an issue confirming your payment. Please contact us and mention your event date and the email you booked with."
          );
          setLoading(false);
          return;
        }

        setBooking(data.booking);
        setError(null);
      } catch (err) {
        console.error("Failed to confirm payment:", err);
        setError(
          "We had an issue confirming your payment. Please contact us and mention your event date and the email you booked with."
        );
      } finally {
        setLoading(false);
      }
    }

    // Only show error after we've tried URL fallback
    if (effectiveSessionId === null && hasTriedUrlFallback) {
      setLoading(false);
      setError(
        "We could not find your payment session. Please contact us with your booking details so we can help."
      );
      return;
    }

    // If we have a session ID, confirm the payment
    if (effectiveSessionId !== null) {
      confirmPayment(effectiveSessionId);
    }
  }, [effectiveSessionId, hasTriedUrlFallback]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-card">
        {loading && (
          <>
            <p className="text-center text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              Payment Status
            </p>
            <h1 className="mt-3 text-center text-3xl font-semibold text-textMain">
              Confirming Payment
            </h1>
            <p className="mt-4 text-center text-slate-700">
              Confirming your payment...
            </p>
          </>
        )}

        {error && (
          <>
            <p className="text-center text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              Payment Status
            </p>
            <h1 className="mt-3 text-center text-3xl font-semibold text-textMain">
              Confirmation Issue
            </h1>
            <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
              {error}
            </div>
            <div className="mt-6 text-center text-sm text-slate-700">
              <p className="font-semibold">Need help?</p>
              <p className="mt-2">
                Call us at{" "}
                <a
                  href={`tel:${BUSINESS_PHONE.replace(/[^0-9]/g, "")}`}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {BUSINESS_PHONE}
                </a>
              </p>
            </div>
            <div className="mt-8 flex justify-center">
              <Link
                href="/"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                Back to Homepage
              </Link>
            </div>
          </>
        )}

        {booking && !loading && !error && (
          <>
            <p className="text-center text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              Payment Status
            </p>
            <h1 className="mt-3 text-center text-3xl font-semibold text-textMain">
              Your reservation is confirmed!
            </h1>

            <div className="mt-8 space-y-6">
              {/* Event Summary */}
              <div className="rounded-2xl border border-primary/20 bg-primaryLight/20 p-6">
                <h2 className="mb-4 font-semibold text-primary">Event Summary</h2>
                <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <div>
                    <span className="font-medium">Date:</span>{" "}
                    {bookingDateLabel ?? "Date not set"}
                  </div>
                  <div>
                    <span className="font-medium">Time:</span>{" "}
                    {bookingTimeRangeLabel ?? "Time not set"}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>{" "}
                    {booking.bookingType === "EVENT" ? "Event" : "Showing"}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {booking.status}
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="rounded-2xl border border-primary/20 bg-slate-50 p-6">
                <h2 className="mb-4 font-semibold text-primary">
                  Payment Summary
                </h2>
                <div className="space-y-2 text-sm text-slate-700">
                  {booking.amountPaidCents > 0 && (
                    <div className="flex justify-between">
                      <span>Paid:</span>
                      <span className="font-semibold">
                        {formatCurrency(booking.amountPaidCents)}
                      </span>
                    </div>
                  )}
                  {booking.totalCents !== null &&
                    booking.totalCents !== undefined && (
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span className="font-semibold">
                          {formatCurrency(booking.totalCents)}
                        </span>
                      </div>
                    )}
                  {booking.totalCents !== null &&
                    booking.totalCents !== undefined &&
                    booking.amountPaidCents >= booking.totalCents && (
                      <div className="mt-4 rounded-lg bg-primaryLight/30 p-3 text-xs text-slate-600">
                        <p className="font-semibold text-primary">✓ Paid in full</p>
                      </div>
                    )}
                </div>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primaryLight/30 p-4 text-sm text-slate-700">
                <p>
                  We&apos;ve emailed your booking details and a link to manage or
                  update your setup.
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                href="/"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                Back to Homepage
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}


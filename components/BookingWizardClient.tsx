"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CONTRACT_TITLE,
  CONTRACT_SECTIONS,
} from "@/lib/contract";
import { AVAILABLE_TABLES, BUSINESS_PHONE } from "@/lib/constants";
import { formatDateForDisplay, formatTimeForDisplay } from "@/lib/datetime";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatCurrency = (cents: number) => currencyFormatter.format(cents / 100);

type BookingWizardProps = {
  booking: {
    id: string;
    bookingType: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    eventType: string;
    guestCount: number | null;
    contactName: string;
    dayType: string;
    hourlyRateCents: number;
    eventHours: number;
    extraSetupHours: number;
    baseAmountCents: number;
    extraSetupCents: number;
    depositCents: number;
    totalCents: number;
    rectTablesRequested: number | null;
    roundTablesRequested: number | null;
    chairsRequested: number | null;
    setupNotes: string | null;
    contractAccepted: boolean;
    contractSignerName: string | null;
    stripePaymentStatus: string | null;
    amountPaidCents: number;
    addOns?: Array<{
      id: string;
      quantity: number;
      priceAtBooking: number;
      addOn: {
        id: string;
        name: string;
        description: string | null;
      };
    }>;
  };
};

export default function BookingWizardClient({ booking }: BookingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(
    booking.contractAccepted ? 3 : 1
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);

  const dateDisplaySource = booking.eventDate ?? booking.startTime ?? null;
  const dateLabel = dateDisplaySource
    ? formatDateForDisplay(dateDisplaySource)
    : "Date not set";
  const startTimeLabel = booking.startTime
    ? formatTimeForDisplay(booking.startTime)
    : null;
  const endTimeLabel = booking.endTime
    ? formatTimeForDisplay(booking.endTime)
    : null;
  const timeRangeLabel =
    startTimeLabel && endTimeLabel
      ? `${startTimeLabel} – ${endTimeLabel}`
      : "Time not set";

  // Step 1 state
  const [rectTables, setRectTables] = useState<number | null>(
    booking.rectTablesRequested
  );
  const [roundTables, setRoundTables] = useState<number | null>(
    booking.roundTablesRequested
  );
  const [chairs, setChairs] = useState<number | null>(booking.chairsRequested);
  const [setupNotes, setSetupNotes] = useState(booking.setupNotes || "");

  // Step 2 state
  const [contractAccepted, setContractAccepted] = useState(
    booking.contractAccepted
  );
  const [signerName, setSignerName] = useState(booking.contractSignerName || "");

  async function handleSaveSetup() {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/setup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rectTablesRequested: rectTables,
          roundTablesRequested: roundTables,
          chairsRequested: chairs,
          setupNotes: setupNotes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to save setup preferences.");
      }

      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save setup preferences."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAcceptContract() {
    if (booking.bookingType === "EVENT") {
      if (!contractAccepted || !signerName.trim()) {
        setError("Please check the agreement box and type your full name.");
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/bookings/${booking.id}/accept-contract`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signerName: signerName.trim() }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to accept contract.");
      }

      setStep(3);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to accept contract."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStartPayment() {
    setIsStartingCheckout(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error || "Unable to start payment process. Please try again."
        );
      }

      const { checkoutUrl } = await response.json();
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start payment. Please contact us."
      );
      setIsStartingCheckout(false);
    }
  }

  const isPaid = booking.stripePaymentStatus === "paid";

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold ${
            step >= 1
              ? "border-primary bg-primary text-white"
              : "border-slate-300 text-slate-400"
          }`}
        >
          1
        </div>
        <div
          className={`h-1 w-16 ${
            step >= 2 ? "bg-primary" : "bg-slate-300"
          }`}
        />
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold ${
            step >= 2
              ? "border-primary bg-primary text-white"
              : "border-slate-300 text-slate-400"
          }`}
        >
          2
        </div>
        <div
          className={`h-1 w-16 ${
            step >= 3 ? "bg-primary" : "bg-slate-300"
          }`}
        />
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold ${
            step >= 3
              ? "border-primary bg-primary text-white"
              : "border-slate-300 text-slate-400"
          }`}
        >
          3
        </div>
      </div>
      <div className="flex justify-center gap-6 text-sm font-medium text-slate-600">
        <span className={step >= 1 ? "text-primary" : ""}>Setup</span>
        <span className={step >= 2 ? "text-primary" : ""}>Contract</span>
        <span className={step >= 3 ? "text-primary" : ""}>Payment</span>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Step 1: Setup */}
      {step === 1 && (
        <div className="space-y-6 rounded-3xl bg-white p-8 shadow-card ring-1 ring-primary/10">
          <h2 className="text-2xl font-bold">Customize Your Setup</h2>

          {/* Summary card */}
          <div className="rounded-2xl border border-primary/20 bg-primaryLight/20 p-6">
            <h3 className="mb-4 font-semibold text-primary">Event Summary</h3>
            <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <div>
                <span className="font-medium">Date:</span>{" "}
                {dateLabel}
              </div>
              <div>
                <span className="font-medium">Time:</span>{" "}
                {timeRangeLabel}
              </div>
              <div>
                <span className="font-medium">Type:</span> {booking.eventType}
              </div>
              <div>
                <span className="font-medium">Guests:</span>{" "}
                {booking.guestCount || "Not specified"}
              </div>
              <div>
                <span className="font-medium">Booking:</span>{" "}
                {booking.bookingType === "EVENT" ? "Event Rental" : "Hall Showing"}
              </div>
            </div>
          </div>

          {/* Setup preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Setup Preferences</h3>
            {booking.bookingType === "SHOWING" && (
              <p className="text-sm text-slate-600">
                This is a tour/showing only. Setup preferences are optional and
                for planning purposes.
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">
                  Rectangular Tables
                </label>
                <input
                  type="number"
                  min={0}
                  max={AVAILABLE_TABLES.rectangular}
                  value={rectTables ?? ""}
                  onChange={(e) =>
                    setRectTables(
                      e.target.value === ""
                        ? null
                        : Math.max(
                            0,
                            Math.min(
                              AVAILABLE_TABLES.rectangular,
                              parseInt(e.target.value) || 0
                            )
                          )
                    )
                  }
                  className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
                  placeholder="0"
                />
                <p className="text-xs text-slate-600">
                  Available: {AVAILABLE_TABLES.rectangular}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">Round Tables</label>
                <input
                  type="number"
                  min={0}
                  max={AVAILABLE_TABLES.round}
                  value={roundTables ?? ""}
                  onChange={(e) =>
                    setRoundTables(
                      e.target.value === ""
                        ? null
                        : Math.max(
                            0,
                            Math.min(
                              AVAILABLE_TABLES.round,
                              parseInt(e.target.value) || 0
                            )
                          )
                    )
                  }
                  className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
                  placeholder="0"
                />
                <p className="text-xs text-slate-600">
                  Available: {AVAILABLE_TABLES.round}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">Chairs</label>
                <input
                  type="number"
                  min={0}
                  max={AVAILABLE_TABLES.chairs}
                  value={chairs ?? ""}
                  onChange={(e) =>
                    setChairs(
                      e.target.value === ""
                        ? null
                        : Math.max(
                            0,
                            Math.min(
                              AVAILABLE_TABLES.chairs,
                              parseInt(e.target.value) || 0
                            )
                          )
                    )
                  }
                  className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
                  placeholder="0"
                />
                <p className="text-xs text-slate-600">
                  Available: {AVAILABLE_TABLES.chairs}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">
                Setup Notes (optional)
              </label>
              <textarea
                rows={4}
                value={setupNotes}
                onChange={(e) => setSetupNotes(e.target.value)}
                placeholder="e.g., dance floor here, cake table there, DJ setup near entrance..."
                className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSaveSetup}
            disabled={isSaving}
            className="w-full rounded-full bg-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 md:w-auto"
          >
            {isSaving ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      )}

      {/* Step 2: Contract */}
      {step === 2 && (
        <div className="space-y-6 rounded-3xl bg-white p-8 shadow-card ring-1 ring-primary/10">
          <h2 className="text-2xl font-bold">{CONTRACT_TITLE}</h2>

          {/* Event summary */}
          <div className="rounded-2xl border border-primary/20 bg-primaryLight/20 p-4 text-sm">
            <p className="font-semibold text-primary">Event Details</p>
            <p className="mt-1 text-slate-700">
              {dateLabel} • {timeRangeLabel} • {booking.eventType}
            </p>
          </div>

          {/* Contract text */}
          <div className="max-h-96 space-y-4 overflow-y-auto rounded-2xl border border-primary/20 bg-slate-50 p-6">
            {CONTRACT_SECTIONS.map((section, idx) => (
              <div key={idx}>
                <h3 className="mb-2 font-semibold text-primary">
                  {section.heading}
                </h3>
                <p className="text-sm leading-relaxed text-slate-700">
                  {section.body}
                </p>
              </div>
            ))}
          </div>

          {booking.bookingType === "SHOWING" && (
            <div className="rounded-2xl border border-primary/20 bg-primaryLight/30 p-4 text-sm text-slate-700">
              <p className="font-semibold text-primary">Note for Showings</p>
              <p className="mt-1">
                This is a hall tour/showing only. The rental agreement above is
                for reference. No binding contract is required for showings.
              </p>
            </div>
          )}

          {booking.bookingType === "EVENT" && (
            <div className="space-y-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={contractAccepted}
                  onChange={(e) => setContractAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <span className="text-sm text-slate-700">
                  I have read and agree to the Greenwood Hall Rental Agreement.
                </span>
              </label>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">
                  Type your full name as your digital signature
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Full name"
                  className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleAcceptContract}
            disabled={isSaving || (booking.bookingType === "EVENT" && (!contractAccepted || !signerName.trim()))}
            className="w-full rounded-full bg-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 md:w-auto"
          >
            {isSaving ? "Processing..." : "Agree & Continue"}
          </button>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === 3 && (
        <div className="space-y-6 rounded-3xl bg-white p-8 shadow-card ring-1 ring-primary/10">
          <h2 className="text-2xl font-bold">Payment</h2>

          {booking.bookingType === "SHOWING" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-primary/20 bg-primaryLight/30 p-6">
                <p className="text-lg font-semibold text-primary">
                  Hall showings are free.
                </p>
                <p className="mt-2 text-slate-700">
                  No rental fees, deposits, or setup charges apply for showings.
                  We&apos;ll contact you to confirm a convenient tour time.
                </p>
              </div>
              <button
                onClick={() => router.push("/booking/complete")}
                className="w-full rounded-full bg-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-primary/90 md:w-auto"
              >
                Finish
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pricing summary */}
              <div className="rounded-2xl border border-primary/20 bg-slate-50 p-6">
                <h3 className="mb-4 font-semibold text-primary">
                  Pricing Summary
                </h3>
                <div className="space-y-2 text-sm text-slate-700">
                  {/* Base rental */}
                  <div className="flex justify-between">
                    <span>
                      {booking.dayType === "weekday" ? "Weekday" : "Weekend"}{" "}
                      rate ({booking.eventHours} hrs @{" "}
                      {formatCurrency(booking.hourlyRateCents)} /hr)
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(booking.baseAmountCents)}
                    </span>
                  </div>
                  
                  {/* Extra setup */}
                  {booking.extraSetupHours > 0 && (
                    <div className="flex justify-between">
                      <span>
                        Extra setup ({booking.extraSetupHours} hrs)
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(booking.extraSetupCents)}
                      </span>
                    </div>
                  )}
                  
                  {/* Add-ons section - itemized */}
                  {booking.addOns && booking.addOns.length > 0 && (
                    <div className="pt-2 pb-1 border-t border-primary/20">
                      <p className="font-medium text-primary mb-2">Add-ons:</p>
                      <div className="pl-3 space-y-1">
                        {booking.addOns.map((bookingAddOn) => {
                          const lineTotal = bookingAddOn.priceAtBooking * bookingAddOn.quantity;
                          
                          return (
                            <div key={bookingAddOn.id} className="flex justify-between text-xs text-slate-600">
                              <span>
                                {bookingAddOn.addOn.name}
                                {bookingAddOn.quantity > 1 && (
                                  <span className="text-slate-500">
                                    {" "}({bookingAddOn.quantity} × {formatCurrency(bookingAddOn.priceAtBooking)})
                                  </span>
                                )}
                              </span>
                              <span className="font-semibold text-slate-700">
                                {formatCurrency(lineTotal)}
                              </span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between text-sm font-medium text-slate-700 pt-1 border-t border-slate-200 mt-1">
                          <span>Add-ons subtotal</span>
                          <span className="font-semibold">
                            {formatCurrency(
                              booking.addOns.reduce(
                                (sum, addon) => sum + addon.quantity * addon.priceAtBooking,
                                0
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Refundable deposit */}
                  <div className="flex justify-between">
                    <span>Refundable deposit</span>
                    <span className="font-semibold">
                      {formatCurrency(booking.depositCents)}
                    </span>
                  </div>
                  
                  {/* Total - must match Stripe checkout amount */}
                  <div className="mt-4 flex justify-between border-t border-primary/20 pt-2 text-base font-bold text-primary">
                    <span>Total</span>
                    <span>{formatCurrency(booking.totalCents)}</span>
                  </div>
                  
                  {/* The displayed total must always match the Stripe Checkout amount, including add-ons. */}
                </div>
              </div>

              {/* Payment status */}
              {isPaid ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-primary/30 bg-primaryLight/30 p-6">
                    <p className="text-lg font-semibold text-primary">
                      ✓ Paid in full
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Your payment of {formatCurrency(booking.amountPaidCents)}{" "}
                      has been received. Your booking is confirmed!
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/booking/complete")}
                    className="w-full rounded-full bg-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-primary/90 md:w-auto"
                  >
                    View Confirmation
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-700">
                    Complete your booking by paying securely with a credit or
                    debit card.
                  </p>
                  <button
                    onClick={handleStartPayment}
                    disabled={isStartingCheckout}
                    className="w-full rounded-full bg-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 md:w-auto"
                  >
                    {isStartingCheckout ? "Redirecting to payment..." : "Pay securely with card"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


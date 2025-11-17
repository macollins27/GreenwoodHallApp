import Link from "next/link";

export default function BookingCancelledPage() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-card text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-danger">
          Payment Cancelled
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-textMain">
          Payment Not Completed
        </h1>
        <p className="mt-4 text-slate-700">
          Your booking is still pending because the payment step was cancelled.
          Please try again or call us at 833-321-7333 if you need help
          finalizing your reservation.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            Back to Homepage
          </Link>
          <Link
            href="tel:18333217333"
            className="rounded-full border border-primary px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary/5"
          >
            Call Us
          </Link>
        </div>
      </div>
    </main>
  );
}


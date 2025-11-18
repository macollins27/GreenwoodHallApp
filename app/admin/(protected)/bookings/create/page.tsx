import Link from "next/link";

export default function AdminCreateBookingChooserPage() {
  return (
    <div className="space-y-6">
      <div>
        <a
          href="/admin"
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back to dashboard
        </a>
      </div>
      
      <div className="rounded-3xl bg-white p-8 shadow-card">
        <h2 className="text-2xl font-bold text-primary mb-6">
          Create New Booking
        </h2>
        <p className="mb-8 text-slate-600">
          Choose what type of booking you want to create:
        </p>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/admin/events/create"
            className="group rounded-2xl border-2 border-slate-200 p-6 transition hover:border-primary hover:bg-primary/5"
          >
            <h3 className="text-xl font-bold text-primary mb-3 group-hover:underline">
              Event Booking
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Create a full event rental booking with pricing, payment tracking, and contract management.
            </p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Event date, time, and duration</li>
              <li>• Guest count and event type</li>
              <li>• Payment and deposit tracking</li>
              <li>• Contract acceptance</li>
            </ul>
          </Link>
          
          <Link
            href="/admin/showings/create"
            className="group rounded-2xl border-2 border-slate-200 p-6 transition hover:border-primary hover:bg-primary/5"
          >
            <h3 className="text-xl font-bold text-primary mb-3 group-hover:underline">
              Hall Showing
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Schedule a complimentary showing appointment for prospective clients to tour the hall.
            </p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Appointment date and time</li>
              <li>• Contact information</li>
              <li>• No payment or contract</li>
              <li>• Simple scheduling</li>
            </ul>
          </Link>
        </div>
      </div>
    </div>
  );
}


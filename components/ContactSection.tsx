"use client";

import { FormEvent, useState } from "react";
import {
  BUSINESS_ADDRESS,
  BUSINESS_EMAIL,
  BUSINESS_NAME,
  BUSINESS_PHONE,
} from "@/lib/constants";

export default function ContactSection() {
  const [confirmation, setConfirmation] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    // TODO: Replace console.log with email/API integration.
    console.log("Contact form submitted", payload);
    setConfirmation("Thanks! We’ll be in touch within one business day.");
    event.currentTarget.reset();
  }

  return (
    <section id="contact" className="py-12 lg:py-16">
      <div className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-primary/10 sm:p-10">
        <h2>Contact &amp; Directions</h2>
        <p className="mb-8 text-lg text-slate-700">
          Reach out to tour the space, hold a date, or ask any questions about
          hosting your event at Greenwood Hall.
        </p>
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Visit us
              </p>
              <p className="mt-2 text-base font-semibold text-textMain">
                {BUSINESS_NAME}
              </p>
              <p className="text-slate-700">{BUSINESS_ADDRESS}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Call or email
              </p>
              <a
                href={`tel:${BUSINESS_PHONE.replace(/[^0-9]/g, "")}`}
                className="block text-base font-semibold text-primary"
              >
                {BUSINESS_PHONE}
              </a>
              <a
                href={`mailto:${BUSINESS_EMAIL}`}
                className="text-slate-700 underline-offset-4 hover:underline"
              >
                {BUSINESS_EMAIL}
              </a>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-primaryLight/30 p-5 text-sm text-slate-700">
              Tours by appointment only. Weekend walkthroughs available between
              events.
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-semibold">
                Full name
              </label>
              <input
                id="name"
                name="name"
                required
                className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-semibold">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className="text-sm font-semibold">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="message" className="text-sm font-semibold">
                How can we help?
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
                placeholder="Share date preferences, event type, or questions."
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              Send Message
            </button>
            <p aria-live="polite" className="text-sm font-medium text-primary">
              {confirmation}
            </p>
          </form>
        </div>
        <div className="mt-10 rounded-3xl border border-dashed border-primary/30 bg-primaryLight/20 p-6 text-sm text-slate-600">
          Placeholder for embedded Google Map. We&apos;ll integrate directions
          in a future update.
        </div>
      </div>
    </section>
  );
}


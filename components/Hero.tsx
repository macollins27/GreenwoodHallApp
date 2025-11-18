import Link from "next/link";
import { BUSINESS_PHONE, QUICK_FACTS } from "@/lib/constants";

const phoneHref = `tel:${BUSINESS_PHONE.replace(/[^0-9]/g, "")}`;

export default function Hero() {
  return (
    <section id="top" className="py-12 lg:py-16">
      <div className="rounded-3xl bg-white/80 p-8 shadow-card ring-1 ring-primary/5 sm:p-10">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            East Islip, Long Island
          </p>
          <h1>
            Greenwood Hall - Boutique Event Venue in East Islip, Long Island
          </h1>
          <p className="max-w-3xl text-lg text-slate-700">
            Barehall rental only - every booking includes exclusive access to
            the hall, tables, chairs, kitchen, and sparkling clean restrooms.
            You bring your dream menu, bar service, and decorations to make the
            space yours.
          </p>
          <ul className="flex flex-wrap gap-3">
            {QUICK_FACTS.map((fact) => (
              <li
                key={fact}
                className="flex items-center gap-2 rounded-full bg-primaryLight/80 px-4 py-2 text-sm font-medium text-primary"
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full bg-primary"
                />
                {fact}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="#availability"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-semibold text-white shadow-card transition hover:bg-primary/90"
            >
              Check Availability &amp; Book
            </Link>
            <a
              href={phoneHref}
              className="inline-flex items-center justify-center rounded-full border border-primary px-6 py-3 text-base font-semibold text-primary transition hover:bg-primary/5"
            >
              Call Us: {BUSINESS_PHONE}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

import { AMENITIES } from "@/lib/constants";

export default function Amenities() {
  return (
    <section id="amenities" className="py-12 lg:py-16">
      <div className="rounded-3xl bg-white/70 p-8 shadow-card ring-1 ring-primary/5 sm:p-10">
        <h2>What&apos;s Included</h2>
        <p className="mb-8 text-lg text-slate-700">
          Everything you need for a seamless celebration. Bring your favorite
          vendors and personalize the hall however you envision.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {AMENITIES.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-primaryLight bg-white/80 px-5 py-4 text-sm font-medium text-textMain shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-danger/30 bg-danger/5 p-5 text-sm text-danger">
          <strong className="font-semibold">Barehall Rental Only – </strong>
          We rent a clean, flexible space with tables, chairs, kitchen, and
          bathrooms. You provide your own food, drinks, decor, and staffing. We
          do not supply catering, bar service, or decorations.
        </div>
      </div>
    </section>
  );
}


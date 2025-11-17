import {
  BUSINESS_ADDRESS,
  BUSINESS_NAME,
  OPERATING_HOURS,
} from "@/lib/constants";

export default function AboutSection() {
  return (
    <section id="about" className="py-12 lg:py-16">
      <div className="rounded-3xl bg-white/80 p-8 shadow-card ring-1 ring-primary/5 sm:p-10">
        <h2>About {BUSINESS_NAME}</h2>
        <p className="mb-4 text-lg text-slate-700">
          Nestled at {BUSINESS_ADDRESS}, Greenwood Hall is a newly renovated,
          boutique space ideal for weddings, birthdays, baby showers, corporate
          celebrations, and family gatherings. We host one event per day so you
          never feel rushed and can truly make the venue yours.
        </p>
        <p className="text-slate-700">
          Rentals include the full hall, dance floor, reception layout support,
          and a dedicated manager on call. Bring in your dream catering team,
          mobile bar, or DIY spread—our flexible policies support custom
          celebrations of every size.
        </p>
        <div className="mt-6 inline-flex rounded-2xl border border-primary/15 bg-primaryLight/40 px-6 py-4 font-semibold text-primary">
          {OPERATING_HOURS}
        </div>
      </div>
    </section>
  );
}


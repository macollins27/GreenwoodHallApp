import { PRICING_DETAILS } from "@/lib/constants";

const pricingCards = [
  {
    title: "Weekdays (Mon–Thu)",
    rate: PRICING_DETAILS.weekdayRate,
    minimum: "No minimum hours",
    perks: [
      "Flexible hourly booking",
      `${PRICING_DETAILS.includedSetupHours} free setup hours`,
    ],
  },
  {
    title: "Weekends (Fri–Sun)",
    rate: PRICING_DETAILS.weekendRate,
    minimum: `${PRICING_DETAILS.weekendMinimumHours}-hour minimum`,
    perks: [
      "Exclusive daytime or evening blocks",
      `${PRICING_DETAILS.includedSetupHours} free setup hours`,
    ],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-12 lg:py-16">
      <div className="rounded-3xl bg-white/80 p-8 shadow-card ring-1 ring-primary/5 sm:p-10">
        <h2>Simple, Transparent Pricing</h2>
        <p className="mb-8 text-lg text-slate-700">
          Hourly rentals tailored to your event timeline. Only pay for the time
          you need while enjoying full access to the hall and its amenities.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {pricingCards.map((card) => (
            <div
              key={card.title}
              className="rounded-3xl border border-primary/10 bg-primaryLight/20 p-6 shadow-sm"
            >
              <h3 className="text-xl font-semibold">{card.title}</h3>
              <p className="mt-3 text-4xl font-bold text-primary">
                ${card.rate}
                <span className="text-base font-medium text-slate-600">
                  /hour
                </span>
              </p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                {card.minimum}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {card.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <span aria-hidden="true" className="text-primary">
                      ●
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 space-y-4 rounded-2xl bg-white/80 p-6 text-slate-700 ring-1 ring-primary/10">
          <p>
            Additional setup time beyond the free {PRICING_DETAILS.includedSetupHours}{" "}
            hours is ${PRICING_DETAILS.extraSetupHourly}/hour.
          </p>
          <p>
            A ${PRICING_DETAILS.securityDeposit} refundable security deposit is
            required to reserve your date. The deposit may be kept if you cancel
            within 30 days, damage the hall, or break hall rules.
          </p>
        </div>
      </div>
    </section>
  );
}


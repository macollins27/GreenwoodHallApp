import { FAQS } from "@/lib/constants";

export default function FAQ() {
  return (
    <section id="faq" className="py-12 lg:py-16">
      <div className="rounded-3xl bg-white/80 p-8 shadow-card ring-1 ring-primary/5 sm:p-10">
        <h2>FAQ</h2>
        <p className="mb-8 text-lg text-slate-700">
          Answers to the most common questions about renting Greenwood Hall.
        </p>
        <div className="space-y-4">
          {FAQS.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl border border-primary/15 bg-white px-5 py-4 open:bg-primaryLight/40"
            >
              <summary className="cursor-pointer list-none text-lg font-semibold text-textMain">
                {item.question}
              </summary>
              <p className="mt-3 text-slate-700">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}


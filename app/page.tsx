import AboutSection from "@/components/AboutSection";
import Amenities from "@/components/Amenities";
import BookingForm from "@/components/BookingForm";
import ContactSection from "@/components/ContactSection";
import FAQ from "@/components/FAQ";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Pricing from "@/components/Pricing";
import { BUSINESS_NAME, BUSINESS_PHONE } from "@/lib/constants";

export default function Home() {
  const phoneHref = `tel:${BUSINESS_PHONE.replace(/[^0-9]/g, "")}`;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
        <Hero />
        <AboutSection />
        <Amenities />
        <Pricing />
        <BookingForm />
        <FAQ />
        <ContactSection />
      </main>
      <footer className="border-t border-primary/10 bg-white/80">
        <div className="mx-auto flex flex-col gap-3 px-4 py-8 text-sm text-slate-600 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {BUSINESS_NAME}. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a
              href="#contact"
              className="font-semibold text-primary transition hover:text-primary/80"
            >
              Contact
            </a>
            <a
              href={phoneHref}
              className="font-semibold text-primary transition hover:text-primary/80"
            >
              {BUSINESS_PHONE}
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

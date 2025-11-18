import AboutSection from "@/components/AboutSection";
import Amenities from "@/components/Amenities";
import EventBookingForm from "@/components/events/EventBookingForm";
import ShowingScheduleForm from "@/components/showings/ShowingScheduleForm";
import ContactSection from "@/components/ContactSection";
import FAQ from "@/components/FAQ";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Gallery from "@/components/Gallery";
import Pricing from "@/components/Pricing";
import { BUSINESS_NAME, BUSINESS_PHONE } from "@/lib/constants";

export default function Home() {
  const phoneHref = `tel:${BUSINESS_PHONE.replace(/[^0-9]/g, "")}`;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
        <Hero />
        <Gallery />
        <AboutSection />
        <Amenities />
        <Pricing />
        
        {/* Separate booking sections */}
        <div className="space-y-12 py-12 lg:py-16">
          <div className="text-center">
            <h2 className="mb-4 text-3xl font-bold text-primary lg:text-4xl">
              Book Greenwood Hall
            </h2>
            <p className="text-lg text-slate-600">
              Choose how you&apos;d like to get started
            </p>
          </div>
          
          <EventBookingForm />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-primary/20"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-50 px-3 text-sm font-semibold text-primary">
                OR
              </span>
            </div>
          </div>
          
          <ShowingScheduleForm />
        </div>
        
        <FAQ />
        <ContactSection />
      </main>
      <footer className="border-t border-primary/10 bg-white/80">
        <div className="mx-auto flex flex-col gap-3 px-4 py-8 text-sm text-slate-600 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
          <p>
            (c) {new Date().getFullYear()} {BUSINESS_NAME}. All rights reserved.
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

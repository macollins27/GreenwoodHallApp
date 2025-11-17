import Link from "next/link";
import { BUSINESS_NAME, NAV_LINKS } from "@/lib/constants";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-primary/10 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
        <Link
          href="#top"
          className="font-heading text-xl font-semibold tracking-tight text-primary"
          aria-label="Greenwood Hall home"
        >
          {BUSINESS_NAME}
        </Link>
        <nav className="hidden gap-6 text-sm font-medium lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-textMain transition hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <Link
          href="#availability"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Check Availability &amp; Book
        </Link>
      </div>
    </header>
  );
}


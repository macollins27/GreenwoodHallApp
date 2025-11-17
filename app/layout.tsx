import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Greenwood Hall – Boutique Event Venue in East Islip, Long Island",
  description:
    "Boutique barehall rental in East Islip, NY for up to 120 guests. Flexible hourly pricing, newly renovated space, perfect for weddings, showers, and celebrations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} bg-background text-textMain antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

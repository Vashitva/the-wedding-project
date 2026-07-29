import type { Metadata, Viewport } from "next";
import {
  Inter,
  Italiana,
  Pinyon_Script,
  Tiro_Devanagari_Hindi,
} from "next/font/google";
import { wedding, coupleNames } from "@config/wedding";
import ServiceWorker from "@/components/ServiceWorker";
import Concierge from "@/components/Concierge";
import "./globals.css";

// Every heading. An art-nouveau face — high-waisted, thin-stroked and
// botanical, which is the floral note carried through the whole page.
const italiana = Italiana({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-italiana",
  display: "swap",
});

// Reserved for the couple's names and the biggest moments — a copperplate
// script is unreadable at paragraph size and lovely at display size.
const pinyon = Pinyon_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pinyon",
  display: "swap",
});

// Only used for the optional script line in the hero; Cormorant has no
// Devanagari coverage, and this pairs with it closely.
const devanagari = Tiro_Devanagari_Hindi({
  subsets: ["devanagari"],
  weight: "400",
  variable: "--font-devanagari",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const description = `${coupleNames} — ${new Date(wedding.weddingDate).toLocaleDateString(
  "en-GB",
  { day: "numeric", month: "long", year: "numeric", timeZone: wedding.timeZone },
)} in ${wedding.location.city}, ${wedding.location.region}. Schedule, travel, and RSVP.`;

export const metadata: Metadata = {
  metadataBase: new URL(wedding.siteUrl),
  title: {
    default: `${wedding.siteName} · ${wedding.tagline}`,
    template: `%s · ${wedding.siteName}`,
  },
  description,
  applicationName: wedding.siteName,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: wedding.siteName,
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    title: `${wedding.siteName} · ${wedding.tagline}`,
    description,
    siteName: wedding.siteName,
  },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Guest lists and RSVP pages have no business in search results.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // One value: the site is light in every scheme.
  themeColor: "#fffefd",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${italiana.variable} ${pinyon.variable} ${inter.variable} ${devanagari.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-paper-raised focus:px-4 focus:py-2 focus:border focus:border-line"
        >
          Skip to content
        </a>
        {children}
        <Concierge />
        <ServiceWorker />
      </body>
    </html>
  );
}

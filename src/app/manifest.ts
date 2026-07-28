import type { MetadataRoute } from "next";
import { wedding, coupleNames } from "@config/wedding";

/** Served at /manifest.webmanifest, driven by config/wedding.ts. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${wedding.siteName} · ${wedding.tagline}`,
    short_name: coupleNames,
    description: `The schedule, travel notes and RSVP for ${coupleNames}'s wedding.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fffefd",
    theme_color: "#b0707c",
    categories: ["lifestyle", "events"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "RSVP", url: "/rsvp" },
      { name: "Schedule", url: "/#schedule" },
      { name: "Travel & stay", url: "/#travel" },
    ],
  };
}

"use client";

import { useEffect } from "react";

/**
 * Registers the offline service worker. Guests who add the site to their home
 * screen keep the schedule, travel notes and FAQ available with no signal —
 * which is the situation at most rural venues.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Service worker registration failed", err);
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}

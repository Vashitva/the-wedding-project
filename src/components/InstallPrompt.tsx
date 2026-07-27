"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "wedding:install-dismissed";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari predates the display-mode media query.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * Offers to install the site as an app. Chrome and Edge get the real install
 * prompt; iOS gets the "Share → Add to Home Screen" instruction, because Safari
 * has no programmatic equivalent.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallEvent);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);

    // Safari never fires the event, so surface the manual route instead.
    if (isIos()) {
      const timer = setTimeout(() => setShowIosHint(true), 4000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  if (!deferred && !showIosHint) return null;

  return (
    <div className="no-print fixed inset-x-3 bottom-3 z-50 sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-sm">
      <div className="card shadow-lg p-4 flex items-start gap-3">
        <div className="flex-1">
          <p className="font-display text-lg leading-snug">Keep this in your pocket</p>
          <p className="mt-1 text-sm text-ink-soft">
            {deferred
              ? "Install the site so the schedule and directions work without signal at the venue."
              : "Tap Share, then “Add to Home Screen”, and the schedule works without signal at the venue."}
          </p>
          {deferred && (
            <button type="button" onClick={install} className="btn btn-primary mt-3">
              Install
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-ink-faint hover:text-ink text-xl leading-none px-1"
        >
          ×
        </button>
      </div>
    </div>
  );
}

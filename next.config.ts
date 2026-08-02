import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /*
   * Hosts allowed to load `/_next/*` from the **dev server**.
   *
   * Without this, opening `npm run dev` from anything other than `localhost`
   * — a phone on the same wifi at `http://192.168.1.42:3000`, say — gets a
   * page that looks completely normal and is completely dead: Next blocks the
   * dev chunks, React never hydrates, and every button, canvas and menu on the
   * site stops responding. The HTML is server-rendered, so nothing *looks*
   * broken, which is what makes it such a confusing failure.
   *
   * It bites on localhost too the moment you bind wide with `-H 0.0.0.0` to
   * let a phone in: the allowlist is built from the bind hostname, so
   * `127.0.0.1` is suddenly cross-origin against a `0.0.0.0` server. Hence
   * listing the loopbacks explicitly.
   *
   * Dev only — `next start` ignores this entirely, and none of it reaches
   * production. Set DEV_ORIGIN for a machine outside these ranges.
   */
  allowedDevOrigins: [
    "127.0.0.1",
    "[::1]",
    "*.local", // macbook.local and friends, via mDNS
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
    ...(process.env.DEV_ORIGIN ? [process.env.DEV_ORIGIN] : []),
  ],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;

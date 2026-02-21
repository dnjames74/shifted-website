"use client";

import { useEffect } from "react";

function buildQueryFromUrl(href: string) {
  // Turn BOTH ?query and #hash into one query string
  const url = new URL(href);

  const combined = new URLSearchParams(url.searchParams);

  // Hash can be like: #access_token=...&refresh_token=...&type=recovery
  const hash = (url.hash || "").replace(/^#/, "");
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      if (!combined.has(key)) combined.set(key, value);
    });
  }

  return combined.toString();
}

export default function AuthCallbackBridge() {
  useEffect(() => {
    const qs = buildQueryFromUrl(window.location.href);

    // Try DEV first (so your dev build wins during testing), then PROD fallback.
    const dev = `shiftedclean-dev://auth/callback${qs ? `?${qs}` : ""}`;
    const prod = `shiftedclean://auth/callback${qs ? `?${qs}` : ""}`;

    // Attempt dev scheme first
    window.location.replace(dev);

    // Fallback to prod shortly after (if dev not installed)
    const t = setTimeout(() => {
      window.location.replace(prod);
    }, 700);

    return () => clearTimeout(t);
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>Opening Shifted…</h2>
      <p>
        If nothing happens, make sure the app is installed, then go back and tap
        the link again.
      </p>
    </main>
  );
}
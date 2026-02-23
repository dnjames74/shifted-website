// shifted-website/app/auth/callback/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

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

  // app=dev|prod is ONLY for the website to decide which scheme to open.
  combined.delete("app");

  return combined.toString();
}

function getPreferredAppFromUrl(href: string): "dev" | "prod" {
  try {
    const url = new URL(href);
    const fromQuery = url.searchParams.get("app");
    if (fromQuery === "dev") return "dev";
    return "prod";
  } catch {
    return "prod";
  }
}

export default function AuthCallbackBridge() {
  const [attempted, setAttempted] = useState(false);

  const { preferred, qs, devUrl, prodUrl, firstUrl, secondUrl } = useMemo(() => {
    const href =
      typeof window !== "undefined" ? window.location.href : "https://www.shifteddating.com/auth/callback";

    const preferred = getPreferredAppFromUrl(href);
    const qs = buildQueryFromUrl(href);

    const devUrl = `shiftedclean-dev://auth/callback${qs ? `?${qs}` : ""}`;
    const prodUrl = `shiftedclean://auth/callback${qs ? `?${qs}` : ""}`;

    const firstUrl = preferred === "dev" ? devUrl : prodUrl;
    const secondUrl = preferred === "dev" ? prodUrl : devUrl;

    return { preferred, qs, devUrl, prodUrl, firstUrl, secondUrl };
  }, []);

  useEffect(() => {
    // Try the preferred scheme first, then fallback to the other.
    // Safari may block auto-redirect sometimes; we also provide a manual button below.
    setAttempted(true);

    // Use location.href (not replace) so the user can back out if needed.
    window.location.href = firstUrl;

    const t = window.setTimeout(() => {
      window.location.href = secondUrl;
    }, 900);

    return () => window.clearTimeout(t);
  }, [firstUrl, secondUrl]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>Opening Shifted…</h2>

      <p style={{ marginTop: 8 }}>
        If nothing happens, tap the button below. (Sometimes iOS blocks automatic
        opening.)
      </p>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a
          href={firstUrl}
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid #ccc",
            textDecoration: "none",
          }}
        >
          Open {preferred === "dev" ? "Shifted Dev" : "Shifted"}
        </a>

        <a
          href={secondUrl}
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid #ccc",
            textDecoration: "none",
          }}
        >
          Try the other app
        </a>
      </div>

      {!attempted ? null : (
        <p style={{ marginTop: 14, opacity: 0.75 }}>
          If you don’t have the app installed, install it and then return to this
          email and tap the link again.
        </p>
      )}
    </main>
  );
}
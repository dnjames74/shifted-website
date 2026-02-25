"use client";

import { useEffect } from "react";

// ✅ prevent prerender/build-time execution
export const dynamic = "force-dynamic";

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
    // ✅ guard for safety (should always exist in client)
    if (typeof window === "undefined") return;

    const qs = buildQueryFromUrl(window.location.href);

    // If you pass app=dev or app=prod in redirect_to, respect it.
    const appParam = new URLSearchParams(window.location.search).get("app");
    const prefer: "dev" | "prod" | "auto" =
      appParam === "dev" ? "dev" : appParam === "prod" ? "prod" : "auto";

    const dev = `shiftedclean-dev://auth/callback${qs ? `?${qs}` : ""}`;
    const prod = `shiftedclean://auth/callback${qs ? `?${qs}` : ""}`;

    // Auto: try dev first, then prod fallback.
    if (prefer === "dev") {
      window.location.replace(dev);
      return;
    }
    if (prefer === "prod") {
      window.location.replace(prod);
      return;
    }

    window.location.replace(dev);
    const t = setTimeout(() => {
      window.location.replace(prod);
    }, 700);

    return () => clearTimeout(t);
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>Opening Shifted…</h2>
      <p style={{ marginTop: 8 }}>
        If nothing happens, tap the button below. (Sometimes iOS blocks automatic opening.)
      </p>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a
          href="shiftedclean://auth/callback"
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid #ccc",
            textDecoration: "none",
          }}
        >
          Open Shifted
        </a>

        <a
          href="shiftedclean-dev://auth/callback"
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
    </main>
  );
}
"use client";

import { useEffect } from "react";

// ✅ prevent prerender/build-time execution
export const dynamic = "force-dynamic";

function buildParamsFromUrl(href: string) {
  // Combine BOTH ?query and #hash into one URLSearchParams
  const url = new URL(href);
  const combined = new URLSearchParams(url.searchParams);

  // Supabase puts tokens in the fragment: #access_token=...&refresh_token=...
  const hash = (url.hash || "").replace(/^#/, "");
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      // hash wins if duplicated (safer for tokens)
      combined.set(key, value);
    });
  }

  return combined;
}

export default function AuthCallbackBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = buildParamsFromUrl(window.location.href);

    // Ensure we always carry these through (you already pass them)
    // type=recovery, app=dev|prod
    const type = params.get("type");
    const app = params.get("app");

    // Build the Universal Link target (ONLY /open is in AASA now)
    const openUrl = new URL("https://www.shifteddating.com/open");

    // Copy all params through to /open so the app can read them from querystring
    params.forEach((value, key) => {
      openUrl.searchParams.set(key, value);
    });

    // If you want extra safety, you can enforce the app/type params exist:
    if (!type) openUrl.searchParams.set("type", "recovery");
    if (!app) openUrl.searchParams.set("app", "prod");

    window.location.replace(openUrl.toString());
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>Almost there…</h2>
      <p style={{ marginTop: 8 }}>
        Finishing securely. If nothing happens, tap the button below.
      </p>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a
          href="https://www.shifteddating.com/open"
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
      </div>
    </main>
  );
}
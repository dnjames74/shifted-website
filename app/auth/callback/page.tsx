// shifted-website/app/auth/callback/page.tsx
export const dynamic = "force-dynamic"; // ✅ prevent prerender/build-time execution

"use client";

import { useEffect, useMemo, useState } from "react";

function safeBuildQueryFromHref(href: string | null | undefined) {
  if (!href) return "";

  try {
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
  } catch {
    return "";
  }
}

type AppPref = "dev" | "prod" | null;

function readAppPrefFromQuery(qs: string): AppPref {
  try {
    const p = new URLSearchParams(qs);
    const app = p.get("app");
    if (app === "dev") return "dev";
    if (app === "prod") return "prod";
    return null;
  } catch {
    return null;
  }
}

export default function AuthCallbackBridge() {
  // ✅ Default links (SSR-safe). We update them after mount if tokens exist.
  const [links, setLinks] = useState(() => ({
    prod: "shiftedclean://auth/callback",
    dev: "shiftedclean-dev://auth/callback",
  }));

  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    // ✅ Browser-only
    const href = typeof window !== "undefined" ? window.location.href : "";
    const qs = safeBuildQueryFromHref(href);

    const prod = `shiftedclean://auth/callback${qs ? `?${qs}` : ""}`;
    const dev = `shiftedclean-dev://auth/callback${qs ? `?${qs}` : ""}`;

    setLinks({ prod, dev });

    // Respect ?app=dev or ?app=prod if you pass it in redirect_to
    const pref = readAppPrefFromQuery(qs);

    // Try to open immediately (sometimes iOS blocks auto-open)
    const first = pref === "prod" ? prod : pref === "dev" ? dev : dev; // default: dev first
    const second = pref === "prod" ? dev : prod; // fallback

    // Attempt #1
    window.location.replace(first);

    // Fallback to the other app shortly after (if not installed / blocked)
    const t = setTimeout(() => {
      window.location.replace(second);
      setHint("If nothing happens, tap one of the buttons below (iOS sometimes blocks automatic opening).");
    }, 700);

    return () => clearTimeout(t);
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>Opening Shifted…</h2>
      <p style={{ marginTop: 8 }}>
        If nothing happens, tap one of the buttons below.
      </p>

      {hint ? (
        <p style={{ marginTop: 8, opacity: 0.8 }}>{hint}</p>
      ) : null}

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a
          href={links.prod}
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
          href={links.dev}
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid #ccc",
            textDecoration: "none",
          }}
        >
          Try Shifted Dev
        </a>
      </div>
    </main>
  );
}
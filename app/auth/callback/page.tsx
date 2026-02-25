"use client";

import { useEffect, useMemo } from "react";

function buildPayloadFromHref(href: string) {
  const url = new URL(href);

  // merge query + hash into one querystring
  const combined = new URLSearchParams(url.searchParams);

  const hash = (url.hash || "").replace(/^#/, "");
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      if (!combined.has(key)) combined.set(key, value);
    });
  }

  return combined.toString(); // "type=recovery&code=...&access_token=..."
}

function getPreferredApp(href: string): "dev" | "prod" | "auto" {
  try {
    const url = new URL(href);
    const app = url.searchParams.get("app");
    if (app === "dev") return "dev";
    if (app === "prod") return "prod";
    return "auto";
  } catch {
    return "auto";
  }
}

export default function AuthCallbackBridge() {
  const href = typeof window !== "undefined" ? window.location.href : "";
  const qs = useMemo(() => buildPayloadFromHref(href), [href]);
  const preferred = useMemo(() => getPreferredApp(href), [href]);

  const devUrl = `shiftedclean-dev://auth/callback${qs ? `?${qs}` : ""}`;
  const prodUrl = `shiftedclean://auth/callback${qs ? `?${qs}` : ""}`;

  useEffect(() => {
    // Prefer what the link says (app=dev or app=prod). If not specified, try dev then prod.
    const first =
      preferred === "dev" ? devUrl : preferred === "prod" ? prodUrl : devUrl;
    const second =
      preferred === "dev" ? prodUrl : preferred === "prod" ? devUrl : prodUrl;

    // Attempt automatic open
    window.location.replace(first);

    // Fallback shortly after (if app not installed or iOS blocks auto-open)
    const t = setTimeout(() => {
      window.location.replace(second);
    }, 800);

    return () => clearTimeout(t);
  }, [devUrl, prodUrl, preferred]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>Opening Shifted…</h2>
      <p style={{ marginTop: 8 }}>
        If this hangs, tap the button below. (Sometimes iOS blocks automatic opening.)
      </p>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {/* IMPORTANT: Buttons MUST include the payload */}
        <a
          href={preferred === "dev" ? devUrl : prodUrl}
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
          href={preferred === "dev" ? prodUrl : devUrl}
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

      <p style={{ marginTop: 14, opacity: 0.7, fontSize: 12 }}>
        (Debug) {qs ? "Payload detected ✅" : "No payload detected ❌"}
      </p>
    </main>
  );
}
// shifted-website: app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";

export const dynamic = "force-dynamic";

function combineQueryAndHash(href: string) {
  const url = new URL(href);
  const combined = new URLSearchParams(url.searchParams);

  const hash = (url.hash || "").replace(/^#/, "");
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      if (!combined.has(key)) combined.set(key, value);
    });
  }

  return combined;
}

export default function AuthCallbackBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = combineQueryAndHash(window.location.href);

    const type = params.get("type") || "recovery";
    const access_token = params.get("access_token") || "";
    const refresh_token = params.get("refresh_token") || "";
    const app = params.get("app") || "prod";

    // If tokens are missing, show a helpful error (don’t loop forever)
    if (!access_token || !refresh_token) {
      // Keep the page rendered (user can retry with a fresh email)
      console.log("[web auth/callback] missing tokens", {
        type,
        accessLen: access_token.length,
        refreshLen: refresh_token.length,
      });
      return;
    }

    // Redirect to /open with tokens in query (Universal Link -> app)
    const openUrl = new URL("https://www.shifteddating.com/open");
    openUrl.searchParams.set("type", type);
    openUrl.searchParams.set("app", app);
    openUrl.searchParams.set("access_token", access_token);
    openUrl.searchParams.set("refresh_token", refresh_token);

    window.location.replace(openUrl.toString());
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>Almost there…</h2>
      <p style={{ marginTop: 8 }}>
        Finishing securely. If nothing happens, request a new reset email and try again.
      </p>
    </main>
  );
}
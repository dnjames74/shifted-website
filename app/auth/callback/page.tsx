// app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

function getHashParams() {
  const hash = (window.location.hash || "").replace(/^#/, "");
  const p = new URLSearchParams(hash);

  return {
    access_token: p.get("access_token"),
    refresh_token: p.get("refresh_token"),
    type: p.get("type"),
    error: p.get("error"),
    error_description: p.get("error_description"),
  };
}

export default function AuthCallbackBridgePage() {
  const [msg, setMsg] = useState("Almost there…");
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (typeof window === "undefined") return;

        // Keep your existing query params (app=prod/dev, type=recovery, etc.)
        const qs = new URLSearchParams(window.location.search);
        const app = qs.get("app") || "prod";
        const typeQ = qs.get("type") || "recovery";

        // Hash usually contains the real tokens
        const hp = getHashParams();

        if (hp.error) {
          setMsg("Couldn’t open the reset link.");
          setDetails(hp.error_description ?? hp.error);
          return;
        }

        if (!hp.access_token || !hp.refresh_token) {
          setMsg("Missing tokens in reset link.");
          setDetails(
            "Go back to the email and tap the reset link again (in Safari)."
          );
          return;
        }

        setMsg("Securing your reset link…");

        // POST tokens to server to get a short rid
        const res = await fetch("/api/recovery-bridge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            access_token: hp.access_token,
            refresh_token: hp.refresh_token,
          }),
        });

        const json = await res.json().catch(() => ({} as any));
        if (!res.ok || !json?.rid) {
          setMsg("Couldn’t prepare password reset.");
          setDetails(json?.error ?? "Server error");
          return;
        }

        const rid = json.rid as string;

        // Redirect to /open with a short rid (NO TOKENS IN URL)
        const openUrl = `https://www.shifteddating.com/open?type=${encodeURIComponent(
          typeQ
        )}&app=${encodeURIComponent(app)}&rid=${encodeURIComponent(rid)}`;

        setMsg("Opening Shifted…");
        window.location.replace(openUrl);
      } catch (e: any) {
        if (cancelled) return;
        setMsg("Couldn’t prepare password reset.");
        setDetails(e?.message ?? "Please try again.");
      }
    };

    // Small delay helps Safari fully populate location.hash before we read it
    const t = setTimeout(run, 50);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>{msg}</h2>
      {details ? <p style={{ marginTop: 8 }}>{details}</p> : null}

      <p style={{ marginTop: 12, opacity: 0.8 }}>
        If iOS shows an “Open” banner at the top, tap it.
      </p>
    </main>
  );
}
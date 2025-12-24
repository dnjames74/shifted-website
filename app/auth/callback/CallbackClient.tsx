// app/auth/callback/CallbackClient.tsx
"use client";

import React, { useMemo, useState } from "react";

/**
 * Build a deep link that forwards the Supabase callback payload into the app.
 * - If we have ?code=... (PKCE), pass it through
 * - Otherwise pass through the entire #access_token=... fragment (implicit flow)
 */
function buildDeepLink(scheme: string) {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const hash = window.location.hash || "";

  if (code) {
    return `${scheme}://auth/callback?code=${encodeURIComponent(code)}`;
  }

  return `${scheme}://auth/callback${hash}`;
}

export default function CallbackClient() {
  const [message] = useState("Tap below to finish signing in and open Shifted.");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const envOk = useMemo(() => !!supabaseUrl && !!supabaseAnonKey, [supabaseUrl, supabaseAnonKey]);

  const openHref =
    typeof window !== "undefined" ? buildDeepLink("shiftedclean") : "shiftedclean://auth/callback";

  // Detect whether this visit actually contains auth payload (email click)
  const hasPayload = useMemo(() => {
    if (typeof window === "undefined") return false;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const hash = window.location.hash || "";
    const hasHashTokens = hash.includes("access_token=") && hash.includes("refresh_token=");
    return !!code || hasHashTokens;
  }, []);

  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div style={{ maxWidth: 520, padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, marginBottom: 10 }}>Shifted</h1>

        {!envOk ? (
          <>
            <p style={{ opacity: 0.85 }}>
              Missing <code>NEXT_PUBLIC_SUPABASE_URL</code> or <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> on Vercel.
            </p>
            <p style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
              Add them in Vercel → Project → Settings → Environment Variables, then redeploy.
            </p>
          </>
        ) : (
          <>
            <p style={{ opacity: 0.85 }}>{message}</p>

            {!hasPayload && (
              <p style={{ marginTop: 12, opacity: 0.7, fontSize: 13 }}>
                Note: This page is normally opened from your confirmation email link. If you’re here manually,
                you won’t have tokens/code in the URL—and that’s okay.
              </p>
            )}

            <div style={{ marginTop: 18 }}>
              <a
                href={openHref}
                style={{
                  display: "inline-block",
                  padding: "12px 18px",
                  borderRadius: 999,
                  textDecoration: "none",
                  fontWeight: 700,
                  background: "#22C55E",
                  color: "#051014",
                }}
              >
                Open in Shifted
              </a>
            </div>

            <p style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
              If nothing happens, make sure the Shifted dev build is installed and your scheme is{" "}
              <code>shiftedclean</code>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// app/auth/callback/CallbackClient.tsx
"use client";

import React, { useMemo } from "react";

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

function hasAuthPayload(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const hash = window.location.hash || "";
  const hasHashTokens = hash.includes("access_token=") && hash.includes("refresh_token=");
  return !!code || hasHashTokens;
}

export default function CallbackClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const envOk = useMemo(() => !!supabaseUrl && !!supabaseAnonKey, [supabaseUrl, supabaseAnonKey]);

  const payloadPresent = useMemo(() => hasAuthPayload(), []);

  const openHref =
    typeof window !== "undefined" ? buildDeepLink("shiftedclean") : "shiftedclean://auth/callback";

  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div style={{ maxWidth: 520, padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, marginBottom: 10 }}>Shifted</h1>

        {!envOk ? (
          <>
            <p style={{ opacity: 0.85 }}>
              Missing <code>NEXT_PUBLIC_SUPABASE_URL</code> or{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> on Vercel.
            </p>
            <p style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
              Add them in Vercel → Project → Settings → Environment Variables, then redeploy.
            </p>
          </>
        ) : (
          <>
            {payloadPresent ? (
              <p style={{ opacity: 0.85 }}>Tap below to finish signing in and open Shifted.</p>
            ) : (
              <>
                <p style={{ opacity: 0.85 }}>This page is used during email confirmation.</p>
                <p style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
                  If you opened this manually, there won’t be any sign-in code/tokens in the URL — that’s normal.
                  Please use the link from your confirmation email.
                </p>
              </>
            )}

            <div style={{ marginTop: 18 }}>
              <a
                href={payloadPresent ? openHref : "#"}
                onClick={(e) => {
                  if (!payloadPresent) e.preventDefault();
                }}
                style={{
                  display: "inline-block",
                  padding: "12px 18px",
                  borderRadius: 999,
                  textDecoration: "none",
                  fontWeight: 700,
                  background: payloadPresent ? "#22C55E" : "#334155",
                  color: payloadPresent ? "#051014" : "#cbd5e1",
                  cursor: payloadPresent ? "pointer" : "not-allowed",
                }}
              >
                Open in Shifted
              </a>
            </div>

            {payloadPresent ? (
              <p style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
                If nothing happens, confirm the Shifted dev build is installed and your scheme is{" "}
                <code>shiftedclean</code>.
              </p>
            ) : (
              <p style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
                Tip: try signing up again and click the confirmation email link from your phone.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

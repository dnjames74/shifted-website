"use client";

import React, { useEffect, useMemo, useState } from "react";

function hasAuthPayloadInUrl(): boolean {
  if (typeof window === "undefined") return false;

  const u = new URL(window.location.href);
  const code = u.searchParams.get("code");
  const hash = window.location.hash || "";
  const hasHashTokens = hash.includes("access_token=") && hash.includes("refresh_token=");
  return !!code || hasHashTokens;
}

function buildSchemeAuthLink(scheme: string) {
  const url = new URL(window.location.href);

  // PKCE/code flow (kept for compatibility)
  const code = url.searchParams.get("code");
  if (code) {
    return `${scheme}://auth/callback?code=${encodeURIComponent(code)}`;
  }

  // Hash token flow from Supabase email confirmations:
  // https://.../auth/callback#access_token=...&refresh_token=...
  const hash = (window.location.hash || "").replace(/^#/, "");
  const params = new URLSearchParams(hash);

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  // Convert tokens to QUERY params (more reliable than keeping them in a fragment)
  if (access_token && refresh_token) {
    return `${scheme}://auth/callback?access_token=${encodeURIComponent(
      access_token
    )}&refresh_token=${encodeURIComponent(refresh_token)}`;
  }

  // Manual visit (no payload)
  return `${scheme}://auth/callback`;
}

export default function CallbackClient() {
  const [message, setMessage] = useState("Preparing…");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const envOk = useMemo(() => !!supabaseUrl && !!supabaseAnonKey, [supabaseUrl, supabaseAnonKey]);
  const hasPayload = useMemo(() => hasAuthPayloadInUrl(), []);

  const schemeAuthLink = useMemo(
    () =>
      typeof window !== "undefined"
        ? buildSchemeAuthLink("shiftedclean")
        : "shiftedclean://auth/callback",
    []
  );

  // Optional: Universal link for non-auth use cases (marketing / open app)
  const universalOpenUrl = "https://www.shifteddating.com/open?next=profile-setup";

  useEffect(() => {
    if (!envOk) return;

    if (hasPayload) {
      setMessage("Tap the button below to finish signing in.");
      return;
    }

    setMessage("This page is normally opened from your confirmation email link.");
  }, [envOk, hasPayload]);

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
            <p style={{ opacity: 0.85 }}>{message}</p>

            {hasPayload ? (
              <>
                <div style={{ marginTop: 18 }}>
                  {/* PRIMARY: Scheme link with tokens/code */}
                  <a
                    href={schemeAuthLink}
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
                    Finish sign-in and open Shifted
                  </a>
                </div>

                <p style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
                  Important: Don’t use Safari’s top “Open” radio button — it opens the app
                  without the sign-in tokens. Use the button above.
                </p>
              </>
            ) : (
              <>
                <div style={{ marginTop: 18 }}>
                  {/* For manual testing / marketing only */}
                  <a
                    href={universalOpenUrl}
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
                    Open Shifted
                  </a>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

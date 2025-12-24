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

function buildUniversalOpenUrl() {
  // Universal Link route inside your website domain
  // This should open the app (via associated domains) and route to /profile-setup.
  return "https://www.shifteddating.com/open?next=profile-setup";
}

function buildSchemeFallback(scheme: string) {
  // Keep scheme fallback for cases where universal link isn't configured on device.
  const url = new URL(window.location.href);

  const code = url.searchParams.get("code");
  if (code) return `${scheme}://auth/callback?code=${encodeURIComponent(code)}`;

  const hash = (window.location.hash || "").replace(/^#/, "");
  const params = new URLSearchParams(hash);

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (access_token && refresh_token) {
    return `${scheme}://auth/callback?access_token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(
      refresh_token
    )}`;
  }

  return `${scheme}://auth/callback`;
}

export default function CallbackClient() {
  const [message, setMessage] = useState("Preparing…");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const envOk = useMemo(() => !!supabaseUrl && !!supabaseAnonKey, [supabaseUrl, supabaseAnonKey]);
  const hasPayload = useMemo(() => hasAuthPayloadInUrl(), []);

  const openUrl = useMemo(() => buildUniversalOpenUrl(), []);
  const schemeFallback = useMemo(
    () => (typeof window !== "undefined" ? buildSchemeFallback("shiftedclean") : "shiftedclean://auth/callback"),
    []
  );

  useEffect(() => {
    if (!envOk) return;

    // If user arrived here from the email confirmation link, automatically try to open the app
    if (hasPayload) {
      setMessage("Opening Shifted…");

      // Give Safari a tick to paint, then redirect to Universal Link
      const t = setTimeout(() => {
        window.location.href = openUrl;
      }, 150);

      return () => clearTimeout(t);
    }

    setMessage("This page is normally opened from your confirmation email link.");
  }, [envOk, hasPayload, openUrl]);

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
            <p style={{ opacity: 0.85 }}>
              {hasPayload ? "Tap below if Shifted didn’t open automatically." : message}
            </p>

            <div style={{ marginTop: 18, display: "grid", gap: 10, justifyItems: "center" }}>
              {/* Primary: Universal Link */}
              <a
                href={openUrl}
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

              {/* Fallback: Custom Scheme */}
              <a
                href={schemeFallback}
                style={{
                  display: "inline-block",
                  padding: "10px 16px",
                  borderRadius: 999,
                  textDecoration: "none",
                  fontWeight: 700,
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "white",
                }}
              >
                If that didn’t work, try this
              </a>
            </div>

            <p style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
              Note: iOS sometimes opens the app without passing the URL. Universal Links are more reliable.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

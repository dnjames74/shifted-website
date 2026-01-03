"use client";

import React, { useEffect, useMemo, useState } from "react";

function buildOpenUrl(): string {
  const u = new URL(window.location.href);

  // PKCE/code flow
  const code = u.searchParams.get("code");
  if (code) {
    return `https://www.shifteddating.com/open?next=profile-setup&code=${encodeURIComponent(code)}`;
  }

  // Hash token flow (common for Supabase email confirmations)
  const hash = (window.location.hash || "").replace(/^#/, "");
  const params = new URLSearchParams(hash);

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (access_token && refresh_token) {
    return `https://www.shifteddating.com/open?next=profile-setup&access_token=${encodeURIComponent(
      access_token
    )}&refresh_token=${encodeURIComponent(refresh_token)}`;
  }

  // Manual visit (no payload)
  return `https://www.shifteddating.com/open?next=profile-setup`;
}

function hasAuthPayload(): boolean {
  const u = new URL(window.location.href);
  const code = u.searchParams.get("code");
  const hash = window.location.hash || "";
  return !!code || (hash.includes("access_token=") && hash.includes("refresh_token="));
}

export default function CallbackClient() {
  const [message, setMessage] = useState("Preparing…");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const envOk = useMemo(() => !!supabaseUrl && !!supabaseAnonKey, [supabaseUrl, supabaseAnonKey]);

  const openUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://www.shifteddating.com/open?next=profile-setup";
    return buildOpenUrl();
  }, []);

  const hasPayload = useMemo(() => {
    if (typeof window === "undefined") return false;
    return hasAuthPayload();
  }, []);

  useEffect(() => {
    if (!envOk) return;

    // If user came from email confirmation, try auto-forward to /open with tokens
    if (hasPayload) {
      setMessage("Opening Shifted…");
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
            <p style={{ opacity: 0.85 }}>{hasPayload ? "Tap below if Shifted didn’t open automatically." : message}</p>

            <div style={{ marginTop: 18 }}>
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
            </div>

            <p style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
              If iOS opens the app but the app can’t read the link, go back to Safari and tap the button again.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

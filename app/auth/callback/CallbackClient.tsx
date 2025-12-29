"use client";

import React, { useEffect, useMemo, useState } from "react";

function extractHashTokens() {
  const hash = (typeof window !== "undefined" ? window.location.hash : "").replace(/^#/, "");
  const params = new URLSearchParams(hash);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    error: params.get("error"),
    error_description: params.get("error_description"),
  };
}

function hasCodeParam() {
  if (typeof window === "undefined") return false;
  const u = new URL(window.location.href);
  return !!u.searchParams.get("code");
}

function buildOpenUrl(next: string, access_token?: string | null, refresh_token?: string | null) {
  const u = new URL("https://www.shifteddating.com/open");
  u.searchParams.set("next", next);

  if (access_token) u.searchParams.set("access_token", access_token);
  if (refresh_token) u.searchParams.set("refresh_token", refresh_token);

  return u.toString();
}

export default function CallbackClient() {
  const [message, setMessage] = useState("Preparing…");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const envOk = useMemo(() => !!supabaseUrl && !!supabaseAnonKey, [supabaseUrl, supabaseAnonKey]);

  const openFallback = useMemo(() => buildOpenUrl("profile-setup"), []);

  useEffect(() => {
    if (!envOk) return;

    const { access_token, refresh_token, error, error_description } = extractHashTokens();

    // If Supabase sent an error in the hash, show it instead of trying to open the app
    if (error) {
      setMessage(decodeURIComponent(error_description || "Email link error."));
      return;
    }

    // If you ever switch to PKCE (?code=...), we can handle that later.
    if (hasCodeParam()) {
      setMessage("This link used a code flow. Please try again from the newest email link.");
      return;
    }

    // If tokens exist, redirect to /open with tokens so the app can set the session.
    if (access_token && refresh_token) {
      setMessage("Opening Shifted…");

      const target = buildOpenUrl("profile-setup", access_token, refresh_token);

      const t = setTimeout(() => {
        window.location.href = target;
      }, 150);

      return () => clearTimeout(t);
    }

    setMessage("Tap below to open Shifted.");
  }, [envOk]);

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

            <div style={{ marginTop: 18 }}>
              <a
                href={openFallback}
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
              If it opens the app but you’re not signed in, we’ll pass tokens through this page automatically.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

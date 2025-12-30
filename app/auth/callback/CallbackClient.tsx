"use client";

import React, { useEffect, useState } from "react";

function safeGetHref() {
  if (typeof window === "undefined") return null;
  return window.location.href;
}

function hasAuthPayloadInHref(href: string): boolean {
  const u = new URL(href);
  const code = u.searchParams.get("code");
  const hash = u.hash || "";
  const hasHashTokens = hash.includes("access_token=") && hash.includes("refresh_token=");
  return !!code || hasHashTokens;
}

function buildUniversalOpenUrlFromHref(href: string) {
  const url = new URL(href);

  // PKCE / code flow
  const code = url.searchParams.get("code");
  if (code) {
    return `https://www.shifteddating.com/open?next=profile-setup&code=${encodeURIComponent(code)}`;
  }

  // Hash token flow
  const hash = (url.hash || "").replace(/^#/, "");
  const params = new URLSearchParams(hash);

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (access_token && refresh_token) {
    return `https://www.shifteddating.com/open?next=profile-setup&access_token=${encodeURIComponent(
      access_token
    )}&refresh_token=${encodeURIComponent(refresh_token)}`;
  }

  // Manual visit (no payload)
  return "https://www.shifteddating.com/open?next=profile-setup";
}

export default function CallbackClient() {
  const [message, setMessage] = useState("Preparing…");
  const [openUrl, setOpenUrl] = useState("https://www.shifteddating.com/open?next=profile-setup");
  const [hasPayload, setHasPayload] = useState(false);

  const envOk =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (!envOk) return;

    const href = safeGetHref();
    if (!href) return;

    const payload = hasAuthPayloadInHref(href);
    setHasPayload(payload);

    const url = buildUniversalOpenUrlFromHref(href);
    setOpenUrl(url);

    if (payload) {
      setMessage("Opening Shifted…");
      const t = setTimeout(() => {
        window.location.href = url;
      }, 150);
      return () => clearTimeout(t);
    }

    setMessage("This page is normally opened from your confirmation email link.");
  }, [envOk]);

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
            <p style={{ opacity: 0.85 }}>
              {hasPayload ? "Tap below if Shifted didn’t open automatically." : message}
            </p>

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
              Universal Links are more reliable on iOS than custom scheme redirects.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

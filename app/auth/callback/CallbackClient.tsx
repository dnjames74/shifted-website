// app/auth/callback/CallbackClient.tsx
"use client";

import React, { useMemo } from "react";

/**
 * Detect whether this visit includes an auth payload.
 * Supabase may send either:
 * - ?code=... (PKCE)
 * - #access_token=...&refresh_token=... (implicit)
 * - or an error in the hash: #error=...&error_description=...
 */
function getAuthStateFromUrl() {
  if (typeof window === "undefined") {
    return { hasPayload: false, hasError: false, errorText: "" };
  }

  const u = new URL(window.location.href);
  const code = u.searchParams.get("code");

  const hash = (window.location.hash || "").replace(/^#/, "");
  const hashParams = new URLSearchParams(hash);

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  const error = hashParams.get("error");
  const errorDesc = hashParams.get("error_description");

  const hasTokens = !!accessToken && !!refreshToken;
  const hasPayload = !!code || hasTokens;

  const hasError = !!error || !!errorDesc;
  const errorText = [error, errorDesc].filter(Boolean).join(": ");

  return { hasPayload, hasError, errorText };
}

/**
 * Universal Link route inside your website domain.
 * This is what iOS should use to open the app reliably.
 */
function buildUniversalOpenUrl() {
  return "https://www.shifteddating.com/open?next=profile-setup";
}

/**
 * Scheme fallback (in case Universal Links aren't working on device).
 * IMPORTANT: This does not "verify" anything — it only forwards payload
 * so the app can finish auth.
 */
function buildSchemeFallback(scheme: string) {
  const url = new URL(window.location.href);

  // PKCE/code flow
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

  // Convert to query params for reliability
  if (access_token && refresh_token) {
    return `${scheme}://auth/callback?access_token=${encodeURIComponent(
      access_token
    )}&refresh_token=${encodeURIComponent(refresh_token)}`;
  }

  // No payload present (manual visit)
  return `${scheme}://auth/callback`;
}

export default function CallbackClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const envOk = useMemo(() => !!supabaseUrl && !!supabaseAnonKey, [supabaseUrl, supabaseAnonKey]);

  const { hasPayload, hasError, errorText } = useMemo(() => getAuthStateFromUrl(), []);

  const openUrl = useMemo(() => buildUniversalOpenUrl(), []);
  const schemeFallback = useMemo(
    () =>
      typeof window !== "undefined"
        ? buildSchemeFallback("shiftedclean")
        : "shiftedclean://auth/callback",
    []
  );

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
            {hasError ? (
              <>
                <p style={{ opacity: 0.9 }}>
                  This confirmation link isn’t valid anymore.
                </p>
                <p style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
                  {errorText || "Please request a new confirmation email and try again."}
                </p>
                <p style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
                  Go back to the app and sign up again to get a fresh link.
                </p>
              </>
            ) : (
              <>
                <p style={{ opacity: 0.85 }}>
                  {hasPayload
                    ? "Tap below to finish signing in and open Shifted."
                    : "This page is normally opened from your confirmation email link."}
                </p>

                {!hasPayload && (
                  <p style={{ marginTop: 12, opacity: 0.7, fontSize: 13 }}>
                    If you typed this URL manually, it won’t include any auth payload — that’s normal.
                  </p>
                )}

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
          </>
        )}
      </div>
    </div>
  );
}

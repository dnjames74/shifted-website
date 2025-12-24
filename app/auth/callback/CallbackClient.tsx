// app/auth/callback/CallbackClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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
    // Keep it simple: forward only the code
    return `${scheme}://auth/callback?code=${encodeURIComponent(code)}`;
  }

  // Forward the entire hash as-is (includes access_token + refresh_token)
  return `${scheme}://auth/callback${hash}`;
}

export default function CallbackClient() {
  const [status, setStatus] = useState<"working" | "success" | "error">("working");
  const [message, setMessage] = useState("Signing you in…");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // We don't *need* to create a Supabase client here anymore to set a session.
  // But we keep this check so the page can give a clear error if env vars are missing.
  const envOk = useMemo(() => !!supabaseUrl && !!supabaseAnonKey, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!envOk) {
          throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel."
          );
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hasHashTokens =
          typeof window !== "undefined" &&
          (window.location.hash || "").includes("access_token=") &&
          (window.location.hash || "").includes("refresh_token=");

        // If neither code nor tokens are present, we can't proceed.
        if (!code && !hasHashTokens) {
          throw new Error("No auth code or tokens found in the callback URL.");
        }

        if (cancelled) return;

        setStatus("success");
        setMessage("Signed in. Opening the app…");

        const deepLink = buildDeepLink("shiftedclean");

        // Give Safari a moment to paint the success state
        setTimeout(() => {
          window.location.href = deepLink;
        }, 250);

        // Fallback helper text if deep link didn’t open
        setTimeout(() => {
          if (!cancelled) {
            setMessage("If the app didn’t open automatically, tap “Open in Shifted” below.");
          }
        }, 3500);
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setMessage(e?.message ?? "Sign-in failed.");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [envOk]);

  const openHref =
    typeof window !== "undefined" ? buildDeepLink("shiftedclean") : "shiftedclean://auth/callback";

  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div style={{ maxWidth: 520, padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, marginBottom: 10 }}>Shifted</h1>
        <p style={{ opacity: 0.85 }}>{message}</p>

        {status !== "working" && (
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
        )}

        {status === "error" && (
          <p style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
            Tip: confirm Supabase redirect URLs include{" "}
            <code>https://www.shifteddating.com/auth/callback</code> and your Vercel env vars use{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> / <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function parseHashParams(hash: string) {
  // hash looks like: "#access_token=...&refresh_token=...&token_type=bearer&expires_in=..."
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    token_type: params.get("token_type"),
    expires_in: params.get("expires_in"),
    type: params.get("type"), // sometimes present
  };
}

export default function CallbackClient() {
  const [status, setStatus] = useState<
    "working" | "success" | "error"
  >("working");
  const [message, setMessage] = useState<string>("Signing you in…");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!supabase) {
          throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel."
          );
        }

        // Case A: PKCE/code flow
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          setMessage("Finishing sign-in…");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // Case B: Hash fragment token flow (your current case)
          const { access_token, refresh_token } = parseHashParams(
            window.location.hash || ""
          );

          if (access_token && refresh_token) {
            setMessage("Finishing sign-in…");
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) throw error;
          } else {
            // Nothing to process
            throw new Error(
              "No auth code or tokens found in the callback URL."
            );
          }
        }

        if (cancelled) return;

        setStatus("success");
        setMessage("Signed in. Opening the app…");

        // Deep link back into the app
        const deepLink = "shiftedclean://auth/callback";

        // Give Safari a moment to paint the success state
        setTimeout(() => {
          window.location.href = deepLink;
        }, 250);

        // Optional: fallback if deep link fails (keeps user from being stuck)
        setTimeout(() => {
          // If still on the page after a few seconds, show a helpful message
          if (!cancelled) {
            setMessage(
              "If the app didn’t open automatically, tap “Open in Shifted” below."
            );
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
  }, [supabase]);

  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div style={{ maxWidth: 520, padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, marginBottom: 10 }}>Shifted</h1>
        <p style={{ opacity: 0.85 }}>{message}</p>

        {status !== "working" && (
          <div style={{ marginTop: 18 }}>
            <a
              href="shiftedclean://auth/callback"
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
            Tip: confirm your Supabase redirect URLs include{" "}
            <code>/auth/callback</code> for both www and non-www, and that Vercel
            has the correct NEXT_PUBLIC_SUPABASE_* env vars.
          </p>
        )}
      </div>
    </div>
  );
}

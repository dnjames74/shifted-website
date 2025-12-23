// app/auth/callback/CallbackClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function buildDeepLink(scheme: string) {
  // Forward whatever Supabase gave us (either ?code=... OR #access_token=...)
  const search = window.location.search || "";
  const hash = window.location.hash || "";

  // Prefer code flow if present (cleaner). Otherwise use hash flow.
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");

  if (code) {
    return `${scheme}://auth/callback?code=${encodeURIComponent(code)}`;
  }

  // Hash may already include access_token/refresh_token
  return `${scheme}://auth/callback${hash}`;
}

function parseHashParams(hash: string) {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
  };
}

export default function CallbackClient() {
  const [status, setStatus] = useState<"working" | "success" | "error">("working");
  const [message, setMessage] = useState("Signing you in…");

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
          throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel.");
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // We *can* set the session in the browser, but the key thing is:
        // we MUST forward the payload into the app deep link so the app can finish too.
        if (code) {
          setMessage("Finishing sign-in…");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const { access_token, refresh_token } = parseHashParams(window.location.hash || "");

          if (access_token && refresh_token) {
            setMessage("Finishing sign-in…");
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
          } else {
            throw new Error("No auth code or tokens found in the callback URL.");
          }
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
  }, [supabase]);

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

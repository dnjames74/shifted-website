// app/auth/callback/CallbackClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getTokensFromHash(hash: string) {
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
  const [openHref, setOpenHref] = useState<string>("shiftedclean://auth/callback");

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

        let access_token: string | null = null;
        let refresh_token: string | null = null;

        if (code) {
          setMessage("Finishing sign-in…");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          access_token = data?.session?.access_token ?? null;
          refresh_token = data?.session?.refresh_token ?? null;

          if (!access_token || !refresh_token) {
            throw new Error("Could not retrieve session tokens after code exchange.");
          }
        } else {
          // fallback if supabase ever uses implicit fragment flow
          const parsed = getTokensFromHash(window.location.hash || "");
          access_token = parsed.access_token;
          refresh_token = parsed.refresh_token;

          if (!access_token || !refresh_token) {
            throw new Error("No auth code or tokens found in the callback URL.");
          }
        }

        if (cancelled) return;

        // ✅ IMPORTANT: tokens in QUERY (more reliable than #fragment on iOS)
        const deepLink =
          `shiftedclean://auth/callback` +
          `?access_token=${encodeURIComponent(access_token)}` +
          `&refresh_token=${encodeURIComponent(refresh_token)}`;

        setOpenHref(deepLink);
        setStatus("success");
        setMessage("Signed in. Opening the app…");

        setTimeout(() => {
          window.location.href = deepLink;
        }, 250);

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
      </div>
    </div>
  );
}

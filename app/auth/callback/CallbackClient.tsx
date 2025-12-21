"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  const v = process.env[name];
  return typeof v === "string" ? v : "";
}

export default function CallbackClient() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Finishing sign-in…");

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnon = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnon) return null;
    return createClient(supabaseUrl, supabaseAnon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }, [supabaseUrl, supabaseAnon]);

  useEffect(() => {
    const run = async () => {
      try {
        // Supabase may return either code (PKCE) or tokens
        const code = params.get("code");
        const errorDesc = params.get("error_description") || params.get("error");

        if (errorDesc) {
          setMessage(`Sign-in error: ${errorDesc}`);
          return;
        }

        if (!supabase) {
          setMessage("Missing Supabase env vars on the website (Vercel).");
          return;
        }

        if (code) {
          setMessage("Exchanging code…");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMessage(`Could not exchange code: ${error.message}`);
            return;
          }
        } else {
          // If there is no code, still allow redirect (some flows just want to bounce)
          setMessage("Redirecting…");
        }

        // IMPORTANT: send user back to the app
        // Use your app scheme:
        const appUrl = "shiftedclean://auth/callback";

        // If you want to pass the code through to the app, do this instead:
        // const appUrl = code ? `shiftedclean://auth/callback?code=${encodeURIComponent(code)}` : "shiftedclean://auth/callback";

        window.location.href = appUrl;
      } catch (e: any) {
        setMessage(e?.message ?? "Something went wrong.");
      }
    };

    run();
  }, [params, supabase]);

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.spinner} />
        <h1 style={styles.title}>Signing you in…</h1>
        <p style={styles.text}>{message}</p>

        <p style={{ ...styles.text, marginTop: 14 }}>
          If nothing happens, open the app and try again.
        </p>
      </div>

      <style>{`
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
      `}</style>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#000",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    border: "1px solid #222",
    background: "#0b0f1a",
    padding: 20,
    color: "#fff",
    textAlign: "center",
  },
  title: { margin: "12px 0 6px", fontSize: 20, fontWeight: 800 },
  text: { margin: 0, color: "#a3a3a3", fontSize: 14, lineHeight: 1.4 },
  spinner: {
    width: 22,
    height: 22,
    borderRadius: 999,
    border: "3px solid #1DB95433",
    borderTopColor: "#1DB954",
    margin: "0 auto",
    animation: "spin 1s linear infinite",
  },
};

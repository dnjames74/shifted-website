// app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

function parseAllParams(href: string) {
  const url = new URL(href);

  const query = new URLSearchParams(url.searchParams);
  const hashRaw = (url.hash || "").replace(/^#/, "");
  const hash = new URLSearchParams(hashRaw);

  // Merge hash into query-like access
  const get = (k: string) => query.get(k) ?? hash.get(k);

  // Collect keys for debugging
  const queryKeys: string[] = [];
  query.forEach((_, k) => queryKeys.push(k));

  const hashKeys: string[] = [];
  hash.forEach((_, k) => hashKeys.push(k));

  return {
    query,
    hash,
    queryKeys,
    hashKeys,
    rawHash: hashRaw,
    // common fields
    type: get("type"),
    app: get("app"),
    error: get("error"),
    error_description: get("error_description"),
    access_token: get("access_token"),
    refresh_token:
      get("refresh_token") ??
      get("refreshToken") ??
      get("refresh") ??
      get("rt"),
    code: get("code"),
  };
}

export default function AuthCallbackBridgePage() {
  const [msg, setMsg] = useState("Almost there…");
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (typeof window === "undefined") return;

        // Give Safari a moment to populate location.hash reliably
        await new Promise((r) => setTimeout(r, 150));

        const p = parseAllParams(window.location.href);

        // Keep app/type parameters from query
        const app = p.app || "prod";
        const typeQ = p.type || "recovery";

        // Console diagnostics (view in Safari devtools if needed)
        console.log("[auth/callback] query keys:", p.queryKeys);
        console.log("[auth/callback] hash keys:", p.hashKeys);
        console.log("[auth/callback] raw hash len:", p.rawHash.length);
        console.log("[auth/callback] token lens:", {
          accessLen: p.access_token?.length ?? 0,
          refreshLen: p.refresh_token?.length ?? 0,
          codeLen: p.code?.length ?? 0,
        });

        if (p.error) {
          setMsg("Couldn’t open the reset link.");
          setDetails(p.error_description ?? p.error);
          return;
        }

        // Preferred: tokens present
        if (p.access_token && p.refresh_token) {
          setMsg("Securing your reset link…");

          const res = await fetch("/api/recovery-bridge", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              access_token: p.access_token,
              refresh_token: p.refresh_token,
            }),
          });

          const json = await res.json().catch(() => ({} as any));
          if (!res.ok || !json?.rid) {
            setMsg("Couldn’t prepare password reset.");
            setDetails(json?.error ?? "Server error");
            return;
          }

          const rid = json.rid as string;

          const openUrl = `https://www.shifteddating.com/open?type=${encodeURIComponent(
            typeQ
          )}&app=${encodeURIComponent(app)}&rid=${encodeURIComponent(rid)}`;

          setMsg("Opening Shifted…");
          window.location.replace(openUrl);
          return;
        }

        // Fallback: code flow (if Supabase provides it)
        if (p.code) {
          setMsg("Opening Shifted…");
          const openUrl = `https://www.shifteddating.com/open?type=${encodeURIComponent(
            typeQ
          )}&app=${encodeURIComponent(app)}&code=${encodeURIComponent(p.code)}`;
          window.location.replace(openUrl);
          return;
        }

        setMsg("Missing tokens in reset link.");
        setDetails(
          "We didn’t receive a refresh token. Please go back to the email and tap the reset link again (in Safari)."
        );
      } catch (e: any) {
        if (cancelled) return;
        setMsg("Couldn’t prepare password reset.");
        setDetails(e?.message ?? "Please try again.");
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>{msg}</h2>
      {details ? <p style={{ marginTop: 8 }}>{details}</p> : null}
      <p style={{ marginTop: 12, opacity: 0.8 }}>
        If iOS shows an “Open” banner at the top, tap it.
      </p>
    </main>
  );
}
// app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

function parse(href: string) {
  const url = new URL(href);

  const query = new URLSearchParams(url.searchParams);
  const rawHash = (url.hash || "").replace(/^#/, "");
  const hash = new URLSearchParams(rawHash);

  const q = (k: string) => query.get(k);
  const h = (k: string) => hash.get(k);

  // ✅ Tokens come from HASH in Supabase implicit flow.
  const access_token = h("access_token") ?? q("access_token");
  const refresh_token = h("refresh_token") ?? q("refresh_token");

  // ✅ Other fields can come from either
  const type = q("type") ?? h("type") ?? "recovery";
  const app = q("app") ?? h("app") ?? "prod";

  const code = q("code") ?? h("code");
  const error = q("error") ?? h("error");
  const error_description = q("error_description") ?? h("error_description");

  const queryKeys: string[] = [];
  query.forEach((_, k) => queryKeys.push(k));

  const hashKeys: string[] = [];
  hash.forEach((_, k) => hashKeys.push(k));

  return {
    type,
    app,
    code,
    error,
    error_description,

    // tokens
    access_token,
    refresh_token,

    // debugging
    queryKeys,
    hashKeys,
    rawHashLen: rawHash.length,
    hashAccessLen: h("access_token")?.length ?? 0,
    hashRefreshLen: h("refresh_token")?.length ?? 0,
    queryAccessLen: q("access_token")?.length ?? 0,
    queryRefreshLen: q("refresh_token")?.length ?? 0,
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

        // Give Safari a moment to populate hash reliably
        await new Promise((r) => setTimeout(r, 150));

        const p = parse(window.location.href);

        // Helpful diagnostics (viewable in Safari devtools)
        console.log("[auth/callback] query keys:", p.queryKeys);
        console.log("[auth/callback] hash keys:", p.hashKeys);
        console.log("[auth/callback] rawHashLen:", p.rawHashLen);
        console.log("[auth/callback] lens:", {
          hashAccess: p.hashAccessLen,
          hashRefresh: p.hashRefreshLen,
          queryAccess: p.queryAccessLen,
          queryRefresh: p.queryRefreshLen,
          chosenAccess: p.access_token?.length ?? 0,
          chosenRefresh: p.refresh_token?.length ?? 0,
          codeLen: p.code?.length ?? 0,
        });

        if (p.error) {
          setMsg("Couldn’t open the reset link.");
          setDetails(p.error_description ?? p.error);
          return;
        }

        // ✅ If token pair exists, validate before storing
        if (p.access_token && p.refresh_token) {
          const refreshLen = p.refresh_token.length;

          // Supabase refresh tokens should NOT be ~12 chars.
          // Fail fast so we don’t store garbage and hang the app.
          if (refreshLen < 40) {
            // If Supabase provided a code, use that instead.
            if (p.code) {
              const openUrl = `https://www.shifteddating.com/open?type=${encodeURIComponent(
                p.type,
              )}&app=${encodeURIComponent(p.app)}&code=${encodeURIComponent(
                p.code,
              )}`;

              setMsg("Opening Shifted…");
              window.location.replace(openUrl);
              return;
            }

            setMsg("Reset link missing a valid refresh token.");
            setDetails(
              `Got refresh_token length ${refreshLen}. Please request a new reset email and try again in Safari.`,
            );
            return;
          }

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
            p.type,
          )}&app=${encodeURIComponent(p.app)}&rid=${encodeURIComponent(rid)}`;

          setMsg("Opening Shifted…");
          window.location.replace(openUrl);
          return;
        }

        // ✅ Code fallback (PKCE)
        if (p.code) {
          const openUrl = `https://www.shifteddating.com/open?type=${encodeURIComponent(
            p.type,
          )}&app=${encodeURIComponent(p.app)}&code=${encodeURIComponent(p.code)}`;

          setMsg("Opening Shifted…");
          window.location.replace(openUrl);
          return;
        }

        setMsg("Missing tokens in reset link.");
        setDetails(
          "Please go back to the email and tap the reset link again (in Safari).",
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
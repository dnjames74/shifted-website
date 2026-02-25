// shifted-website: app/reset-password/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default function WebResetPasswordPage() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, anon, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: true,
      },
    });
  }, []);

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<
    "checking" | "ready" | "saving" | "done" | "error"
  >("checking");
  const [msg, setMsg] = useState("Preparing secure reset…");

  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await new Promise((r) => setTimeout(r, 80));
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!data?.session) {
          setStatus("error");
          setMsg(
            "Reset link is missing a valid session. Please request a new reset email and open it in your browser.",
          );
          setReady(false);
          return;
        }

        if (!cancelled) {
          setStatus("ready");
          setReady(true);
          setMsg("Choose a new password");
        }
      } catch (e: any) {
        setStatus("error");
        setMsg(
          e?.message ??
            "Could not read reset session. Please request a new reset email and try again.",
        );
        setReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const redirectToApp = () => {
    window.location.href = "https://www.shifteddating.com/open?next=discover";
  };

  const onSubmit = async () => {
    const a = pw.trim();
    const b = confirm.trim();

    if (!a || !b) return alert("Please fill in both password fields.");
    if (a.length < 8) return alert("Use at least 8 characters.");
    if (a !== b) return alert("Passwords don’t match.");

    try {
      setStatus("saving");

      const { error } = await supabase.auth.updateUser({ password: a });
      if (error) throw error;

      setStatus("done");
      setMsg("Password updated ✅");

      setTimeout(() => {
        redirectToApp();
      }, 600);
    } catch (e: any) {
      alert(e?.message ?? "Could not update password. Try again.");
      setStatus("ready");
    }
  };

  const isSaving = status === "saving";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(0,255,136,0.10), transparent 60%)," +
          "radial-gradient(1000px 600px at 80% 0%, rgba(0,255,136,0.06), transparent 55%)," +
          "#05070A",
        color: "white",
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(11,22,32,0.92)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          padding: 18,
        }}
      >
        {/* Header (logo no longer squished) */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src="/logo.png"
            alt="Shifted"
            style={{
              height: 36, // ✅ fixed height
              width: "auto", // ✅ preserves aspect ratio (no squish)
              display: "block",
            }}
          />

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: 0.2,
                lineHeight: 1.15,
              }}
            >
              Shifted
            </div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.70)",
                lineHeight: 1.15,
                marginTop: 2,
              }}
            >
              Password reset
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ marginTop: 16 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{msg}</h2>

          {!ready ? (
            <p style={{ marginTop: 10, color: "rgba(255,255,255,0.70)" }}>
              If you’re stuck here, request a new reset email and open it in
              your browser.
            </p>
          ) : (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>
                  New password
                </span>
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Enter a new password"
                  style={{
                    width: "100%",
                    padding: "12px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(15,23,42,0.9)",
                    color: "white",
                    outline: "none",
                    fontSize: 15,
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>
                  Confirm new password
                </span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Type it again"
                  style={{
                    width: "100%",
                    padding: "12px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(15,23,42,0.9)",
                    color: "white",
                    outline: "none",
                    fontSize: 15,
                  }}
                />
              </label>

              <button
                onClick={onSubmit}
                disabled={isSaving}
                style={{
                  marginTop: 4,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,255,136,0.35)",
                  background: isSaving
                    ? "rgba(0,255,136,0.55)"
                    : "rgba(0,255,136,0.95)",
                  color: "#051014",
                  fontWeight: 900,
                  fontSize: 15,
                  cursor: isSaving ? "default" : "pointer",
                  opacity: isSaving ? 0.9 : 1,
                }}
              >
                {isSaving ? "Saving…" : "Save new password"}
              </button>

              <div style={{ marginTop: 6 }}>
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 13,
                  }}
                >
                  After saving, we’ll open the app. If your browser blocks
                  auto-opening, tap below.
                </p>

                <button
                  onClick={redirectToApp}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "transparent",
                    color: "white",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Open Shifted
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer (generic note) */}
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.55)",
            fontSize: 12,
          }}
        >
          If your browser blocks auto-opening, use the “Open Shifted” button.
        </div>
      </div>
    </main>
  );
}
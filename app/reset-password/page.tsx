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
        detectSessionInUrl: true, // ✅ reads tokens from URL fragment
      },
    });
  }, []);

  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("Preparing secure reset…");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Give Supabase a tick to parse URL fragment
        await new Promise((r) => setTimeout(r, 50));

        const { data, error } = await supabase.auth.getSession();
        const has = !!data?.session;

        if (error) throw error;

        if (!has) {
          setMsg(
            "Reset link is missing a valid session. Please request a new reset email and try again in Safari.",
          );
          setReady(false);
          return;
        }

        if (!cancelled) {
          setReady(true);
          setMsg("Choose a new password");
        }
      } catch (e: any) {
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

  const onSubmit = async () => {
    const a = pw.trim();
    const b = confirm.trim();

    if (!a || !b) return alert("Please fill in both password fields.");
    if (a.length < 8) return alert("Use at least 8 characters.");
    if (a !== b) return alert("Passwords don’t match.");

    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({ password: a });
      if (error) throw error;

      setMsg("Password updated ✅");
      alert("Password updated. Return to the Shifted app and sign in.");
    } catch (e: any) {
      alert(e?.message ?? "Could not update password. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 520 }}>
      <h2>{msg}</h2>

      {!ready ? (
        <p style={{ marginTop: 12, color: "#555" }}>
          If you’re stuck here, request a new reset email and open it in Safari.
        </p>
      ) : (
        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <label>
            <div style={{ fontSize: 13, marginBottom: 6 }}>New password</div>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              placeholder="Enter a new password"
            />
          </label>

          <label>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              Confirm new password
            </div>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              placeholder="Type it again"
            />
          </label>

          <button
            onClick={onSubmit}
            disabled={saving}
            style={{
              marginTop: 8,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #111",
              fontWeight: 700,
              cursor: "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save new password"}
          </button>

          <p style={{ marginTop: 10, color: "#555" }}>
            After saving, return to the Shifted app and sign in with the new password.
          </p>
        </div>
      )}
    </main>
  );
}
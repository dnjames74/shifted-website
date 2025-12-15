"use client";

import { useEffect, useMemo, useState } from "react";

const CITIES = ["Toronto", "Vancouver", "Calgary", "Edmonton", "Montreal", "Ottawa", "Other"] as const;

type UtmKey = "utm_source" | "utm_medium" | "utm_campaign" | "utm_term" | "utm_content";
const UTM_KEYS: UtmKey[] = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

function readUtmParams(): Partial<Record<UtmKey, string>> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const out: Partial<Record<UtmKey, string>> = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) out[k] = v;
  }
  return out;
}

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [isShift, setIsShift] = useState(true);

  // Honeypot (hidden). Humans never fill this.
  const [company, setCompany] = useState("");

  const [referrer, setReferrer] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const utms = useMemo(() => readUtmParams(), []);

  useEffect(() => {
    // document.referrer is empty on direct visits; that’s fine.
    if (typeof document !== "undefined") {
      const r = (document.referrer || "").trim();
      setReferrer(r ? r : null);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    // Client-side guard (server still validates)
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setStatus({ ok: false, msg: "Enter a valid email." });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          city: city || null,
          is_shift_worker: isShift,
          source: "landing",
          referrer,
          company, // honeypot
          ...utms,
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setStatus({ ok: false, msg: data?.error || "Something went wrong." });
        return;
      }

      if (data?.already) {
        setStatus({ ok: true, msg: "You’re already on the list — we’ll email you when we open." });
        return;
      }

      setStatus({ ok: true, msg: "You're on the list. We'll email you when we open." });
      setEmail("");
      setCity("");
      // keep isShift as-is (your call)
    } catch {
      setStatus({ ok: false, msg: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
      {/* Honeypot */}
      <div style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Company
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            autoComplete="off"
            tabIndex={-1}
          />
        </label>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          inputMode="email"
          autoComplete="email"
          required
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            outline: "none",
          }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              outline: "none",
            }}
          >
            <option value="">City (optional)</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 14px",
              borderRadius: 999,
              border: "none",
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              background: "#00ff88",
              color: "#051014",
            }}
          >
            {loading ? "Joining..." : "Join the waitlist"}
          </button>
        </div>

        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          <input type="checkbox" checked={isShift} onChange={(e) => setIsShift(e.target.checked)} />
          I work shifts (or keep a non-9-to-5 schedule)
        </label>

        {status && <div style={{ color: status.ok ? "#00ff88" : "#ff6b6b", fontSize: 13 }}>{status.msg}</div>}
      </div>
    </form>
  );
}

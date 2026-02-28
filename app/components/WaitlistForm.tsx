"use client";

import { useEffect, useMemo, useState } from "react";

const CITIES = [
  "Toronto",
  "Vancouver",
  "Calgary",
  "Edmonton",
  "Montreal",
  "Ottawa",
  "Other",
] as const;

type UtmKey =
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_term"
  | "utm_content";
const UTM_KEYS: UtmKey[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
];

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

function readCohort(): { cohort: string | null; cityHint: string | null } {
  if (typeof window === "undefined") return { cohort: null, cityHint: null };
  const params = new URLSearchParams(window.location.search);

  const cohort = (params.get("cohort") || "").trim().toLowerCase() || null;

  // Allow /?city=toronto or /?city=Toronto
  const rawCity = (params.get("city") || "").trim();
  const cityHint = rawCity ? rawCity : null;

  return { cohort, cityHint };
}

function normalizeCity(input: string | null): string | "" {
  if (!input) return "";
  const s = input.trim().toLowerCase();
  if (s === "toronto" || s === "gta") return "Toronto";
  if (s === "vancouver") return "Vancouver";
  if (s === "calgary") return "Calgary";
  if (s === "edmonton") return "Edmonton";
  if (s === "montreal" || s === "montréal") return "Montreal";
  if (s === "ottawa") return "Ottawa";
  if (s === "other") return "Other";
  return "";
}

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [isShift, setIsShift] = useState(true);

  // Honeypot (hidden). Humans never fill this.
  const [company, setCompany] = useState("");

  const [referrer, setReferrer] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  const utms = useMemo(() => readUtmParams(), []);
  const cohortInfo = useMemo(() => readCohort(), []);

  // ✅ Toronto seeding mode if URL contains ?cohort=toronto or ?city=toronto
  const isTorontoCohort = useMemo(() => {
    const c = cohortInfo.cohort;
    const cityFromQuery = normalizeCity(cohortInfo.cityHint);
    return c === "toronto" || cityFromQuery === "Toronto";
  }, [cohortInfo]);

  useEffect(() => {
    // document.referrer is empty on direct visits; that’s fine.
    if (typeof document !== "undefined") {
      const r = (document.referrer || "").trim();
      setReferrer(r ? r : null);
    }
  }, []);

  useEffect(() => {
    // ✅ Auto-select Toronto if we’re in Toronto cohort mode
    if (typeof window === "undefined") return;

    if (isTorontoCohort && !city) {
      setCity("Toronto");
      return;
    }

    // If user came with ?city=<something>, try to map it to our dropdown
    if (!city) {
      const normalized = normalizeCity(cohortInfo.cityHint);
      if (normalized) setCity(normalized);
    }
  }, [isTorontoCohort, cohortInfo.cityHint, city]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setStatus({ ok: false, msg: "Enter a valid email." });
      return;
    }

    // ✅ In Toronto cohort mode, require a city (and default to Toronto anyway)
    if (isTorontoCohort && !city) {
      setStatus({ ok: false, msg: "Please select Toronto to join early access." });
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
          // ✅ Tagging for later filtering in Supabase (no schema change needed if this already exists)
          source: isTorontoCohort ? "landing_toronto" : "landing",
          referrer,
          company, // honeypot
          ...utms,
          // ✅ Optional extra tag; safe even if API ignores unknown fields
          cohort: isTorontoCohort ? "toronto_launch" : null,
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setStatus({ ok: false, msg: data?.error || "Something went wrong." });
        return;
      }

      // ✅ Success copy aligned with Toronto launch + trial (not TestFlight)
      const successMsg = isTorontoCohort
        ? "You’re in! Toronto early access is opening soon — we’ll email you when downloads go live (and you’ll get a 7-day Shifted+ trial)."
        : "You’re on the list! We’ll email you when early access opens in your area.";

      if (data?.already) {
        setStatus({ ok: true, msg: "You’re already on the list — " + successMsg });
        return;
      }

      setStatus({ ok: true, msg: successMsg });

      setEmail("");
      // keep city if Toronto cohort so users don’t accidentally change it
      if (!isTorontoCohort) setCity("");
    } catch {
      setStatus({ ok: false, msg: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
      {/* Honeypot */}
      <div
        style={{
          position: "absolute",
          left: -9999,
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
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
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            outline: "none",
            opacity: loading ? 0.85 : 1,
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={loading || isTorontoCohort} // ✅ lock Toronto during Toronto cohort
            required={isTorontoCohort} // ✅ require in Toronto cohort
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              outline: "none",
              opacity: loading ? 0.85 : 1,
            }}
          >
            <option value="">
              {isTorontoCohort ? "Toronto" : "City (optional)"}
            </option>
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
              opacity: loading ? 0.85 : 1,
            }}
          >
            {loading ? "Joining..." : "Join early access"}
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
          <input
            type="checkbox"
            checked={isShift}
            onChange={(e) => setIsShift(e.target.checked)}
            disabled={loading}
          />
          I work shifts (or keep a non-9-to-5 schedule)
        </label>

        {status && (
          <div style={{ color: status.ok ? "#00ff88" : "#ff6b6b", fontSize: 13 }}>
            {status.msg}
          </div>
        )}
      </div>
    </form>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";

function buildQueryFromUrl(href: string) {
  // Combine BOTH ?query and #hash into one query string
  const url = new URL(href);

  const combined = new URLSearchParams(url.searchParams);

  const hash = (url.hash || "").replace(/^#/, "");
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      if (!combined.has(key)) combined.set(key, value);
    });
  }

  return combined.toString();
}

export default function AuthCallbackBridge() {
  const [qs, setQs] = useState<string>("");

  useEffect(() => {
    const query = buildQueryFromUrl(window.location.href);
    setQs(query);

    // Try DEV first, then PROD fallback
    const dev = `shiftedclean-dev://auth/callback${query ? `?${query}` : ""}`;
    const prod = `shiftedclean://auth/callback${query ? `?${query}` : ""}`;

    // Attempt dev scheme first
    window.location.replace(dev);

    // Fallback to prod shortly after (if dev not installed)
    const t = setTimeout(() => {
      window.location.replace(prod);
    }, 700);

    return () => clearTimeout(t);
  }, []);

  const devHref = useMemo(
    () => `shiftedclean-dev://auth/callback${qs ? `?${qs}` : ""}`,
    [qs],
  );
  const prodHref = useMemo(
    () => `shiftedclean://auth/callback${qs ? `?${qs}` : ""}`,
    [qs],
  );

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>Opening Shifted…</h2>
      <p style={{ marginTop: 8 }}>
        If nothing happens, tap a button below. (Sometimes iOS blocks automatic opening.)
      </p>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {/* IMPORTANT: These MUST include the query string */}
        <a
          href={prodHref}
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid #ccc",
            textDecoration: "none",
          }}
        >
          Open Shifted
        </a>

        <a
          href={devHref}
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid #ccc",
            textDecoration: "none",
          }}
        >
          Open Shifted Dev
        </a>
      </div>

      <p style={{ marginTop: 14, color: "#666", fontSize: 12, wordBreak: "break-all" }}>
        Debug: {qs ? `?${qs}` : "(no tokens detected in URL)"}
      </p>
    </main>
  );
}
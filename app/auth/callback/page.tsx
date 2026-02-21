"use client";

import { useEffect } from "react";

export default function AuthCallbackPage() {
  useEffect(() => {
    const hash = window.location.hash || "";
    const search = window.location.search || "";

    // For now, route into DEV build so your testing is consistent
    const target = `shiftedclean-dev://auth/callback${search}${hash}`;
    window.location.replace(target);
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>Opening Shifted Dev…</h2>
      <p>If nothing happens, open the app and try the link again.</p>
    </main>
  );
}
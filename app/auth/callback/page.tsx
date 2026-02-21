"use client";

import { useEffect } from "react";

function buildDeepLink() {
  const hash = window.location.hash || "";
  const search = window.location.search || "";

  // ✅ Default to PROD scheme
  // ✅ Allow forcing DEV via ?dev=1 (handy for testing)
  const params = new URLSearchParams(search);
  const forceDev = params.get("dev") === "1";

  const scheme = forceDev ? "shiftedclean-dev" : "shiftedclean";

  return `${scheme}://auth/callback${search}${hash}`;
}

export default function AuthCallbackPage() {
  useEffect(() => {
    const target = buildDeepLink();
    window.location.replace(target);
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>Opening Shifted…</h2>
      <p>
        If nothing happens, make sure the app is installed, then go back and tap
        the link again.
      </p>
    </main>
  );
}
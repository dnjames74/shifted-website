// app/auth/callback/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string>("");

  const params = useMemo(() => {
    // Supabase email links may include different param shapes depending on flow/provider
    const code = sp.get("code");
    const token_hash = sp.get("token_hash");
    const type = sp.get("type");
    const error = sp.get("error");
    const error_description = sp.get("error_description");
    return { code, token_hash, type, error, error_description };
  }, [sp]);

  useEffect(() => {
    // IMPORTANT: If user visits /auth/callback directly (no params), do NOT redirect.
    // Just show a helpful message.
    if (
      !params.code &&
      !(params.token_hash && params.type) &&
      !params.error
    ) {
      setStatus("idle");
      setMessage(
        "Auth callback endpoint is working. Now open this page using the link from the verification email."
      );
      return;
    }

    // If there is an auth error in URL, display it
    if (params.error) {
      setStatus("error");
      setMessage(
        params.error_description
          ? `${params.error}: ${params.error_description}`
          : params.error
      );
      return;
    }

    // If we get here, we have some auth params from Supabase.
    // Your existing Supabase exchange/verify logic should run here.
    setStatus("processing");
    setMessage("Processing verification link…");

    // TEMP: We’re not doing the exchange in this debug step yet
    // because your current logic may already do it.
    // If you want, paste your current callback logic and I’ll wire it in safely.

    // After success, redirect somewhere intentional:
    // router.replace("/sign-in");
  }, [params, router]);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Shifted Auth Callback</h1>

      <p>
        <strong>Status:</strong> {status}
      </p>
      <p>{message}</p>

      <hr style={{ margin: "16px 0" }} />

      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(params, null, 2)}
      </pre>
    </main>
  );
}

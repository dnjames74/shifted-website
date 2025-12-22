// app/auth/callback/page.tsx
import React, { Suspense } from "react";
import CallbackClient from "./CallbackClient";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Signing you in…</div>}>
      <CallbackClient />
    </Suspense>
  );
}

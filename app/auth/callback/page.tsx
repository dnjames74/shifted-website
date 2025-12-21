// app/auth/callback/page.tsx
import React, { Suspense } from "react";
import CallbackClient from "./CallbackClient";

export const dynamic = "force-dynamic"; // prevents static prerender
export const revalidate = 0;

export default function CallbackPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <CallbackClient />
    </Suspense>
  );
}

function Fallback() {
  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.spinner} />
        <h1 style={styles.title}>Signing you in…</h1>
        <p style={styles.text}>Just a second.</p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#000",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    border: "1px solid #222",
    background: "#0b0f1a",
    padding: 20,
    color: "#fff",
    textAlign: "center",
  },
  title: { margin: "12px 0 6px", fontSize: 20, fontWeight: 800 },
  text: { margin: 0, color: "#a3a3a3", fontSize: 14 },
  spinner: {
    width: 22,
    height: 22,
    borderRadius: 999,
    border: "3px solid #1DB95433",
    borderTopColor: "#1DB954",
    margin: "0 auto",
    animation: "spin 1s linear infinite",
  },
};

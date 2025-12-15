import WaitlistForm from "./components/WaitlistForm";

export default function Page() {
  const year = new Date().getFullYear();

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#05070A",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div
          style={{
            background: "#0b1620",
            border: "1px solid #1f2937",
            borderRadius: 16,
            padding: 22,
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img src="/logo.png" alt="Shifted" width={170} style={{ display: "block" }} />
          </div>

          {/* Headline */}
          <h1 style={{ margin: "16px 0 8px", fontSize: 26, fontWeight: 900, color: "#ffffff" }}>
            Shifted Dating
          </h1>

          <p style={{ margin: 0, color: "#9ca3af", fontSize: 15, lineHeight: 1.6 }}>
            Meet people on your schedule — no spam, no stress.
          </p>

          <div style={{ height: 1, background: "#111827", margin: "18px 0" }} />

          {/* Waitlist */}
          <p style={{ margin: "0 0 10px 0", color: "#d1d5db", fontSize: 14, lineHeight: 1.6 }}>
            Join the waitlist for early access:
          </p>

          <WaitlistForm />

          <div style={{ height: 1, background: "#111827", margin: "18px 0" }} />

          {/* Support */}
          <p style={{ margin: 0, color: "#9ca3af", fontSize: 13, lineHeight: 1.6 }}>
            Need help?{" "}
            <a
              href="mailto:support@shifteddating.com"
              style={{ color: "#00ff88", fontWeight: 800, textDecoration: "none" }}
            >
              support@shifteddating.com
            </a>
          </p>
        </div>
          <p style={{ marginTop: 10, color: "#6b7280", fontSize: 12, textAlign: "center" }}>
  <a href="/privacy" style={{ color: "#9ca3af", marginRight: 12 }}>
    Privacy Policy
  </a>
  <a href="/terms" style={{ color: "#9ca3af" }}>
    Terms of Service
  </a>
</p>

        <p style={{ marginTop: 14, color: "#6b7280", fontSize: 12, textAlign: "center" }}>
          © {year} Shifted Dating
        </p>
      </div>
    </main>
  );
}

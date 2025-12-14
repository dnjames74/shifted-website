export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div
          style={{
            background: "#0b1620",
            border: "1px solid #1f2937",
            borderRadius: 16,
            padding: 22
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img
              src="/logo.png"
              alt="Shifted"
              width={170}
              style={{ display: "block" }}
            />
          </div>

          <h1 style={{ margin: "16px 0 8px", fontSize: 26, fontWeight: 900 }}>
            Shifted Dating
          </h1>

          <p style={{ margin: 0, color: "#9ca3af", fontSize: 15, lineHeight: 1.6 }}>
            Meet people on your schedule — no spam, no stress.
          </p>

          <div style={{ height: 1, background: "#111827", margin: "18px 0" }} />

          <p style={{ margin: 0, color: "#d1d5db", fontSize: 14, lineHeight: 1.6 }}>
            We’re launching soon. If you want early access, email us:
            <br />
            <a
              href="mailto:support@shifteddating.com"
              style={{ color: "#00ff88", fontWeight: 800, textDecoration: "none" }}
            >
              support@shifteddating.com
            </a>
          </p>
        </div>

        <p style={{ marginTop: 14, color: "#6b7280", fontSize: 12, textAlign: "center" }}>
          © {new Date().getFullYear()} Shifted Dating
        </p>
      </div>
    </main>
  );
}

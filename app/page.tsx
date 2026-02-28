import WaitlistForm from "./components/WaitlistForm";

function readQuery() {
  // Server component: we can't read window here.
  // But Next App Router lets us read searchParams in props. We're not using that pattern yet.
  // So we keep the page copy general-but-Toronto-forward and let the form lock Toronto via query.
  return null;
}

export default function Page() {
  const year = new Date().getFullYear();
  readQuery();

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
          {/* Logo (centered) */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img
              src="/logo.png"
              alt="Shifted"
              width={190}
              style={{
                display: "block",
                height: "auto",
              }}
            />
          </div>

          {/* Headline */}
          <h1
            style={{
              margin: "14px 0 6px",
              fontSize: 24,
              fontWeight: 900,
              color: "#ffffff",
              textAlign: "center",
              letterSpacing: -0.2,
            }}
          >
            Toronto Early Access
          </h1>

          {/* Subheadline */}
          <p
            style={{
              margin: 0,
              color: "#9ca3af",
              fontSize: 15,
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            A dating app built for shift workers — launching in Toronto next week.
          </p>

          <div style={{ height: 1, background: "#111827", margin: "18px 0" }} />

          {/* Primary pitch */}
          <p
            style={{
              margin: "0 0 10px 0",
              color: "#d1d5db",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Join the first{" "}
            <span style={{ color: "#ffffff", fontWeight: 900 }}>300</span>{" "}
            Toronto members and get a{" "}
            <span style={{ color: "#ffffff", fontWeight: 900 }}>
              7-day Shifted+ trial
            </span>{" "}
            at launch.
          </p>

          {/* What to expect box */}
          <div
            style={{
              marginBottom: 10,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #1f2937",
              background: "#05070A",
              color: "#9ca3af",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <div style={{ color: "#ffffff", fontWeight: 900, marginBottom: 4 }}>
              What to expect
            </div>
            <div>• Built for nights, days, and rotating schedules.</div>
            <div>• Toronto-first so matches don’t feel empty.</div>
            <div>
              • If your browser blocks auto opening, use the{" "}
              <span style={{ color: "#ffffff", fontWeight: 800 }}>
                Open Shifted
              </span>{" "}
              button when prompted.
            </div>
          </div>

          <WaitlistForm />

          <div style={{ height: 1, background: "#111827", margin: "18px 0" }} />

          {/* Small footnote (optional) */}
          <p
            style={{
              margin: 0,
              color: "#9ca3af",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Need help?{" "}
            <a
              href="mailto:support@shifteddating.com"
              style={{
                color: "#00ff88",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              support@shifteddating.com
            </a>
          </p>
        </div>

        <p
          style={{
            marginTop: 10,
            color: "#6b7280",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          <a href="/privacy" style={{ color: "#9ca3af", marginRight: 12 }}>
            Privacy Policy
          </a>
          <a href="/terms" style={{ color: "#9ca3af" }}>
            Terms of Service
          </a>
        </p>

        <p
          style={{
            marginTop: 14,
            color: "#6b7280",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          © {year} Shifted Dating
        </p>
      </div>
    </main>
  );
}
// app/api/waitlist/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

/* ---------------- Rate limiting ---------------- */

type Bucket = { count: number; resetAt: number };
const ipBuckets = new Map<string, Bucket>();

function cleanupBuckets(now: number) {
  for (const [k, v] of ipBuckets.entries()) {
    if (now > v.resetAt) ipBuckets.delete(k);
  }
}

function rateLimit(ip: string, limit: number, windowMs: number) {
  const now = Date.now();
  cleanupBuckets(now);

  const existing = ipBuckets.get(ip);
  if (!existing || now > existing.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return { ok: false, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true };
}

/* ---------------- Helpers ---------------- */

function getIP(req: Request): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function cleanStr(v: unknown, maxLen: number): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, maxLen) : null;
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/* ---------------- Email HTML ---------------- */

function getWaitlistEmailHtml(opts: { already: boolean }) {
  const headline = opts.already
    ? "You’re already on the waitlist ✅"
    : "You’re on the waitlist ✅";

  const body = opts.already
    ? "You’re already on our list. We’ll email you a TestFlight invite as soon as a spot opens."
    : "Thanks for joining. We’ll email you a TestFlight invite as soon as a spot opens.";

  return `
  <div style="font-family: system-ui; background:#05070A; padding:24px;">
    <div style="max-width:520px; margin:auto; background:#0b1620; border-radius:16px; padding:22px;">
      <h1 style="color:#fff">${headline}</h1>
      <p style="color:#9ca3af">${body}</p>
      <p style="color:#6b7280; font-size:12px; margin-top:16px">
        Need help? <a href="mailto:support@shifteddating.com" style="color:#00ff88">support@shifteddating.com</a>
      </p>
    </div>
  </div>
  `;
}

/* ---------------- Email Sender ---------------- */

async function sendWaitlistEmail(toEmail: string, already: boolean) {
  const smtpUser = process.env.ZOHO_SMTP_USER;
  const smtpPass = process.env.ZOHO_SMTP_PASS;
  const smtpHost = process.env.ZOHO_SMTP_HOST;
  const smtpPort = Number(process.env.ZOHO_SMTP_PORT || "587");
  const fromName = process.env.ZOHO_FROM_NAME || "Shifted Dating";
  const fromEmail = process.env.ZOHO_FROM_EMAIL || smtpUser;

  console.info("[waitlist-email] env presence", {
    hasUser: !!smtpUser,
    hasPass: !!smtpPass,
    hasHost: !!smtpHost,
    hasPort: !!smtpPort,
    hasFromName: !!fromName,
    hasFromEmail: !!fromEmail,
  });

  if (!smtpUser || !smtpPass || !smtpHost) return;

  console.info("[waitlist-email] attempting send", {
    to: toEmail.replace(/(.{2}).+(@.+)/, "$1***$2"),
    from: fromEmail,
    host: smtpHost,
    port: smtpPort,
    secure: false,
    already,
  });

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: 587,
    secure: false, // STARTTLS
    requireTLS: true,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    tls: { servername: smtpHost },
  });

  try {
    await withTimeout(transporter.verify(), 12000, "transporter.verify");
    console.info("[waitlist-email] transporter.verify OK");

    const info = await withTimeout(
      transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: toEmail,
        subject: already
          ? "You’re already on the Shifted waitlist"
          : "You’re on the Shifted waitlist",
        html: getWaitlistEmailHtml({ already }),
        text: already
          ? "You’re already on our list."
          : "You’re on the list!",
      }),
      15000,
      "transporter.sendMail"
    );

    console.info("[waitlist-email] sendMail OK", {
      messageId: info.messageId,
      response: info.response,
    });
  } catch (err: any) {
    console.error("[waitlist-email] FAILED", {
      message: err?.message,
      code: err?.code,
      responseCode: err?.responseCode,
      response: err?.response,
    });
  }
}

/* ---------------- API Handler ---------------- */

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const ip = getIP(req);
    const rl = rateLimit(ip, 10, 10 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    if (cleanStr(body?.company, 200)) return NextResponse.json({ ok: true });

    const email = String(body?.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    const { error } = await supabase
      .from("waitlist_signups")
      .insert([{ email }]);

    if (error && error.code === "23505") {
      sendWaitlistEmail(email, true).catch(() => {});
      return NextResponse.json({ ok: true, already: true });
    }

    if (error) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    sendWaitlistEmail(email, false).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

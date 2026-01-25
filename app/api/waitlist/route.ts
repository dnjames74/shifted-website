// app/api/waitlist/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// --- tiny in-memory rate limiter (best-effort; resets on cold starts) ---
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
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  ipBuckets.set(ip, existing);

  return {
    ok: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

function getIP(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();

  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";

  return "unknown";
}

function cleanStr(v: unknown, maxLen: number): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, maxLen);
}

function isValidEmail(email: string): boolean {
  if (email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getWaitlistEmailHtml(opts: { already: boolean }) {
  const headline = opts.already
    ? "You’re already on the waitlist ✅"
    : "You’re on the waitlist ✅";

  const body = opts.already
    ? "You’re already on our list. We’ll email you a TestFlight invite as soon as a spot opens."
    : "Thanks for joining. We’ll email you a TestFlight invite as soon as a spot opens.";

  return `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#05070A; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#0b1620; border:1px solid #1f2937; border-radius:16px; padding:22px;">
      <h1 style="margin:0 0 10px 0; font-size:22px; color:#ffffff; font-weight:900;">
        ${headline}
      </h1>
      <p style="margin:0; color:#9ca3af; font-size:14px; line-height:1.6;">
        ${body}
      </p>

      <div style="height:1px; background:#111827; margin:18px 0;"></div>

      <p style="margin:0; color:#d1d5db; font-size:13px; line-height:1.6;">
        Need help? Email us at
        <a href="mailto:support@shifteddating.com" style="color:#00ff88; font-weight:800; text-decoration:none;">
          support@shifteddating.com
        </a>.
      </p>

      <p style="margin:16px 0 0 0; color:#6b7280; font-size:12px; line-height:1.6;">
        Shifted Dating — Meet people on your schedule.
      </p>
    </div>
  </div>
  `;
}

function maskEmail(email: string) {
  const [u, d] = email.split("@");
  if (!u || !d) return "***";
  const u2 = u.length <= 2 ? "*" : `${u[0]}***${u[u.length - 1]}`;
  return `${u2}@${d}`;
}

async function sendWaitlistEmail(toEmail: string, already: boolean) {
  const smtpUser = process.env.ZOHO_SMTP_USER;
  const smtpPass = process.env.ZOHO_SMTP_PASS;

  // Debug: show presence ONLY (never values)
  console.log("[waitlist-email] env presence", {
    hasUser: Boolean(smtpUser),
    hasPass: Boolean(smtpPass),
    hasHost: Boolean(process.env.ZOHO_SMTP_HOST),
    hasPort: Boolean(process.env.ZOHO_SMTP_PORT),
    hasFromName: Boolean(process.env.ZOHO_FROM_NAME),
    hasFromEmail: Boolean(process.env.ZOHO_FROM_EMAIL),
  });

  // If SMTP isn’t configured, skip (don’t block signups)
  if (!smtpUser || !smtpPass) {
    console.log("[waitlist-email] skipped: missing smtp user/pass");
    return;
  }

  const smtpHost = process.env.ZOHO_SMTP_HOST || "smtp.zoho.com";

  // Default to 465, but you can switch to 587 if Zoho/your DNS/network is picky
  const smtpPort = Number(process.env.ZOHO_SMTP_PORT || "465");

  const fromName = process.env.ZOHO_FROM_NAME || "Shifted Dating";

  // IMPORTANT: for Zoho, keep fromEmail == smtpUser unless you’ve explicitly configured “Send Mail As”
  const fromEmail = process.env.ZOHO_FROM_EMAIL || smtpUser;

  const subject = already
    ? "You’re already on the Shifted waitlist"
    : "You’re on the Shifted waitlist";

  const html = getWaitlistEmailHtml({ already });

  console.log("[waitlist-email] attempting send", {
    to: maskEmail(toEmail),
    from: maskEmail(fromEmail),
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    already,
  });

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // 465 = implicit TLS
    auth: { user: smtpUser, pass: smtpPass },

    // Prevent “stuck” SMTP calls in serverless
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,

    // Helpful when debugging some TLS/provider quirks
    tls: {
      // If Zoho is strict, leave this alone. Only change if you see cert errors.
      // rejectUnauthorized: true,
    },
  });

  // Optional but extremely helpful: tells you if the SMTP handshake/auth is working
  try {
    await transporter.verify();
    console.log("[waitlist-email] transporter.verify OK");
  } catch (e: any) {
    console.log("[waitlist-email] transporter.verify FAILED", {
      name: e?.name,
      code: e?.code,
      message: e?.message,
      response: e?.response,
      responseCode: e?.responseCode,
      command: e?.command,
    });
    // Don’t throw — we still try sendMail; sometimes verify fails but send works
  }

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject,
      html,
      text: already
        ? "You’re already on our list. We’ll email you a TestFlight invite as soon as a spot opens."
        : "You’re on the list! We’ll email you a TestFlight invite as soon as a spot opens.",
    });

    console.log("[waitlist-email] sendMail OK", {
      messageId: info?.messageId,
      acceptedCount: Array.isArray(info?.accepted) ? info.accepted.length : undefined,
      rejectedCount: Array.isArray(info?.rejected) ? info.rejected.length : undefined,
    });
  } catch (e: any) {
    console.log("[waitlist-email] sendMail FAILED", {
      name: e?.name,
      code: e?.code,
      message: e?.message,
      response: e?.response,
      responseCode: e?.responseCode,
      command: e?.command,
    });
  }
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json({ ok: false, error: "Missing SUPABASE_URL" }, { status: 500 });
    }
    if (!serviceRole) {
      return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const ip = getIP(req);

    const rl = rateLimit(ip, 10, 10 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Try again soon." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
          },
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({} as any));

    const hp = cleanStr(body?.company, 200);
    if (hp) return NextResponse.json({ ok: true });

    const emailRaw = (body?.email ?? "").toString().trim().toLowerCase();
    if (!emailRaw || !isValidEmail(emailRaw)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
    }

    const payload = {
      email: emailRaw,
      city: cleanStr(body?.city, 120),
      is_shift_worker: typeof body?.is_shift_worker === "boolean" ? (body.is_shift_worker as boolean) : null,
      source: cleanStr(body?.source, 120),
      referrer: cleanStr(body?.referrer, 300),
      utm_source: cleanStr(body?.utm_source, 120),
      utm_medium: cleanStr(body?.utm_medium, 120),
      utm_campaign: cleanStr(body?.utm_campaign, 120),
      utm_term: cleanStr(body?.utm_term, 120),
      utm_content: cleanStr(body?.utm_content, 120),
      ip: ip === "unknown" ? null : ip,
      user_agent: cleanStr(req.headers.get("user-agent"), 300),
    };

    const { error } = await supabase.from("waitlist_signups").insert([payload]);

    if (error) {
      if ((error as any).code === "23505") {
        // Don’t block response; DO log failures inside sendWaitlistEmail
        sendWaitlistEmail(emailRaw, true).catch(() => {});
        return NextResponse.json({ ok: true, already: true });
      }

      return NextResponse.json({ ok: false, error: "Insert failed." }, { status: 500 });
    }

    sendWaitlistEmail(emailRaw, false).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}

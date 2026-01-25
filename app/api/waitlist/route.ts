// app/api/waitlist/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// Bump this when you redeploy so we can confirm the code running in Vercel
const EMAIL_DEBUG_VERSION = "waitlist-email-debug-v3";

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

function maskEmail(email: string) {
  const [u, d] = email.split("@");
  if (!u || !d) return "***";
  const uMask = u.length <= 2 ? `${u[0] ?? "*"}*` : `${u[0]}***${u[u.length - 1]}`;
  const dParts = d.split(".");
  const dMain = dParts[0] ?? d;
  const dMask = dMain.length <= 2 ? `${dMain[0] ?? "*"}*` : `${dMain[0]}***${dMain[dMain.length - 1]}`;
  return `${uMask}@${dMask}.${dParts.slice(1).join(".") || ""}`.replace(/\.$/, "");
}

function getWaitlistEmailHtml(opts: { already: boolean }) {
  const headline = opts.already ? "You’re already on the waitlist ✅" : "You’re on the waitlist ✅";
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

async function sendWaitlistEmail(toEmail: string, already: boolean) {
  const debug = process.env.WAITLIST_EMAIL_DEBUG === "1";

  const smtpUser = process.env.ZOHO_SMTP_USER;
  const smtpPass = process.env.ZOHO_SMTP_PASS;
  const smtpHost = process.env.ZOHO_SMTP_HOST || "smtp.zoho.com";
  const fromName = process.env.ZOHO_FROM_NAME || "Shifted Dating";
  const fromEmail = process.env.ZOHO_FROM_EMAIL || smtpUser;

  const portRaw = process.env.ZOHO_SMTP_PORT || "587";
  const smtpPort = Number(portRaw);

  console.info("[waitlist-email] version", EMAIL_DEBUG_VERSION);
  console.info("[waitlist-email] env presence", {
    hasUser: !!smtpUser,
    hasPass: !!smtpPass,
    hasHost: !!smtpHost,
    hasPort: !!smtpPort,
    hasFromName: !!fromName,
    hasFromEmail: !!fromEmail,
    debug,
  });

  // If SMTP isn’t configured, skip (don’t block signups)
  if (!smtpUser || !smtpPass) return;

  // Zoho + Vercel: prefer 587 STARTTLS
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort || 587,
    secure: false, // MUST be false for 587
    auth: { user: smtpUser, pass: smtpPass },
    requireTLS: true,
    tls: { rejectUnauthorized: false },

    // Prevent “hangs forever”
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });

  const subject = already ? "You’re already on the Shifted waitlist" : "You’re on the Shifted waitlist";
  const html = getWaitlistEmailHtml({ already });

  console.info("[waitlist-email] attempting send", {
    to: maskEmail(toEmail),
    from: fromEmail ? maskEmail(fromEmail) : "***",
    host: smtpHost,
    port: smtpPort || 587,
    secure: false,
    already,
    debug,
  });

  try {
    // IMPORTANT: in debug mode we await verify + send so logs are guaranteed
    if (debug) {
      await transporter.verify();
      console.info("[waitlist-email] transporter verified");
    }

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject,
      html,
      text: already
        ? "You’re already on our list. We’ll email you a TestFlight invite as soon as a spot opens."
        : "You’re on the list! We’ll email you a TestFlight invite as soon as a spot opens.",
    });

    console.info("[waitlist-email] sendMail OK", {
      messageId: info?.messageId || null,
      accepted: Array.isArray(info?.accepted) ? info.accepted.length : null,
      rejected: Array.isArray(info?.rejected) ? info.rejected.length : null,
      response: info?.response || null,
    });
  } catch (err: any) {
    console.error("[waitlist-email] SMTP error", {
      name: err?.name,
      message: err?.message,
      code: err?.code,
      command: err?.command,
      response: err?.response,
      responseCode: err?.responseCode,
      stack: err?.stack,
    });
    throw err; // in debug mode this helps us see failures clearly in logs
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

    const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

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

    const debug = process.env.WAITLIST_EMAIL_DEBUG === "1";

    if (error) {
      if ((error as any).code === "23505") {
        // Duplicate: already on list
        if (debug) {
          await sendWaitlistEmail(emailRaw, true);
        } else {
          sendWaitlistEmail(emailRaw, true).catch(() => {});
        }
        return NextResponse.json({ ok: true, already: true });
      }
      return NextResponse.json({ ok: false, error: "Insert failed." }, { status: 500 });
    }

    // New signup
    if (debug) {
      await sendWaitlistEmail(emailRaw, false);
    } else {
      sendWaitlistEmail(emailRaw, false).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}

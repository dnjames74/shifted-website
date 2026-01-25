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

function maskEmail(email: string) {
  // avoids logging full user emails (optional)
  const [u, d] = email.split("@");
  if (!u || !d) return "***";
  const u2 = u.length <= 2 ? u[0] + "*" : u.slice(0, 2) + "***";
  return `${u2}@${d}`;
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

async function sendWaitlistEmail(toEmail: string, already: boolean) {
  const smtpUser = process.env.ZOHO_SMTP_USER;
  const smtpPass = process.env.ZOHO_SMTP_PASS;

  const smtpHost = process.env.ZOHO_SMTP_HOST || "smtp.zoho.com";
  const smtpPort = Number(process.env.ZOHO_SMTP_PORT || "465");
  const fromName = process.env.ZOHO_FROM_NAME || "Shifted Dating";
  const fromEmail = process.env.ZOHO_FROM_EMAIL || smtpUser || "";

  // ---- DEBUG: environment presence (NEVER log the password) ----
  console.log("[waitlist.email] start", {
    to: maskEmail(toEmail),
    already,
    hasUser: !!smtpUser,
    hasPass: !!smtpPass,
    host: smtpHost,
    port: smtpPort,
    fromEmail: fromEmail ? maskEmail(fromEmail) : "",
  });

  if (!smtpUser || !smtpPass) {
    console.log("[waitlist.email] skipped: missing smtp env vars", {
      hasUser: !!smtpUser,
      hasPass: !!smtpPass,
    });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // 465 = SSL
    auth: { user: smtpUser, pass: smtpPass },

    // keep things from hanging forever
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });

  // ---- DEBUG: verify SMTP connection/auth ----
  try {
    await transporter.verify();
    console.log("[waitlist.email] transporter.verify ok");
  } catch (e: any) {
    console.log("[waitlist.email] transporter.verify FAILED", {
      name: e?.name,
      code: e?.code,
      message: e?.message,
      response: e?.response,
      responseCode: e?.responseCode,
      command: e?.command,
    });
    throw e; // so caller log shows this failure
  }

  const subject = already
    ? "You’re already on the Shifted waitlist"
    : "You’re on the Shifted waitlist";

  const html = getWaitlistEmailHtml({ already });

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

    console.log("[waitlist.email] sendMail ok", {
      messageId: info?.messageId,
      accepted: info?.accepted?.length ?? 0,
      rejected: info?.rejected?.length ?? 0,
      response: info?.response,
    });
  } catch (e: any) {
    console.log("[waitlist.email] sendMail FAILED", {
      name: e?.name,
      code: e?.code,
      message: e?.message,
      response: e?.response,
      responseCode: e?.responseCode,
      command: e?.command,
    });
    throw e;
  }
}

export async function POST(req: Request) {
  const requestId = `wl_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.log("[waitlist]", requestId, "Missing SUPABASE_URL");
      return NextResponse.json({ ok: false, error: "Missing SUPABASE_URL" }, { status: 500 });
    }
    if (!serviceRole) {
      console.log("[waitlist]", requestId, "Missing SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json(
        { ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const ip = getIP(req);

    // Rate limit: 10 requests per 10 minutes per IP
    const rl = rateLimit(ip, 10, 10 * 60 * 1000);
    if (!rl.ok) {
      console.log("[waitlist]", requestId, "rate_limited", { ip });
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

    // Honeypot: must be empty.
    const hp = cleanStr(body?.company, 200);
    if (hp) {
      console.log("[waitlist]", requestId, "honeypot_triggered");
      return NextResponse.json({ ok: true });
    }

    const emailRaw = (body?.email ?? "").toString().trim().toLowerCase();
    if (!emailRaw || !isValidEmail(emailRaw)) {
      console.log("[waitlist]", requestId, "invalid_email");
      return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
    }

    console.log("[waitlist]", requestId, "signup_attempt", {
      email: maskEmail(emailRaw),
      ip: ip === "unknown" ? "unknown" : "present",
    });

    const payload = {
      email: emailRaw,
      city: cleanStr(body?.city, 120),
      is_shift_worker:
        typeof body?.is_shift_worker === "boolean" ? (body.is_shift_worker as boolean) : null,
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
        console.log("[waitlist]", requestId, "duplicate_email", { email: maskEmail(emailRaw) });

        // Fire-and-forget email (but log failures)
        sendWaitlistEmail(emailRaw, true).catch((e: any) => {
          console.log("[waitlist.email] fire_and_forget FAILED (already)", {
            requestId,
            name: e?.name,
            code: e?.code,
            message: e?.message,
          });
        });

        return NextResponse.json({ ok: true, already: true });
      }

      console.log("[waitlist]", requestId, "supabase_insert_failed", {
        code: (error as any)?.code,
        message: (error as any)?.message,
      });

      return NextResponse.json({ ok: false, error: "Insert failed." }, { status: 500 });
    }

    console.log("[waitlist]", requestId, "insert_ok", { email: maskEmail(emailRaw) });

    // Fire-and-forget email (but log failures)
    sendWaitlistEmail(emailRaw, false).catch((e: any) => {
      console.log("[waitlist.email] fire_and_forget FAILED (welcome)", {
        requestId,
        name: e?.name,
        code: e?.code,
        message: e?.message,
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.log("[waitlist] unhandled_error", {
      requestId,
      name: e?.name,
      code: e?.code,
      message: e?.message,
      stack: e?.stack,
    });

    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}

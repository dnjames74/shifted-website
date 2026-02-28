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

/**
 * Cohort normalization:
 * - Keep only simple safe chars so we never store junk.
 * - Examples: "toronto", "toronto_nights", "toronto-rt1"
 */
function cleanCohort(v: unknown): string | null {
  const raw = cleanStr(v, 80);
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/\s+/g, "-");
  const safe = s.replace(/[^a-z0-9_-]/g, "");
  return safe || null;
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
      <div style="display:flex; justify-content:center; margin-bottom:14px;">
        <img src="https://www.shifteddating.com/logo.png" alt="Shifted" width="170" style="display:block; height:auto;" />
      </div>

      <h1 style="margin:0 0 10px 0; font-size:22px; color:#ffffff; font-weight:900; text-align:center;">
        ${headline}
      </h1>

      <p style="margin:0; color:#9ca3af; font-size:14px; line-height:1.6; text-align:center;">
        ${body}
      </p>

      <div style="height:1px; background:#111827; margin:18px 0;"></div>

      <p style="margin:0; color:#d1d5db; font-size:13px; line-height:1.6; text-align:center;">
        Need help? Email us at
        <a href="mailto:support@shifteddating.com" style="color:#00ff88; font-weight:800; text-decoration:none;">
          support@shifteddating.com
        </a>.
      </p>

      <p style="margin:16px 0 0 0; color:#6b7280; font-size:12px; line-height:1.6; text-align:center;">
        Shifted Dating — Meet people on your schedule.
      </p>
    </div>
  </div>
  `;
}

function maskEmail(e: string) {
  const [u, d] = e.split("@");
  if (!u || !d) return "***";
  return `${u[0]}***@${d}`;
}

async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let t: NodeJS.Timeout | null = null;
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
}

async function sendWaitlistEmail(toEmail: string, already: boolean) {
  const version = "waitlist-email-debug-v5"; // <-- bump when you deploy

  const smtpUser = process.env.ZOHO_SMTP_USER;
  const smtpPass = process.env.ZOHO_SMTP_PASS;
  const smtpHost = process.env.ZOHO_SMTP_HOST || "smtp.zoho.com";
  const smtpPort = Number(process.env.ZOHO_SMTP_PORT || "587");
  const fromName = process.env.ZOHO_FROM_NAME || "Shifted Dating";
  const fromEmail = process.env.ZOHO_FROM_EMAIL || smtpUser || "";
  const debug =
    String(process.env.WAITLIST_EMAIL_DEBUG || "").toLowerCase() === "true";

  console.info("[waitlist-email] version", version);
  console.info("[waitlist-email] env presence", {
    hasUser: !!smtpUser,
    hasPass: !!smtpPass,
    hasHost: !!smtpHost,
    hasPort: !!smtpPort,
    hasFromName: !!fromName,
    hasFromEmail: !!fromEmail,
    debug,
  });

  if (!smtpUser || !smtpPass) return;

  const secure = smtpPort === 465;

  console.info("[waitlist-email] attempting send", {
    to: maskEmail(toEmail),
    from: maskEmail(fromEmail),
    host: smtpHost,
    port: smtpPort,
    secure,
    already,
    debug,
  });

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure,
    auth: { user: smtpUser, pass: smtpPass },
    requireTLS: !secure,

    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 15_000,

    tls: {
      servername: smtpHost,
      minVersion: "TLSv1.2",
    },

    logger: debug,
    debug,
  });

  console.info("[waitlist-email] verifying smtp…");
  await withTimeout(transporter.verify(), 15_000, "SMTP verify");
  console.info("[waitlist-email] smtp verify OK");

  const subject = already
    ? "You’re already on the Shifted waitlist"
    : "You’re on the Shifted waitlist";

  const html = getWaitlistEmailHtml({ already });

  console.info("[waitlist-email] sending mail…");
  const info = await withTimeout(
    transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject,
      html,
      text: already
        ? "You’re already on our list. We’ll email you a TestFlight invite as soon as a spot opens."
        : "You’re on the list! We’ll email you a TestFlight invite as soon as a spot opens.",
    }),
    20_000,
    "SMTP sendMail",
  );

  console.info("[waitlist-email] sent ok", {
    messageId: (info as any)?.messageId,
    accepted: (info as any)?.accepted?.length ?? 0,
    rejected: (info as any)?.rejected?.length ?? 0,
    response: (info as any)?.response,
  });
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { ok: false, error: "Missing SUPABASE_URL" },
        { status: 500 },
      );
    }
    if (!serviceRole) {
      return NextResponse.json(
        { ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      );
    }

    const ip = getIP(req);

    const rl = rateLimit(ip, 10, 10 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Try again soon." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000)),
            ),
          },
        },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({} as any));

    // Honeypot
    const hp = cleanStr(body?.company, 200);
    if (hp) return NextResponse.json({ ok: true });

    const emailRaw = (body?.email ?? "").toString().trim().toLowerCase();
    if (!emailRaw || !isValidEmail(emailRaw)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid email." },
        { status: 400 },
      );
    }

    // ✅ NEW: cohort tracking (e.g. "toronto")
    const cohort = cleanCohort(body?.cohort);

    // ✅ OPTIONAL: if cohort is toronto, default city to Toronto unless user set another city.
    const cityIncoming = cleanStr(body?.city, 120);
    const city =
      cohort === "toronto" ? (cityIncoming || "Toronto") : cityIncoming;

    const payload = {
      email: emailRaw,
      city,
      cohort, // <-- requires DB column, or it will error (see note below)

      is_shift_worker:
        typeof body?.is_shift_worker === "boolean"
          ? (body.is_shift_worker as boolean)
          : null,
      source: cleanStr(body?.source, 120),
      referrer: cleanStr(body?.referrer, 300),
      utm_source: cleanStr(body?.utm_source, 120),
      utm_medium: cleanStr(body?.utm_medium, 120),
      utm_campaign: cleanStr(body?.utm_campaign, 120),
      utm_term: cleanStr(body?.utm_term, 120),
      utm_content: cleanStr(body?.utm_content, 120),
      ip: ip === "unknown" ? null : ip,
      user_agent: cleanStr(req.headers.get("user-agent"), 300),
      landing_version: "toronto-seed-v1", // optional: requires DB column, or remove
    };

    const { error } = await supabase.from("waitlist_signups").insert([payload]);

    if (error) {
      // If you haven't added the DB columns yet, you'll see "column ... does not exist".
      // In that case, remove cohort/landing_version from payload OR add the columns.
      if ((error as any).code === "23505") {
        try {
          await sendWaitlistEmail(emailRaw, true);
        } catch (e: any) {
          console.error("[waitlist-email] send failed (already=true)", {
            message: e?.message,
            code: e?.code,
            response: e?.response,
            stack: e?.stack,
          });
        }
        return NextResponse.json({ ok: true, already: true });
      }

      console.error("[waitlist] insert failed", {
        message: (error as any)?.message,
        code: (error as any)?.code,
      });

      return NextResponse.json(
        { ok: false, error: "Insert failed." },
        { status: 500 },
      );
    }

    try {
      await sendWaitlistEmail(emailRaw, false);
    } catch (e: any) {
      console.error("[waitlist-email] send failed (already=false)", {
        message: e?.message,
        code: e?.code,
        response: e?.response,
        stack: e?.stack,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[waitlist] handler failed", {
      message: e?.message,
      stack: e?.stack,
    });
    return NextResponse.json(
      { ok: false, error: "Something went wrong." },
      { status: 500 },
    );
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// --- tiny in-memory rate limiter (best-effort; resets on cold starts) ---
type Bucket = { count: number; resetAt: number };
const ipBuckets = new Map<string, Bucket>();

function rateLimit(ip: string, limit: number, windowMs: number) {
  const now = Date.now();
  cleanupBuckets(now);
  const existing = ipBuckets.get(ip);

  if (!existing || now > existing.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  function cleanupBuckets(now: number) {
  // remove expired entries (best-effort)
  for (const [k, v] of ipBuckets.entries()) {
    if (now > v.resetAt) ipBuckets.delete(k);
  }
}

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  ipBuckets.set(ip, existing);
  return { ok: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

function getIP(req: Request): string {
  // Vercel commonly sets x-forwarded-for; sometimes x-real-ip.
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
  // simple + safe (don’t over-validate); just block obvious junk
  if (email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json({ ok: false, error: "Missing SUPABASE_URL" }, { status: 500 });
    }
    if (!serviceRole) {
      return NextResponse.json(
        { ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const ip = getIP(req);

    // Rate limit: 10 requests per 10 minutes per IP (tune as you like)
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

    // Honeypot: include an input like name="company" (hidden). Must be empty.
    const hp = cleanStr(body?.company, 200);
    if (hp) {
      // Pretend success to avoid tipping off bots
      return NextResponse.json({ ok: true });
    }

    const emailRaw = (body?.email ?? "").toString().trim().toLowerCase();
    if (!emailRaw || !isValidEmail(emailRaw)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
    }

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
      ip: ip === "unknown" ? null : ip, // inet column: null if we couldn't determine
      user_agent: cleanStr(req.headers.get("user-agent"), 300),
    };

    const { error } = await supabase.from("waitlist_signups").insert([payload]);

    if (error) {
      // duplicates throw 23505 because of unique index on lower(email)
      if ((error as any).code === "23505") {
        return NextResponse.json({ ok: true, already: true });
      }
      // No console logging in production response path
      return NextResponse.json({ ok: false, error: "Insert failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}

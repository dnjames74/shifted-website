// app/api/recovery-bridge/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access_token = String(body?.access_token ?? "");
    const refresh_token = String(body?.refresh_token ?? "");

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: "missing_tokens" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("recovery_bridge")
      .insert({ access_token, refresh_token })
      .select("id")
      .single();

    if (error || !data?.id) {
      return NextResponse.json(
        { error: error?.message ?? "insert_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ rid: data.id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown_error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rid = searchParams.get("rid");

  if (!rid) {
    return NextResponse.json({ error: "missing_rid" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("recovery_bridge")
    .select("id, access_token, refresh_token, used_at, created_at")
    .eq("id", rid)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (data.used_at) {
    return NextResponse.json({ error: "already_used" }, { status: 410 });
  }

  // Mark as used (best-effort). Do not block response on this.
  try {
    await admin
      .from("recovery_bridge")
      .update({ used_at: new Date().toISOString() })
      .eq("id", rid);
  } catch {
    // ignore
  }

  return NextResponse.json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
}
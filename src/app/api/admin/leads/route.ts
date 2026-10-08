import { NextResponse } from "next/server";

import { supabaseService } from "@/lib/supabase/admin.server";
import { requireAdmin } from "@/lib/supabase/requireAdmin.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["new", "contacted", "won", "lost"];

export async function GET(req: Request) {
  const auth = await requireAdmin(req, { superOnly: true });
  if (!auth.ok) return auth.response;
  const { data, error } = await supabaseService().from("leads").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data ?? [] });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req, { superOnly: true });
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as { id?: string; status?: string; admin_notes?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "Bad status." }, { status: 400 });
    patch.status = body.status;
  }
  if (typeof body.admin_notes === "string") patch.admin_notes = body.admin_notes.slice(0, 4000);
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  const { error } = await supabaseService().from("leads").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

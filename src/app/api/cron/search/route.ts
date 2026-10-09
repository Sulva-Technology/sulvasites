import { NextResponse } from "next/server";

import { googleConfigured } from "@/lib/search/google.server";
import { indexNowKey } from "@/lib/search/indexNow.server";
import { ROW_COLUMNS, processRow, syncRows, type IndexRow } from "@/lib/search/searchIndex.server";
import { supabaseService } from "@/lib/supabase/admin.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Hosts visited per run; the oldest-checked go first, so every host is reached over a few days. */
const ROWS_PER_RUN = 40;
/** Stop starting new hosts after this, leaving headroom under maxDuration. */
const BUDGET_MS = 45_000;

/** Daily: keep site_search_index in step with published sites, advance Google, push changes to IndexNow. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const google = googleConfigured();
  if (!google && !indexNowKey()) {
    console.log("[search] cron: no engines configured");
    return NextResponse.json({ ok: true, skipped: "not configured" });
  }

  const started = Date.now();
  const db = supabaseService();
  let sync: { inserted: number; deactivated: number };
  try {
    sync = await syncRows(db);
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync failed";
    console.error("[search] cron: sync failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data, error } = await db
    .from("site_search_index")
    .select(ROW_COLUMNS)
    .eq("active", true)
    .order("checked_at", { ascending: true, nullsFirst: true })
    .limit(ROWS_PER_RUN);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let visited = 0;
  let googleSteps = 0;
  let pushed = 0;
  let failed = 0;
  for (const row of (data ?? []) as IndexRow[]) {
    if (Date.now() - started > BUDGET_MS) break;
    const r = await processRow(db, row, { google });
    visited += 1;
    if (r.google !== "skipped" && r.google !== "none" && !r.error) googleSteps += 1;
    pushed += r.pushed;
    if (r.error) failed += 1;
  }

  const summary = { ...sync, visited, googleSteps, pushedUrls: pushed, failed };
  console.log("[search] cron:", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary });
}

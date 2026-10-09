import { NextResponse } from "next/server";

import { googleConfigured } from "@/lib/search/google.server";
import { indexNowKey } from "@/lib/search/indexNow.server";
import { refreshSite, siteRows, type RowResult } from "@/lib/search/searchIndex.server";
import { requireServiceClient } from "@/lib/shop/serviceClient.server";
import { rateLimit } from "@/lib/supabase/requireAdmin.server";
import { requireSiteRole } from "@/lib/supabase/requireSiteRole.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ siteId: string }> };

const NO_STORE = { "Cache-Control": "no-store" };

async function payload(siteId: string, results?: RowResult[]) {
  const db = requireServiceClient();
  if (!db) return NextResponse.json({ error: "The service role key is not configured." }, { status: 500 });
  try {
    const rows = await siteRows(db, siteId);
    return NextResponse.json(
      { google: googleConfigured(), indexNow: !!indexNowKey(), rows, results: results ?? null },
      { headers: NO_STORE },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load search status.";
    // Before migration 020 the table is missing; say so instead of a raw Postgres error.
    const missing = /site_search_index/.test(message) && /does not exist|schema cache/.test(message);
    return NextResponse.json(
      { error: missing ? "Run migration 020_search_index.sql first." : message },
      { status: 500, headers: NO_STORE },
    );
  }
}

/** Search engine state for every host this site has been submitted under. Sulvatech admins only. */
export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["admin"]);
  if (!auth.ok) return auth.response;
  return payload(siteId);
}

/** Resubmit now: clears the failure cap, runs the next Google step and pushes every URL to IndexNow. */
export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["admin"]);
  if (!auth.ok) return auth.response;
  const limited = rateLimit(`search-resubmit:${auth.userId}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const db = requireServiceClient();
  if (!db) return NextResponse.json({ error: "The service role key is not configured." }, { status: 500 });
  try {
    const results = await refreshSite(db, siteId, { google: true, force: true });
    return payload(siteId, results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resubmit failed.";
    console.error("[search] resubmit failed", { site_id: siteId, error: message });
    return NextResponse.json({ error: message }, { status: 502, headers: NO_STORE });
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";

import { primaryHost } from "@/lib/hostRouting";
import { siteUrl, type SitemapEntry } from "@/lib/sitemap";

import { addSite, getMetaToken, googleConfigured, googleDomainProperty, submitSitemap, verifySite } from "./google.server";
import { indexNowKey, pushUrls } from "./indexNow.server";
import { platformEntries } from "./platformEntries";
import {
  PING_COOLDOWN_MS,
  changedUrls,
  googleSiteUrl,
  initialState,
  latestLastmod,
  nextGoogleStep,
  stateAfter,
  type GoogleStep,
  type HostKind,
  type SearchRow,
} from "./searchPlan";
import { platformDomain } from "./siteHosts.server";
import { listSitemapEntries } from "./sitemapEntries.server";

export const ROW_COLUMNS =
  "id, site_id, host, kind, google_state, google_state_at, google_token, sitemap_submitted_at, indexnow_pushed_at, failures, last_error, last_error_at, active, checked_at";

export type IndexRow = SearchRow & {
  id: string;
  site_id: string | null;
  last_error: string | null;
  last_error_at: string | null;
  active: boolean;
  checked_at: string | null;
};

export type RowResult = { host: string; google: GoogleStep | "skipped"; pushed: number; error?: string };

type DesiredHost = { host: string; site_id: string | null; kind: HostKind };

/** The platform host plus each published site's primary host (all sites, or one when `siteId` is given). */
async function desiredHosts(db: SupabaseClient, siteId?: string): Promise<DesiredHost[]> {
  const platform = platformDomain();
  let sitesQuery = db.from("sites").select("id, slug").eq("status", "published");
  let domainsQuery = db.from("domains").select("site_id, hostname, created_at").eq("status", "active");
  if (siteId) {
    sitesQuery = sitesQuery.eq("id", siteId);
    domainsQuery = domainsQuery.eq("site_id", siteId);
  }
  const [sites, domains] = await Promise.all([sitesQuery.limit(10_000), domainsQuery.limit(10_000)]);
  if (sites.error) throw new Error(sites.error.message);
  if (domains.error) throw new Error(domains.error.message);

  const bySite = new Map<string, Array<{ hostname: string; created_at: string }>>();
  for (const d of (domains.data ?? []) as Array<{ site_id: string; hostname: string; created_at: string }>) {
    bySite.set(d.site_id, [...(bySite.get(d.site_id) ?? []), d]);
  }
  const out: DesiredHost[] = siteId ? [] : [{ host: platform, site_id: null, kind: "platform" }];
  for (const s of (sites.data ?? []) as Array<{ id: string; slug: string }>) {
    const host = primaryHost(s.slug, bySite.get(s.id) ?? [], platform);
    out.push({ host, site_id: s.id, kind: host.endsWith(`.${platform}`) ? "subdomain" : "custom" });
  }
  return out;
}

/**
 * Makes site_search_index match the published sites: inserts new hosts, re-activates returning ones and
 * deactivates hosts that are no longer a published primary host. Scoped to one site when `siteId` is given.
 */
export async function syncRows(db: SupabaseClient, siteId?: string): Promise<{ inserted: number; deactivated: number }> {
  const desired = await desiredHosts(db, siteId);
  let existingQuery = db.from("site_search_index").select("id, host, site_id, kind, active");
  if (siteId) existingQuery = existingQuery.eq("site_id", siteId);
  const { data, error } = await existingQuery.limit(20_000);
  if (error) throw new Error(error.message);
  const existing = (data ?? []) as Array<{ id: string; host: string; site_id: string | null; kind: HostKind; active: boolean }>;
  const byHost = new Map(existing.map((r) => [r.host, r]));
  const wanted = new Set(desired.map((d) => d.host));
  const now = new Date().toISOString();

  let inserted = 0;
  for (const d of desired) {
    const row = byHost.get(d.host);
    if (!row) {
      // A host can belong to another site's row (domain moved): upsert on the unique host.
      const { error: e } = await db.from("site_search_index").upsert(
        { host: d.host, site_id: d.site_id, kind: d.kind, google_state: initialState(d.kind), google_state_at: now, active: true, failures: 0 },
        { onConflict: "host" },
      );
      if (e) throw new Error(e.message);
      inserted += 1;
    } else if (!row.active || row.site_id !== d.site_id || row.kind !== d.kind) {
      const { error: e } = await db
        .from("site_search_index")
        .update({ active: true, site_id: d.site_id, kind: d.kind })
        .eq("id", row.id);
      if (e) throw new Error(e.message);
    }
  }

  const stale = existing.filter((r) => r.active && !wanted.has(r.host)).map((r) => r.id);
  if (stale.length > 0) {
    const { error: e } = await db.from("site_search_index").update({ active: false }).in("id", stale);
    if (e) throw new Error(e.message);
  }
  return { inserted, deactivated: stale.length };
}

async function entriesFor(db: SupabaseClient, row: IndexRow): Promise<SitemapEntry[]> {
  if (row.kind === "platform") return platformEntries(`https://${row.host}`);
  if (!row.site_id) return [];
  const { data } = await db.from("sites").select("id, template_key").eq("id", row.site_id).maybeSingle();
  if (!data) return [];
  return listSitemapEntries(data as { id: string; template_key: string }, row.host);
}

/** Runs one Google step and returns the row fields to write (state on success). */
async function runGoogleStep(row: IndexRow, step: Exclude<GoogleStep, "none">): Promise<Partial<IndexRow>> {
  const property = googleDomainProperty()!;
  const now = new Date().toISOString();
  const advance = { google_state: stateAfter(step), google_state_at: now };
  switch (step) {
    case "getToken":
      return { ...advance, google_token: await getMetaToken(row.host) };
    case "verify":
      await verifySite(row.host);
      return advance;
    case "add":
      await addSite(googleSiteUrl(row, property));
      return advance;
    case "submitSitemap":
      await submitSitemap(googleSiteUrl(row, property), siteUrl(row.host, "/sitemap.xml"));
      return { ...advance, sitemap_submitted_at: now };
  }
}

/**
 * One visit to a host: the next Google step (when `google`) and an IndexNow push of changed URLs
 * (all URLs when `pushAll`). Errors are recorded on the row, never thrown.
 */
export async function processRow(
  db: SupabaseClient,
  row: IndexRow,
  { google, pushAll = false }: { google: boolean; pushAll?: boolean },
): Promise<RowResult> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const update: Partial<IndexRow> = { checked_at: nowIso };
  const result: RowResult = { host: row.host, google: "skipped", pushed: 0 };
  const errors: string[] = [];

  let entries: SitemapEntry[] = [];
  try {
    entries = await entriesFor(db, row);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Could not list pages.");
  }

  if (google && googleConfigured()) {
    const step = nextGoogleStep(row, latestLastmod(entries), now);
    result.google = step;
    if (step !== "none") {
      try {
        Object.assign(update, await runGoogleStep(row, step), { failures: 0 });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Google request failed.");
        update.failures = row.failures + 1;
      }
    }
  }

  const recentlyPushed = row.indexnow_pushed_at && now - Date.parse(row.indexnow_pushed_at) < PING_COOLDOWN_MS;
  if (indexNowKey() && entries.length > 0 && (pushAll || !recentlyPushed)) {
    const urls = pushAll ? entries.map((e) => e.url) : changedUrls(entries, row.indexnow_pushed_at);
    if (urls.length > 0) {
      try {
        await pushUrls(row.host, urls);
        update.indexnow_pushed_at = nowIso;
        result.pushed = urls.length;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "IndexNow request failed.");
      }
    }
  }

  if (errors.length > 0) {
    result.error = errors.join(" · ");
    update.last_error = result.error.slice(0, 500);
    update.last_error_at = nowIso;
  } else if (result.pushed > 0 || (result.google !== "skipped" && result.google !== "none")) {
    update.last_error = null;
  }

  const { error } = await db.from("site_search_index").update(update).eq("id", row.id);
  if (error) console.error("[search] row update failed", { host: row.host, error: error.message });
  return result;
}

/** Sync and process one site's hosts now (publish ping, admin Resubmit). `force` clears the failure cap and pushes all URLs. */
export async function refreshSite(
  db: SupabaseClient,
  siteId: string,
  { google, force = false }: { google: boolean; force?: boolean },
): Promise<RowResult[]> {
  await syncRows(db, siteId);
  if (force) {
    const { error } = await db.from("site_search_index").update({ failures: 0 }).eq("site_id", siteId).eq("active", true);
    if (error) throw new Error(error.message);
  }
  const rows = await siteRows(db, siteId, true);
  const results: RowResult[] = [];
  for (const row of rows) results.push(await processRow(db, row, { google, pushAll: force }));
  return results;
}

export async function siteRows(db: SupabaseClient, siteId: string, activeOnly = false): Promise<IndexRow[]> {
  let q = db.from("site_search_index").select(ROW_COLUMNS).eq("site_id", siteId);
  if (activeOnly) q = q.eq("active", true);
  const { data, error } = await q.order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as IndexRow[];
}

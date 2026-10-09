/** Pure decisions for search-engine submission. Relative imports only (unit-tested). */
import type { SitemapEntry } from "../sitemap.ts";

export type HostKind = "platform" | "subdomain" | "custom";
export type GoogleState = "pending" | "token" | "verified" | "added" | "submitted";
export type GoogleStep = "getToken" | "verify" | "add" | "submitSitemap" | "none";

/** The fields of a site_search_index row the decisions need. */
export type SearchRow = {
  host: string;
  kind: HostKind;
  google_state: GoogleState;
  google_state_at: string;
  google_token: string | null;
  sitemap_submitted_at: string | null;
  indexnow_pushed_at: string | null;
  failures: number;
};

const MINUTE = 60 * 1000;

/** Consecutive failures after which a host waits for an admin Resubmit. */
export const MAX_FAILURES = 5;
/** Gap between storing a verification token and asking Google to check it, so cached pages carry the tag. */
export const VERIFY_DELAY_MS = 10 * MINUTE;
/** Google re-reads sitemaps itself; resubmit at most weekly, and only after content changed. */
export const RESUBMIT_MS = 7 * 24 * 60 * MINUTE;
/** Publish pings closer together than this are skipped (the next one or the cron catches up). */
export const PING_COOLDOWN_MS = 10 * MINUTE;

/** Custom domains need their own verified property; subdomains and the platform sit under the domain property. */
export function initialState(kind: HostKind): GoogleState {
  return kind === "custom" ? "pending" : "added";
}

function time(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export function nextGoogleStep(row: SearchRow, contentChangedAt: string | null, now: number): GoogleStep {
  if (row.failures >= MAX_FAILURES) return "none";
  switch (row.google_state) {
    case "pending":
      return "getToken";
    case "token": {
      const since = time(row.google_state_at) ?? 0;
      return now - since >= VERIFY_DELAY_MS ? "verify" : "none";
    }
    case "verified":
      return "add";
    case "added":
      return "submitSitemap";
    case "submitted": {
      const submitted = time(row.sitemap_submitted_at);
      if (submitted === null) return "submitSitemap";
      const changed = time(contentChangedAt);
      if (changed === null || changed <= submitted) return "none";
      return now - submitted >= RESUBMIT_MS ? "submitSitemap" : "none";
    }
  }
}

export function stateAfter(step: Exclude<GoogleStep, "none">): GoogleState {
  return ({ getToken: "token", verify: "verified", add: "added", submitSitemap: "submitted" } as const)[step];
}

/** URLs to push to IndexNow: all on the first push, then those with a newer lastmod. */
export function changedUrls(entries: SitemapEntry[], since: string | null): string[] {
  const after = time(since);
  if (after === null) return entries.map((e) => e.url);
  return entries.filter((e) => (time(e.lastmod) ?? 0) > after).map((e) => e.url);
}

export function latestLastmod(entries: SitemapEntry[]): string | null {
  let best: number | null = null;
  for (const e of entries) {
    const t = time(e.lastmod);
    if (t !== null && (best === null || t > best)) best = t;
  }
  return best === null ? null : new Date(best).toISOString();
}

/** Google returns the whole META tag; we store and render only its content value. */
export function parseMetaToken(tag: string): string | null {
  const m = /content\s*=\s*["']([^"']+)["']/i.exec(tag);
  return m ? m[1]! : null;
}

/** Search Console property a host's sitemap is submitted under. */
export function googleSiteUrl(row: { host: string; kind: HostKind }, domainProperty: string): string {
  return row.kind === "custom" ? `https://${row.host}/` : domainProperty;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

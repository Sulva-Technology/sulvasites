/** Public analytics beacon limits. Pure constants so they can be unit-tested. */
export const TRACK_LIMITS = {
  /** Per IP across all sites. */
  ipMax: 120,
  ipWindowMs: 10 * 60_000,
  /** Per IP and site: a visitor browsing one site. */
  ipSiteMax: 60,
  ipSiteWindowMs: 5 * 60_000,
  /** Per site, all visitors. */
  siteMax: 3000,
  siteWindowMs: 10 * 60_000,
  maxBodyChars: 1024,
  maxPathChars: 200,
  maxReferrerChars: 300,
  maxHostChars: 100,
} as const;

/** Rows older than this are removed by public.purge_page_views() (migration 011). */
export const RETENTION_DAYS = 90;

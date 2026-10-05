/** Public inbox API limits. Pure constants so they can be unit-tested. */
export const INBOX_LIMITS = {
  ipMax: 5,
  ipWindowMs: 10 * 60_000,
  siteMax: 60,
  siteWindowMs: 10 * 60_000,
  maxBodyChars: 16 * 1024,
} as const;

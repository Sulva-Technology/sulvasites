// Slugs a client site may not use: they are platform routes on the root domain. Pure.
// Keep in sync with the sites_slug_not_reserved check in supabase/migrations/019_billing.sql (tested).
import { slugify } from "./slugify.ts";

export const RESERVED_SLUGS = [
  "about", "admin", "api", "blog", "change-password", "contact", "d", "dashboard", "dev",
  "forgot-password", "help", "login", "no-access", "pricing", "privacy", "signup", "start",
  "templates", "terms", "www",
] as const;

const SET: ReadonlySet<string> = new Set(RESERVED_SLUGS);

export function isReservedSlug(s: string): boolean {
  return SET.has(s);
}

/** slugify + fallback, then append "-site" when the result is reserved. */
export function safeSlug(raw: string, fallback = "my-site"): string {
  const s = slugify(raw) || fallback;
  return isReservedSlug(s) ? `${s}-site` : s;
}

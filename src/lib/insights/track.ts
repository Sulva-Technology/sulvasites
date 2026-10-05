import { TRACK_LIMITS } from "./limits.ts";

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
export type DeviceClass = "desktop" | "mobile" | "tablet";
type HeaderReader = { get(name: string): string | null };

const CONTROL_RE = /[\u0000-\u001f\u007f]/;

/** Path only (no query/hash), no trailing slash, order pages collapsed so references never reach analytics. */
export function normalizePath(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > TRACK_LIMITS.maxPathChars * 4) return null;
  if (CONTROL_RE.test(raw)) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  let p = raw.split("#")[0]!.split("?")[0]!;
  if (p.length > 1) p = p.replace(/\/+$/, "") || "/";
  if (/^\/shop\/order(\/|$)/.test(p)) p = "/shop/order";
  if (p.length > TRACK_LIMITS.maxPathChars) return null;
  return p;
}

export function parseTrackBody(text: string): Parsed<{ path: string; referrer: string | null }> {
  if (text.length > TRACK_LIMITS.maxBodyChars) return { ok: false, error: "Request too large." };
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, error: "Invalid request." };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Invalid request." };
  const b = body as Record<string, unknown>;
  const path = normalizePath(b.path);
  if (!path) return { ok: false, error: "Invalid path." };
  let referrer: string | null = null;
  if (b.referrer !== undefined && b.referrer !== null) {
    if (typeof b.referrer !== "string" || b.referrer.length > TRACK_LIMITS.maxReferrerChars) {
      return { ok: false, error: "Invalid referrer." };
    }
    referrer = b.referrer || null;
  }
  return { ok: true, value: { path, referrer } };
}

function bareHost(h: string): string {
  const host = (h.split(":")[0] ?? "").trim().toLowerCase();
  return host.startsWith("www.") ? host.slice(4) : host;
}

/** Referrer reduced to its host. Null for direct, non-http(s), unparseable or same-site referrers. */
export function referrerHost(referrer: string | null | undefined, ownHost: string | null | undefined): string | null {
  if (!referrer) return null;
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = bareHost(url.hostname);
  if (!host || host.length > TRACK_LIMITS.maxHostChars) return null;
  if (ownHost && host === bareHost(ownHost)) return null;
  return host;
}

export function deviceClass(ua: string | null | undefined): DeviceClass {
  const s = ua ?? "";
  if (/iPad|Tablet|PlayBook|Silk/i.test(s)) return "tablet";
  if (/Android/i.test(s) && !/Mobile/i.test(s)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|Windows Phone|BlackBerry/i.test(s)) return "mobile";
  return "desktop";
}

const BOT_RE =
  /bot|crawl|spider|slurp|headless|phantom|lighthouse|pagespeed|gtmetrix|curl\/|wget|python-requests|python-urllib|go-http|java\/|okhttp|axios|node-fetch|undici|libwww|scrapy|httpclient|facebookexternalhit|whatsapp|telegram|preview|monitor|uptime|pingdom|validator/i;

/** Crawlers, link-preview fetchers, scripts and empty user agents are not counted. */
export function isBot(ua: string | null | undefined): boolean {
  if (!ua || ua.trim().length < 8) return true;
  return BOT_RE.test(ua);
}

/** Do-Not-Track or Global Privacy Control: record nothing. */
export function hasPrivacySignal(h: HeaderReader): boolean {
  return h.get("dnt")?.trim() === "1" || h.get("sec-gpc")?.trim() === "1";
}

/** Optional 2-letter country from the hosting platform's geo header. Never derived from the raw IP here. */
export function countryFromHeaders(h: HeaderReader): string | null {
  const raw = (h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(raw) || raw === "XX" || raw === "T1") return null;
  return raw;
}

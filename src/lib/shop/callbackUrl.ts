/**
 * Pure builder for the Paystack `callback_url` (where the shopper lands after paying).
 * The client suggests a `returnUrl`; only hosts we can tie to this site are honoured so a forged
 * request can't bounce shoppers to an arbitrary site. Relative imports only (unit-tested).
 */

export type CallbackInput = {
  returnUrl: string | null;
  slug: string;
  reference: string;
  /** Platform domain, e.g. "example.site". Subdomain sites are `<slug>.<platformDomain>`. */
  platformDomain: string;
  /** Active custom-domain hostnames for this site (normalized, no www). */
  customHosts: string[];
  /** e.g. NEXT_PUBLIC_SITE_ORIGIN; path-based (`/<slug>/shop/...`). */
  fallbackOrigin: string | null;
  /** Allow localhost origins (development only). */
  allowLocal: boolean;
};

function normalizeHost(host: string): string {
  const h = host.trim().toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
}

function parseOrigin(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.username || u.password) return null;
    return u;
  } catch {
    return null;
  }
}

function isLocalHostname(h: string): boolean {
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".localhost");
}

export function resolveCallbackUrl(input: CallbackInput): string | null {
  const { slug, reference } = input;
  const platform = input.platformDomain.trim().toLowerCase();
  const orderPath = `/shop/order/${reference}`;
  const pathBased = `/${slug}${orderPath}`;

  const fallback = input.fallbackOrigin ? parseOrigin(input.fallbackOrigin) : null;
  const fallbackUrl = fallback ? `${fallback.origin}${pathBased}` : null;

  const ret = input.returnUrl ? parseOrigin(input.returnUrl) : null;
  if (!ret) return fallbackUrl;

  const hostname = ret.hostname.toLowerCase();
  const normalized = normalizeHost(hostname);
  const https = ret.protocol === "https:";

  // Dedicated hosts for this site: serve /shop/... at the root.
  if (https && platform && hostname === `${slug}.${platform}`) return `${ret.origin}${orderPath}`;
  if (https && input.customHosts.some((h) => normalizeHost(h) === normalized)) {
    return `${ret.origin}${orderPath}`;
  }
  // Path-based hosts: the platform domain itself, the configured fallback origin, local dev.
  if (https && platform && normalized === platform) return `${ret.origin}${pathBased}`;
  if (fallback && ret.origin === fallback.origin) return fallbackUrl;
  if (input.allowLocal && isLocalHostname(hostname)) return `${ret.origin}${pathBased}`;

  return fallbackUrl;
}

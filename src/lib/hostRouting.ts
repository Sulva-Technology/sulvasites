// Pure host → path routing used by middleware.ts. No Next.js imports, so it's unit-testable.

function stripPort(host: string) {
  return host.split(":")[0] ?? host;
}

export function normalizeHost(host: string) {
  const h = stripPort(host.trim().toLowerCase());
  if (!h) return "";
  return h.startsWith("www.") ? h.slice(4) : h;
}

export function isBypassPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/d/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

/**
 * Returns the internal pathname to rewrite to, or null to leave the request alone.
 *   <slug>.<platformDomain>/x  -> /<slug>/x
 *   custom.com/x               -> /d/custom.com/x
 */
export function rewritePathForHost(
  rawHost: string,
  pathname: string,
  platformDomain: string,
): string | null {
  if (isBypassPath(pathname)) return null;

  const platform = platformDomain.trim().toLowerCase();
  const host = normalizeHost(rawHost);
  if (!host) return null;

  // Don't interfere with local / preview deployments (path-based routing works there).
  if (host.includes("localhost") || host.endsWith(".vercel.app")) return null;

  // Base platform domain keeps the admin entry at /
  if (host === platform) return null;

  if (host.endsWith(`.${platform}`)) {
    const sub = host.slice(0, -1 * `.${platform}`.length);
    const slug = sub.split(".")[0] || "";
    return slug ? `/${slug}${pathname}` : null;
  }

  return `/d/${host}${pathname}`;
}

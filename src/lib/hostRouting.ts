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
    // Owner back office, reachable from the site's own link (e.g. store.<platform>/dashboard).
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/change-password") ||
    pathname.startsWith("/no-access") ||
    pathname.startsWith("/d/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

/** Which site a host serves: `{ slug }` for <slug>.<platform>, `{ hostname }` for a custom domain, null for the platform itself. */
export type SiteHostRef = { slug: string } | { hostname: string };

export function siteRefForHost(rawHost: string, platformDomain: string): SiteHostRef | null {
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
    return slug ? { slug } : null;
  }

  return { hostname: host };
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
  const ref = siteRefForHost(rawHost, platformDomain);
  if (!ref) return null;
  return "slug" in ref ? `/${ref.slug}${pathname}` : `/d/${ref.hostname}${pathname}`;
}

/**
 * On a site's own address the back office serves only that site. Returns where to send a request
 * for `pathname` (an /admin or /dashboard path), or null when it already belongs to the site.
 */
export function siteScopedRedirect(pathname: string, siteId: string): string | null {
  for (const base of ["/admin/sites", "/dashboard"]) {
    const area = base === "/dashboard" ? "/dashboard" : "/admin";
    if (pathname !== area && !pathname.startsWith(`${area}/`)) continue;
    const own = `${base}/${siteId}`;
    if (pathname === own || pathname.startsWith(`${own}/`)) return null;
    return own;
  }
  return null;
}

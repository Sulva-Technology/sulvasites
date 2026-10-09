/** Pure sitemap.xml / robots.txt builders. Relative imports only (unit-tested). */

export type SitemapEntry = { url: string; lastmod?: string };

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** "https://<host><path>", with "" or "/" meaning the home page. */
export function siteUrl(host: string, path: string): string {
  if (!path || path === "/") return `https://${host}/`;
  return `https://${host}${path.startsWith("/") ? path : `/${path}`}`;
}

function isoOrNull(value: string | undefined): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries.map((e) => {
    const lastmod = isoOrNull(e.lastmod);
    return `  <url>\n    <loc>${escapeXml(e.url)}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}  </url>\n`;
  });
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join("") +
    `</urlset>\n`
  );
}

/** Published sites allow everything but the back office; anything else is closed to crawlers. */
export function buildRobotsTxt({ allow, sitemapUrl }: { allow: boolean; sitemapUrl?: string }): string {
  if (!allow) return "User-agent: *\nDisallow: /\n";
  return `User-agent: *\nAllow: /\nDisallow: /dashboard\n${sitemapUrl ? `\nSitemap: ${sitemapUrl}\n` : ""}`;
}

import { buildRobotsTxt, buildSitemapXml, siteUrl } from "@/lib/sitemap";

import type { HostSite } from "./siteHosts.server";
import { listSitemapEntries } from "./sitemapEntries.server";

const CACHE = "public, max-age=3600";

/** sitemap.xml for a site host: 404 unless the site is published. URLs always use the primary host. */
export async function sitemapResponse(site: HostSite | null): Promise<Response> {
  if (!site || site.status !== "published") return new Response("Not found", { status: 404 });
  const xml = buildSitemapXml(await listSitemapEntries(site, site.primaryHost));
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": CACHE } });
}

/** robots.txt for a site host: open with a sitemap line when published, closed otherwise. */
export function robotsResponse(site: HostSite | null): Response {
  const allow = !!site && site.status === "published";
  const body = buildRobotsTxt({
    allow,
    sitemapUrl: allow ? siteUrl(site.primaryHost, "/sitemap.xml") : undefined,
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": CACHE } });
}

import { getSiteBillingState } from "@/lib/billing/siteState.server";
import { loadPublicSite, type SiteLookup } from "@/lib/publicSite.server";

import { buildRssFeed } from "./feed";
import { loadPublicBlog } from "./load.server";

/** RSS for /blog/feed.xml, or a 404 when the site is unknown or has no published posts. */
export async function blogFeedResponse(lookup: SiteLookup, value: string): Promise<Response> {
  const ctx = await loadPublicSite(lookup, value);
  const blog = ctx ? await loadPublicBlog(ctx.siteData.site.id, ctx.siteData.site.template_key) : null;
  if (!ctx || !blog || !ctx.canonicalHost) return new Response("Not found", { status: 404 });
  // Paused sites serve nothing, feed included (route handlers are not wrapped by the site layouts).
  if (!(await getSiteBillingState(ctx.siteData.site.id)).live) {
    return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  }
  const { profile } = ctx.siteData;
  const xml = buildRssFeed({
    siteName: `${profile.business_name} ${blog.label}`,
    description: profile.description || `News, ideas and stories from ${profile.business_name}.`,
    origin: `https://${ctx.canonicalHost}`,
    posts: blog.posts,
  });
  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=600",
    },
  });
}

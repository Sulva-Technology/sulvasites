import { createElement } from "react";
import { notFound } from "next/navigation";
import Script from "next/script";

import InsightsBeacon from "@/components/site/InsightsBeacon";
import { BLOG_NAV_KEY } from "@/lib/blog/blogPath";
import { blogRelated, buildBlogJsonLd, canonicalBlogUrl, type BlogPageContext } from "@/lib/blog/blogPage.server";
import { blogHeroPage } from "@/lib/blog/hero";
import { serializeJsonLd } from "@/lib/jsonLd";
import { loadNavPages } from "@/lib/publicSite.server";
import { loadPublicShop } from "@/lib/shop/loadPublicShop.server";
import { templateSupportsShop } from "@/templates/meta";
import { getTemplate } from "@/templates/registry";
import { blogSlot } from "@/templates/shared/blog/blogSlot";
import { InboxSiteProvider } from "@/templates/shared/inbox";

/** Renders a blog page (list / tag / post) inside the site's template, under its own hero. */
export default async function PublicBlogPage(page: BlogPageContext) {
  const { ctx, blog, view, post, bodyHtml } = page;
  const { siteData } = ctx;
  const Template = getTemplate(siteData.site.template_key);
  if (!Template) notFound();
  const navPages = await loadNavPages(siteData.site.id, siteData.site.template_key);
  // Shop templates keep their bag on every page while the shop is live.
  const shop = templateSupportsShop(siteData.site.template_key) ? await loadPublicShop(siteData.site.id) : null;

  return (
    <>
      <Script
        id="blog-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildBlogJsonLd(page)) }}
      />
      <InsightsBeacon siteId={siteData.site.id} />
      <InboxSiteProvider siteId={siteData.site.id}>
        {createElement(Template, {
          site: siteData.site,
          profile: siteData.profile,
          pages: siteData.pages,
          currentPage: null,
          baseUrl: ctx.baseUrl,
          pageOverride: blogHeroPage(blog, view, post, siteData.profile.business_name),
          navPages,
          currentExtraKey: BLOG_NAV_KEY,
          shop: shop ?? undefined,
          blog,
          slot: blogSlot({
            blog,
            view,
            post,
            bodyHtml,
            related: blogRelated(page),
            baseUrl: ctx.baseUrl,
            templateKey: siteData.site.template_key,
            canonicalUrl: canonicalBlogUrl(ctx, view),
          }),
        })}
      </InboxSiteProvider>
    </>
  );
}

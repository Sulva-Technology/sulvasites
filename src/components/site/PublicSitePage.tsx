import { createElement } from "react";
import { notFound } from "next/navigation";
import Script from "next/script";

import InsightsBeacon from "@/components/site/InsightsBeacon";
import { loadBusinessItems } from "@/lib/businessData/load.server";
import { mergeBusinessData } from "@/lib/businessData/merge";
import { serializeJsonLd } from "@/lib/jsonLd";
import {
  buildStructuredData,
  loadNavPages,
  type PublicPage,
  type PublicSiteContext,
} from "@/lib/publicSite.server";
import { loadPublicShop } from "@/lib/shop/loadPublicShop.server";
import { templateSupportsShop } from "@/templates/meta";
import { InboxSiteProvider } from "@/templates/shared/inbox";
import { getTemplate } from "@/templates/registry";

/** Renders a public site page (JSON-LD + the site's template) for any route. */
export default async function PublicSitePage({
  ctx,
  page,
}: {
  ctx: PublicSiteContext;
  page: PublicPage;
}) {
  const { siteData } = ctx;
  const Template = getTemplate(siteData.site.template_key);
  if (!Template) notFound();
  const navPages = await loadNavPages(siteData.site.id, siteData.site.template_key);
  // Shop templates show the bag and "shop the looks" on every page while the shop is live.
  const shop = templateSupportsShop(siteData.site.template_key) ? await loadPublicShop(siteData.site.id) : null;

  // Owner-managed business data (menu, timetable, doctors...) replaces the matching sections' items;
  // sites without items (or before migration 009) render their own page content unchanged.
  const items = await loadBusinessItems(siteData.site.id);
  const mergeOpts = { templateKey: siteData.site.template_key, homeTeaser: navPages.length > 0 };
  const pages = {
    home: mergeBusinessData(siteData.pages.home, items, { ...mergeOpts, pageKey: "home" }),
    about: mergeBusinessData(siteData.pages.about, items, { ...mergeOpts, pageKey: "about" }),
    contact: mergeBusinessData(siteData.pages.contact, items, { ...mergeOpts, pageKey: "contact" }),
  };
  const pageOverride = page.kind === "extra" ? mergeBusinessData(page.data, items, { ...mergeOpts, pageKey: null }) : undefined;

  const schemaId =
    page.kind === "extra"
      ? `p-${page.key}-schema`
      : page.key === "home"
        ? "organization-schema"
        : `${page.key}-schema`;

  return (
    <>
      <Script
        id={schemaId}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildStructuredData(ctx, page)),
        }}
      />
      <InsightsBeacon siteId={siteData.site.id} />
      {/* createElement: the template is picked from a static registry, not created per render. */}
      <InboxSiteProvider siteId={siteData.site.id}>
      {createElement(Template, {
        site: siteData.site,
        profile: siteData.profile,
        pages,
        currentPage: page.kind === "core" ? page.key : null,
        baseUrl: ctx.baseUrl,
        pageOverride,
        navPages,
        currentExtraKey: page.kind === "extra" ? page.key : null,
        shop: shop ?? undefined,
      })}
      </InboxSiteProvider>
    </>
  );
}

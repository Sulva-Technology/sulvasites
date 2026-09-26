import { createElement } from "react";
import { notFound } from "next/navigation";
import Script from "next/script";

import { serializeJsonLd } from "@/lib/jsonLd";
import {
  buildStructuredData,
  loadNavPages,
  type PublicPage,
  type PublicSiteContext,
} from "@/lib/publicSite.server";
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
      {/* createElement: the template is picked from a static registry, not created per render. */}
      {createElement(Template, {
        site: siteData.site,
        profile: siteData.profile,
        pages: siteData.pages,
        currentPage: page.kind === "core" ? page.key : null,
        baseUrl: ctx.baseUrl,
        pageOverride: page.kind === "extra" ? page.data : undefined,
        navPages,
        currentExtraKey: page.kind === "extra" ? page.key : null,
      })}
    </>
  );
}

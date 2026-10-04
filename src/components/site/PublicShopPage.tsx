import { createElement } from "react";
import { notFound } from "next/navigation";
import Script from "next/script";

import { serializeJsonLd } from "@/lib/jsonLd";
import { loadNavPages } from "@/lib/publicSite.server";
import { buildProductJsonLd, type ShopPageContext } from "@/lib/shop/shopPage.server";
import { getTemplate } from "@/templates/registry";

/** Renders a storefront page (shop list/category/product/cart/checkout/order) in the site's template. */
export default async function PublicShopPage(page: ShopPageContext) {
  const { ctx, shop, view } = page;
  const { siteData } = ctx;
  const Template = getTemplate(siteData.site.template_key);
  if (!Template) notFound();
  const navPages = await loadNavPages(siteData.site.id, siteData.site.template_key);
  const jsonLd = buildProductJsonLd(page);

  return (
    <>
      {jsonLd ? (
        <Script
          id="product-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      ) : null}
      {createElement(Template, {
        site: siteData.site,
        profile: siteData.profile,
        pages: siteData.pages,
        currentPage: null,
        baseUrl: ctx.baseUrl,
        navPages,
        currentExtraKey: null,
        shop,
        shopView: view,
      })}
    </>
  );
}

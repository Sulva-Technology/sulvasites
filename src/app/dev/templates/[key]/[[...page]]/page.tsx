import { createElement } from "react";
import { notFound } from "next/navigation";

import { isPageKey } from "@/lib/pageSchema";
import { getTemplate } from "@/templates/registry";
import { parseShopPath, shopViewExists } from "@/lib/shop/shopPath";
import { templateSupportsShop } from "@/templates/meta";
import { sampleExtraPage, sampleShop, sampleSite } from "@/templates/sampleSite";

/**
 * Dev-only template preview with sample content (no database needed):
 *   /dev/templates/t3            → home
 *   /dev/templates/t3/about      → about
 *   /dev/templates/t3/p/work     → extra page (template preset, filled with sample sections)
 *   /dev/templates/t13/shop/...  → storefront views (shop templates only; sampleShop data)
 * Disabled in production.
 */
export default async function DevTemplatePreview({
  params,
}: {
  params: Promise<{ key: string; page?: string[] }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { key, page } = await params;
  const Template = getTemplate(key);
  if (!Template) notFound();

  const props = sampleSite(key);
  const baseUrl = `/dev/templates/${key}`;
  // Shop templates get the sample catalogue on every page (bag, "shop the looks"), like live sites.
  const pageShop = templateSupportsShop(key) ? sampleShop(key) : undefined;

  if (page?.[0] === "shop") {
    if (!templateSupportsShop(key)) notFound();
    const view = parseShopPath(page.slice(1));
    const shop = sampleShop(key);
    if (!view || !shopViewExists(shop, view)) notFound();
    return createElement(Template, { ...props, currentPage: null, baseUrl, shop, shopView: view });
  }

  if (page?.[0] === "p" && page[1]) {
    const extra = sampleExtraPage(key, props, page[1]);
    if (!extra) notFound();
    return createElement(Template, { ...props, currentPage: null, pageOverride: extra, currentExtraKey: page[1], baseUrl, shop: pageShop });
  }

  const pageKey = page?.[0] ?? "home";
  if (!isPageKey(pageKey)) notFound();

  return createElement(Template, { ...props, currentPage: pageKey, baseUrl, shop: pageShop });
}

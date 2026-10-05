import { createElement, type ReactElement } from "react";

import { isPageKey } from "@/lib/pageSchema";
import { getTemplate } from "@/templates/registry";
import { parseShopPath, shopViewExists } from "@/lib/shop/shopPath";
import { templateSupportsShop } from "@/templates/meta";
import { sampleExtraPage, sampleShop, sampleSite } from "@/templates/sampleSite";

/**
 * Renders a template with sample content (no database needed). Returns null for an
 * unknown template or page so the route can 404.
 *   []                 → home
 *   ["about"]          → about
 *   ["p", "work"]      → extra page (template preset, filled with sample sections)
 *   ["shop", ...]      → storefront views (shop templates only; sampleShop data)
 */
export function renderSampleTemplate(key: string, page: string[] | undefined, baseUrl: string): ReactElement | null {
  const Template = getTemplate(key);
  if (!Template) return null;

  const props = sampleSite(key);
  // Shop templates get the sample catalogue on every page (bag, "shop the looks"), like live sites.
  const pageShop = templateSupportsShop(key) ? sampleShop(key) : undefined;

  if (page?.[0] === "shop") {
    if (!templateSupportsShop(key)) return null;
    const view = parseShopPath(page.slice(1));
    const shop = sampleShop(key);
    if (!view || !shopViewExists(shop, view)) return null;
    return createElement(Template, { ...props, currentPage: null, baseUrl, shop, shopView: view });
  }

  if (page?.[0] === "p" && page[1]) {
    const extra = sampleExtraPage(key, props, page[1]);
    if (!extra) return null;
    return createElement(Template, { ...props, currentPage: null, pageOverride: extra, currentExtraKey: page[1], baseUrl, shop: pageShop });
  }

  const pageKey = page?.[0] ?? "home";
  if (!isPageKey(pageKey)) return null;

  return createElement(Template, { ...props, currentPage: pageKey, baseUrl, shop: pageShop });
}

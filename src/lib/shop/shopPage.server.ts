import type { Metadata } from "next";

import { buildSiteMetadata, type PublicSiteContext } from "@/lib/publicSite.server";
import { templateSupportsShop } from "@/templates/meta";

import { loadPublicShop } from "./loadPublicShop.server";
import { findProduct, parseShopPath, shopPath, shopViewExists } from "./shopPath";
import { formatNaira } from "./money";
import type { ShopData, ShopView } from "./types";

export type ShopPageContext = { ctx: PublicSiteContext; shop: ShopData; view: ShopView };

/**
 * Resolves a storefront request, or null (=> 404) when the path is malformed, the template has no
 * shop, the shop is disabled / site unpublished, or the product/category doesn't exist.
 */
export async function loadShopPage(
  ctx: PublicSiteContext | null,
  segments: string[] | undefined,
): Promise<ShopPageContext | null> {
  if (!ctx) return null;
  const view = parseShopPath(segments);
  if (!view) return null;
  if (!templateSupportsShop(ctx.siteData.site.template_key)) return null;
  const shop = await loadPublicShop(ctx.siteData.site.id);
  if (!shop || !shopViewExists(shop, view)) return null;
  return { ctx, shop, view };
}

function plain(html: string | null, max: number): string {
  const t = (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export function buildShopMetadata({ ctx, shop, view }: ShopPageContext): Metadata {
  const name = ctx.siteData.profile.business_name;
  let title = `Shop | ${name}`;
  let description = `Shop online with ${name}.`;
  let image: string | undefined;
  let index = true;

  if (view.kind === "category") {
    const c = shop.categories.find((x) => x.slug === view.slug);
    if (c) {
      title = `${c.name} | ${name}`;
      description = `Browse ${c.name} from ${name}.`;
    }
  } else if (view.kind === "product") {
    const p = findProduct(shop, view.slug);
    if (p) {
      title = `${p.name} | ${name}`;
      description = plain(p.description, 160) || `${p.name} from ${name} · ${formatNaira(p.priceKobo)}`;
      image = p.images[0]?.url;
    }
  } else if (view.kind !== "list") {
    title = `${view.kind === "cart" ? "Your bag" : view.kind === "checkout" ? "Checkout" : "Order"} | ${name}`;
    index = false;
  }

  const meta = buildSiteMetadata(ctx, {
    kind: "extra",
    key: "shop",
    data: { seo: { title, description }, sections: [] },
  });

  const canonical = ctx.canonicalHost ? `https://${ctx.canonicalHost}${shopPath(view)}` : undefined;
  const og = meta.openGraph as Record<string, unknown> | null | undefined;
  return {
    ...meta,
    keywords: undefined,
    openGraph: {
      ...(og as object),
      url: canonical,
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    } as Metadata["openGraph"],
    twitter: image
      ? { card: "summary_large_image", title, description, images: [image] }
      : meta.twitter,
    alternates: canonical ? { canonical } : undefined,
    robots: index ? meta.robots : { index: false, follow: false },
  };
}

/** schema.org Product for product views (null otherwise). */
export function buildProductJsonLd({ ctx, shop, view }: ShopPageContext) {
  if (view.kind !== "product") return null;
  const p = findProduct(shop, view.slug);
  if (!p) return null;
  const prices = [p.priceKobo, ...p.variants.map((v) => v.priceKobo ?? p.priceKobo)];
  const low = Math.min(...prices);
  const inStock = p.variants.length === 0 || p.variants.some((v) => v.stock === null || v.stock > 0);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    ...(p.description && { description: plain(p.description, 500) }),
    ...(p.images.length > 0 && { image: p.images.map((i) => i.url) }),
    ...(ctx.canonicalHost && { url: `https://${ctx.canonicalHost}${shopPath(view)}` }),
    offers: {
      "@type": "Offer",
      priceCurrency: shop.currency,
      price: (low / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
}

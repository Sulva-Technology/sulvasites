/** Pure parsing/lookup helpers for storefront routes. Relative imports only (unit-tested). */
import { ORDER_REFERENCE_RE } from "./reference.ts";
import type { ShopData, ShopProduct, ShopView } from "./types.ts";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Mirrors the products.slug CHECK in 006_commerce.sql; these can't be product slugs.
const RESERVED = new Set(["cart", "checkout", "order", "c"]);

/**
 * Maps the catch-all segments after `/shop` to a ShopView, or null for anything unknown/malformed.
 *   []                  -> list           /shop
 *   [c, <slug>]         -> category       /shop/c/<slug>
 *   [cart] [checkout]   -> cart/checkout
 *   [order, <ref>]      -> order          /shop/order/<ref>
 *   [<slug>]            -> product        /shop/<slug>
 */
export function parseShopPath(segments: string[] | undefined): ShopView | null {
  const s = (segments ?? []).map((x) => {
    try {
      return decodeURIComponent(x);
    } catch {
      return "";
    }
  });
  if (s.some((x) => x === "")) return null;
  if (s.length === 0) return { kind: "list" };
  if (s.length === 1) {
    const [a] = s as [string];
    if (a === "cart") return { kind: "cart" };
    if (a === "checkout") return { kind: "checkout" };
    if (RESERVED.has(a) || !SLUG_RE.test(a)) return null;
    return { kind: "product", slug: a };
  }
  if (s.length === 2) {
    const [a, b] = s as [string, string];
    if (a === "c" && SLUG_RE.test(b)) return { kind: "category", slug: b };
    if (a === "order" && ORDER_REFERENCE_RE.test(b)) return { kind: "order", reference: b };
  }
  return null;
}

/** True when the view refers to an existing category/product (other views always resolve). */
export function shopViewExists(shop: ShopData, view: ShopView): boolean {
  if (view.kind === "category") return shop.categories.some((c) => c.slug === view.slug);
  if (view.kind === "product") return shop.products.some((p) => p.slug === view.slug);
  return true;
}

export function findProduct(shop: ShopData, slug: string): ShopProduct | null {
  return shop.products.find((p) => p.slug === slug) ?? null;
}

/** Path suffix (after the site's baseUrl) for a view, e.g. "/shop/c/shoes". */
export function shopPath(view: ShopView): string {
  switch (view.kind) {
    case "list": return "/shop";
    case "category": return `/shop/c/${view.slug}`;
    case "product": return `/shop/${view.slug}`;
    case "cart": return "/shop/cart";
    case "checkout": return "/shop/checkout";
    case "order": return `/shop/order/${view.reference}`;
  }
}

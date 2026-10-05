import type { CartLine } from "@/lib/shop/cart";
import type { ShopData, ShopProduct, ShopVariant } from "@/lib/shop/types";

/** Display-only shop maths. The server re-prices every order from the database at checkout. */

export type OptionGroup = { name: string; values: string[] };

export function unitPrice(product: ShopProduct, variant: ShopVariant | null): number {
  return variant?.priceKobo ?? product.priceKobo;
}

export function priceRange(product: ShopProduct): { min: number; max: number } {
  const prices =
    product.variants.length > 0
      ? product.variants.map((v) => v.priceKobo ?? product.priceKobo)
      : [product.priceKobo];
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function isOnSale(product: ShopProduct): boolean {
  return product.compareAtKobo !== null && product.compareAtKobo > product.priceKobo;
}

/** Option names and values in the order variants list them (Size, Colour, ...). */
export function optionGroups(product: ShopProduct): OptionGroup[] {
  const groups: OptionGroup[] = [];
  for (const v of [...product.variants].sort((a, b) => a.position - b.position)) {
    for (const [name, value] of Object.entries(v.options)) {
      let g = groups.find((x) => x.name === name);
      if (!g) {
        g = { name, values: [] };
        groups.push(g);
      }
      if (!g.values.includes(value)) g.values.push(value);
    }
  }
  return groups;
}

export function isColourOption(name: string): boolean {
  return /^(colou?r|shade)$/i.test(name.trim());
}

export function isSizeOption(name: string): boolean {
  return /^(size|sizes)$/i.test(name.trim());
}

export function findVariant(product: ShopProduct, selected: Record<string, string>): ShopVariant | null {
  const groups = optionGroups(product);
  if (groups.length === 0 || groups.some((g) => !selected[g.name])) return null;
  return (
    product.variants.find((v) => groups.every((g) => v.options[g.name] === selected[g.name])) ?? null
  );
}

export function variantInStock(v: ShopVariant): boolean {
  return v.stock === null || v.stock > 0;
}

/** Whether choosing `value` for option `name` can still lead to an in-stock variant, given the other picks. */
export function optionAvailable(
  product: ShopProduct,
  selected: Record<string, string>,
  name: string,
  value: string,
): boolean {
  return product.variants.some((v) => {
    if (v.options[name] !== value) return false;
    for (const [k, sel] of Object.entries(selected)) {
      if (k !== name && sel && v.options[k] !== sel) return false;
    }
    return variantInStock(v);
  });
}

export type StockState = { kind: "in" } | { kind: "low"; left: number } | { kind: "out" };
export const LOW_STOCK = 5;

export function stockOf(variant: ShopVariant | null): StockState {
  if (!variant || variant.stock === null) return { kind: "in" };
  if (variant.stock <= 0) return { kind: "out" };
  if (variant.stock <= LOW_STOCK) return { kind: "low", left: variant.stock };
  return { kind: "in" };
}

export function productSoldOut(product: ShopProduct): boolean {
  return product.variants.length > 0 && !product.variants.some(variantInStock);
}

export function discountPercent(product: ShopProduct): number {
  if (!isOnSale(product) || !product.compareAtKobo) return 0;
  return Math.round(((product.compareAtKobo - product.priceKobo) / product.compareAtKobo) * 100);
}

export function variantLabelOf(v: ShopVariant | null): string {
  return v ? Object.values(v.options).join(" / ") : "";
}

export type ResolvedLine = {
  index: number;
  line: CartLine;
  product: ShopProduct | null;
  variant: ShopVariant | null;
  /** Why the line can't be ordered right now, if so. */
  problem: "unavailable" | "sold_out" | null;
  unitKobo: number;
  totalKobo: number;
  /** Highest quantity the shopper can set (tracked stock), or null when untracked. */
  maxQty: number | null;
};

export function resolveCart(lines: CartLine[], shop: ShopData): ResolvedLine[] {
  return lines.map((line, index) => {
    const product = shop.products.find((p) => p.id === line.productId) ?? null;
    const variant = product && line.variantId ? product.variants.find((v) => v.id === line.variantId) ?? null : null;
    const missingVariant = !!line.variantId && !variant;
    const needsVariant = !!product && !line.variantId && product.variants.length > 0;
    if (!product || missingVariant || needsVariant) {
      return { index, line, product, variant, problem: "unavailable", unitKobo: 0, totalKobo: 0, maxQty: null };
    }
    const unit = unitPrice(product, variant);
    const maxQty = variant && variant.stock !== null ? variant.stock : null;
    const soldOut = maxQty !== null && maxQty <= 0;
    return {
      index,
      line,
      product,
      variant,
      problem: soldOut ? "sold_out" : null,
      unitKobo: unit,
      totalKobo: unit * line.quantity,
      maxQty,
    };
  });
}

export function cartSubtotal(rows: ResolvedLine[]): number {
  return rows.reduce((n, r) => n + (r.problem === "unavailable" ? 0 : r.totalKobo), 0);
}

export function productHref(baseUrl: string, product: ShopProduct): string {
  return `${baseUrl}/shop/${product.slug}`;
}

export function categoryName(shop: ShopData, product: ShopProduct): string | null {
  return shop.categories.find((c) => c.id === product.categoryId)?.name ?? null;
}

const COLOUR_HEX: Record<string, string> = {
  black: "#161616", white: "#fbfbf9", ivory: "#f1ead8", cream: "#f2e9d4", oat: "#d9ccb2", camel: "#b98a56",
  tan: "#a9753f", stone: "#b7ad9c", sand: "#d4c3a0", sage: "#9aa88b", olive: "#6b6f3a", green: "#3e6b45",
  terracotta: "#b4532a", rust: "#a4492a", red: "#b3261e", burgundy: "#6d1f2c", pink: "#e3a6b0", blush: "#e9c4c0",
  navy: "#1d2b4a", blue: "#2f5da8", grey: "#8a8a8a", gray: "#8a8a8a", charcoal: "#3b3b3d", brown: "#5b3b26",
  yellow: "#e0b83a", mustard: "#c79a2c", purple: "#5e3a7a", orange: "#d9772b", gold: "#b99a45", silver: "#bdbdc2",
};

/** CSS colour for a known colour name, else null (the option then renders as a text chip). */
export function swatchColour(name: string): string | null {
  return COLOUR_HEX[name.trim().toLowerCase()] ?? null;
}

export const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
] as const;
export type SortId = (typeof SORTS)[number]["id"];

export function sortProducts(products: ShopProduct[], sort: SortId): ShopProduct[] {
  const list = [...products];
  if (sort === "price-asc") return list.sort((a, b) => priceRange(a).min - priceRange(b).min);
  if (sort === "price-desc") return list.sort((a, b) => priceRange(b).min - priceRange(a).min);
  return list.sort((a, b) => Number(b.featured) - Number(a.featured) || a.position - b.position);
}

export function findProductBySlug(shop: ShopData, slug: string): ShopProduct | null {
  return shop.products.find((p) => p.slug === slug) ?? null;
}

/**
 * The variant a one-tap "Add to bag" can use without asking the shopper to choose:
 * none needed (no variants), or exactly one variant. "choose" when options need picking
 * (callers then link to the product page), "out" when nothing can be bought.
 */
export function quickAddTarget(product: ShopProduct): { variantId: string | null } | "choose" | "out" {
  if (product.variants.length === 0) return { variantId: null };
  if (product.variants.length === 1) {
    const only = product.variants[0]!;
    return variantInStock(only) ? { variantId: only.id } : "out";
  }
  return productSoldOut(product) ? "out" : "choose";
}

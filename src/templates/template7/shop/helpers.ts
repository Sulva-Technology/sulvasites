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

export const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "discount", label: "Biggest discount" },
] as const;
export type SortId = (typeof SORTS)[number]["id"];

export function sortProducts(products: ShopProduct[], sort: SortId): ShopProduct[] {
  const list = [...products];
  if (sort === "price-asc") return list.sort((a, b) => priceRange(a).min - priceRange(b).min);
  if (sort === "price-desc") return list.sort((a, b) => priceRange(b).min - priceRange(a).min);
  if (sort === "discount") return list.sort((a, b) => discountPercent(b) - discountPercent(a) || a.position - b.position);
  return list.sort((a, b) => Number(b.featured) - Number(a.featured) || a.position - b.position);
}

export function findProductBySlug(shop: ShopData, slug: string): ShopProduct | null {
  return shop.products.find((p) => p.slug === slug) ?? null;
}

/** Products with a compare-at price above the selling price, biggest discount first. */
export function dealProducts(shop: ShopData): ShopProduct[] {
  return shop.products
    .filter((p) => isOnSale(p) && !productSoldOut(p))
    .sort((a, b) => discountPercent(b) - discountPercent(a) || a.position - b.position);
}

export function productInStock(product: ShopProduct): boolean {
  return product.variants.length === 0 || product.variants.some(variantInStock);
}

export type ProductFilters = {
  /** Free-text search over name, description, category and variant options. */
  query: string;
  categoryId: string | null;
  /** Inclusive price bounds in kobo (compared with the product's lowest price); null = open. */
  minKobo: number | null;
  maxKobo: number | null;
  inStockOnly: boolean;
  onSaleOnly: boolean;
};

export const NO_FILTERS: ProductFilters = {
  query: "",
  categoryId: null,
  minKobo: null,
  maxKobo: null,
  inStockOnly: false,
  onSaleOnly: false,
};

/** Client-side filtering over the loaded catalogue. */
export function filterProducts(shop: ShopData, products: ShopProduct[], f: ProductFilters): ShopProduct[] {
  const terms = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return products.filter((p) => {
    if (f.categoryId && p.categoryId !== f.categoryId) return false;
    const min = priceRange(p).min;
    if (f.minKobo !== null && min < f.minKobo) return false;
    if (f.maxKobo !== null && min > f.maxKobo) return false;
    if (f.inStockOnly && !productInStock(p)) return false;
    if (f.onSaleOnly && !isOnSale(p)) return false;
    if (terms.length) {
      const hay = [
        p.name,
        p.description ?? "",
        categoryName(shop, p) ?? "",
        ...p.variants.flatMap((v) => Object.values(v.options)),
      ]
        .join(" ")
        .toLowerCase();
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
}

/**
 * The variant a one-tap "Add to cart" can use without asking the shopper to choose:
 * none needed (no variants), or exactly one variant. Null when options need picking
 * (the card then links to the product page), "out" when nothing can be bought.
 */
export function quickAddTarget(product: ShopProduct): { variantId: string | null } | "choose" | "out" {
  if (product.variants.length === 0) return { variantId: null };
  if (product.variants.length === 1) {
    const only = product.variants[0];
    return variantInStock(only) ? { variantId: only.id } : "out";
  }
  return productSoldOut(product) ? "out" : "choose";
}

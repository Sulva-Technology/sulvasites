// Shop side of the "Ask AI" assistant: what the model sees of the shop, and how its product
// proposals are validated before the owner is shown them. Pure (no I/O); the browser applies approved
// proposals under the owner's own permissions (RLS). Relative imports only (Node test runner).
import { formatNaira } from "../shop/money.ts";
import { slugify } from "../slugify.ts";
import { cleanCopyField, fitSentence, type CopyFacts } from "./quality.ts";

export type SnapshotVariant = { id: string; options: Record<string, string>; priceKobo: number | null; stock: number | null };

export type SnapshotProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceKobo: number;
  compareAtKobo: number | null;
  /** Category name, or null when uncategorised. */
  category: string | null;
  active: boolean;
  featured: boolean;
  imageCount: number;
  variants: SnapshotVariant[];
};

export type ShopSnapshot = {
  products: SnapshotProduct[];
  categories: string[];
  /** Products in the shop; may exceed products.length when the list was capped. */
  total: number;
};

/** A photo the owner can pick for a product. url is what gets saved; thumb is what the card shows. */
export type ImageChoice = {
  url: string;
  thumb: string;
  alt: string;
  /** "Photo by X on Pexels", shown under the thumbnail. */
  credit: string | null;
  source: "pexels" | "unsplash" | "library" | "upload";
  /** Why the vision model picked it (one short sentence), when it looked at the picture. */
  why: string | null;
};

export type VariantDraft = { options: Record<string, string>; priceKobo: number | null; stock: number | null };

export type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  priceKobo: number;
  compareAtKobo: number | null;
  category: string | null;
  featured: boolean;
  variants: VariantDraft[];
  /** Short stock-photo search phrase, e.g. "red leather handbag". */
  imageQuery: string;
  /** 1-based index of an owner-attached photo to use as the product image. */
  photo: number | null;
};

export type ProductFields = {
  name?: string;
  description?: string;
  priceKobo?: number;
  compareAtKobo?: number | null;
  category?: string | null;
  active?: boolean;
  featured?: boolean;
};

/** variantId null = the product has no variants yet; applying creates a single "Standard" variant. */
export type StockChange = { variantId: string | null; label: string; before: number | null; after: number | null };

export const MAX_PRODUCT_ACTIONS = 30;
export const MAX_SHOP_PRODUCTS = 80;
export const STANDARD_VARIANT: Record<string, string> = { Option: "Standard" };
const SHOP_BUDGET = 14000;
const MAX_VARIANTS = 20;
const MAX_STOCK = 100000;
const MAX_PRICE_KOBO = 100_000_000_000; // ₦1bn
const DESCRIPTION_MAX = 500;
const RESERVED_SLUGS = ["cart", "checkout", "order", "c"];
const IMAGE_HOSTS = ["images.pexels.com", "images.unsplash.com"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function clip(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

const lower = (s: string) => s.trim().toLowerCase();

// ---------- numbers the owner actually said ----------

/**
 * Every amount in the owner's own words, in naira/units: "12,500", "₦12500", "12.5k", "2m" and the
 * plain digits all count. A price or stock figure is only accepted when it is one of these, so the
 * model can never make one up.
 */
export function ownerNumbers(text: string): Set<number> {
  const out = new Set<number>();
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s?(k|m|thousand|million)?\b/gi)) {
    const base = Number(m[1]!.replace(/,/g, ""));
    if (!Number.isFinite(base)) continue;
    out.add(base);
    const unit = (m[2] ?? "").toLowerCase();
    if (unit === "k" || unit === "thousand") out.add(base * 1000);
    if (unit === "m" || unit === "million") out.add(base * 1_000_000);
  }
  return out;
}

/** Naira (number or text such as "₦12,500") to whole kobo, or null when it is not a usable price. */
export function priceToKobo(v: unknown): number | null {
  let n: number;
  if (typeof v === "number") n = v;
  else if (typeof v === "string") {
    const t = v.replace(/[₦,\s]|ngn|naira/gi, "");
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
    n = Number(t);
  } else return null;
  if (!Number.isFinite(n) || n <= 0) return null;
  const kobo = Math.round(n * 100);
  return kobo > 0 && kobo <= MAX_PRICE_KOBO ? kobo : null;
}

/** A price the owner stated; null for anything else. */
function statedPrice(v: unknown, said: Set<number>): number | null {
  const kobo = priceToKobo(v);
  return kobo !== null && said.has(kobo / 100) ? kobo : null;
}

/** A stock count: 0 is always allowed (sold out); any other figure must be one the owner stated. */
function statedStock(v: unknown, said: Set<number>): number | null | undefined {
  if (v === null) return null; // explicitly untracked
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d{1,6}$/.test(v.trim()) ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < 0 || n > MAX_STOCK) return undefined;
  return n === 0 || said.has(n) ? n : undefined;
}

// ---------- slugs, images ----------

export function uniqueProductSlug(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = slugify(name).slice(0, 60).replace(/-+$/, "") || "product";
  const root = RESERVED_SLUGS.includes(base) ? `${base}-item` : base;
  if (!used.has(root)) return root;
  for (let i = 2; i < 500; i++) if (!used.has(`${root}-${i}`)) return `${root}-${i}`;
  return `${root}-${Date.now()}`;
}

/** Only photos from the stock providers (or the site's own storage) may be saved on a product. */
export function isAllowedProductImageUrl(url: unknown, extraHosts: string[] = []): boolean {
  if (typeof url !== "string" || url.length > 600) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && [...IMAGE_HOSTS, ...extraHosts].includes(u.hostname);
  } catch {
    return false;
  }
}

// ---------- what the model sees ----------

function variantText(v: SnapshotVariant): string {
  const label = Object.values(v.options).join("/") || "default";
  return `${label}=${v.stock === null ? "untracked" : v.stock}${v.priceKobo !== null ? ` @${formatNaira(v.priceKobo)}` : ""}`;
}

/** The shop as plain lines: ids first so the model can point at an exact product. */
export function renderShop(shop: ShopSnapshot | null | undefined): string {
  if (!shop) return "SHOP: not available right now.";
  if (shop.total === 0) return "SHOP: no products yet. Categories: none.";
  const lines = [
    `SHOP: ${shop.total} product${shop.total === 1 ? "" : "s"}. Categories: ${shop.categories.length ? shop.categories.join(", ") : "none"}.`,
  ];
  let used = lines[0]!.length;
  let shown = 0;
  for (const p of shop.products) {
    const stock = p.variants.length ? p.variants.map(variantText).join("; ") : "no variants (stock not tracked)";
    const line =
      `PRODUCT id=${p.id} "${p.name}" ${formatNaira(p.priceKobo)}` +
      (p.compareAtKobo ? ` (was ${formatNaira(p.compareAtKobo)})` : "") +
      ` | ${p.category ?? "uncategorised"} | ${p.active ? "live" : "hidden"}${p.featured ? ", featured" : ""}` +
      ` | photos: ${p.imageCount} | stock: ${stock}` +
      (p.description ? ` | about: ${p.description.slice(0, 90)}` : "");
    if (used + line.length > SHOP_BUDGET) break;
    lines.push(line);
    used += line.length;
    shown++;
  }
  if (shown < shop.total) lines.push(`…and ${shop.total - shown} more products not listed.`);
  return lines.join("\n");
}

// ---------- validating the model's proposals ----------

function findProduct(shop: ShopSnapshot, raw: Record<string, unknown>): SnapshotProduct | null {
  const id = typeof raw.productId === "string" ? raw.productId : typeof raw.id === "string" ? raw.id : "";
  const byId = id ? shop.products.find((p) => p.id === id) : null;
  if (byId) return byId;
  const name = lower(clip(raw.product ?? raw.name, 120));
  if (!name) return null;
  const hits = shop.products.filter((p) => lower(p.name) === name);
  return hits.length === 1 ? hits[0]! : null;
}

function shapeVariants(raw: unknown, said: Set<number>): VariantDraft[] {
  if (!Array.isArray(raw)) return [];
  const out: VariantDraft[] = [];
  const seen = new Set<string>();
  for (const r of raw.slice(0, MAX_VARIANTS * 2)) {
    if (!isRecord(r) || !isRecord(r.options)) continue;
    const options: Record<string, string> = {};
    for (const [k, v] of Object.entries(r.options).slice(0, 3)) {
      const key = clip(k, 20);
      const value = clip(v, 30);
      if (key && value) options[key] = value;
    }
    if (!Object.keys(options).length) continue;
    const key = JSON.stringify(Object.entries(options).sort());
    if (seen.has(key)) continue;
    seen.add(key);
    const stock = "stock" in r ? statedStock(r.stock, said) : undefined;
    out.push({ options, priceKobo: "price" in r ? statedPrice(r.price, said) : null, stock: stock === undefined ? null : stock });
    if (out.length >= MAX_VARIANTS) break;
  }
  return out;
}

function matchCategory(shop: ShopSnapshot, raw: unknown): { name: string | null; isNew: boolean } {
  const name = clip(raw, 40);
  if (!name) return { name: null, isNew: false };
  const hit = shop.categories.find((c) => lower(c) === lower(name));
  return hit ? { name: hit, isNew: false } : { name, isNew: true };
}

/**
 * A new product from the model's JSON, or null when it must not be shown: no name, a name already in
 * the shop, or a price the owner never stated (the model must ask instead of guessing one).
 */
export function shapeNewProduct(
  raw: Record<string, unknown>,
  shop: ShopSnapshot,
  ownerText: string,
  facts: CopyFacts,
  takenSlugs: string[],
  takenNames: string[],
): { product: ProductDraft; categoryIsNew: boolean } | null {
  const name = clip(raw.name, 80);
  if (!name || takenNames.includes(lower(name))) return null;
  const said = ownerNumbers(ownerText);
  const priceKobo = statedPrice(raw.price, said);
  if (priceKobo === null) return null;
  const compare = statedPrice(raw.compareAtPrice ?? raw.wasPrice, said);
  const description = fitSentence(cleanCopyField(clip(raw.description, 900), "description", facts), DESCRIPTION_MAX);

  let variants = shapeVariants(raw.variants, said);
  if (variants.length === 0) {
    const stock = "stock" in raw ? statedStock(raw.stock, said) : undefined;
    if (typeof stock === "number") variants = [{ options: { ...STANDARD_VARIANT }, priceKobo: null, stock }];
  }
  const cat = matchCategory(shop, raw.category);
  const photo = Number(raw.photo);
  const product: ProductDraft = {
    name,
    slug: uniqueProductSlug(name, takenSlugs),
    description,
    priceKobo,
    compareAtKobo: compare !== null && compare > priceKobo ? compare : null,
    category: cat.name,
    featured: raw.featured === true,
    variants,
    imageQuery: clip(raw.imageQuery, 60) || name,
    photo: Number.isInteger(photo) && photo >= 1 && photo <= 4 ? photo : null,
  };
  return { product, categoryIsNew: cat.isNew };
}

export type ProductUpdate = { product: SnapshotProduct; before: ProductFields; after: ProductFields; categoryIsNew: boolean };

/** A change to an existing product: only fields that really differ, prices only if the owner stated them. */
export function shapeProductUpdate(
  raw: Record<string, unknown>,
  shop: ShopSnapshot,
  ownerText: string,
  facts: CopyFacts,
): ProductUpdate | null {
  const product = findProduct(shop, raw);
  if (!product) return null;
  const fields = isRecord(raw.fields) ? raw.fields : raw;
  const said = ownerNumbers(ownerText);
  const before: ProductFields = {};
  const after: ProductFields = {};
  let categoryIsNew = false;

  const name = clip(fields.newName, 80);
  if (name && name !== product.name) {
    before.name = product.name;
    after.name = name;
  }
  if (typeof fields.description === "string") {
    const d = fitSentence(cleanCopyField(clip(fields.description, 900), "description", facts), DESCRIPTION_MAX);
    if (d && d !== product.description) {
      before.description = product.description;
      after.description = d;
    }
  }
  if ("price" in fields) {
    const k = statedPrice(fields.price, said);
    if (k !== null && k !== product.priceKobo) {
      before.priceKobo = product.priceKobo;
      after.priceKobo = k;
    }
  }
  if ("compareAtPrice" in fields) {
    const k = fields.compareAtPrice === null ? null : statedPrice(fields.compareAtPrice, said);
    const effective = after.priceKobo ?? product.priceKobo;
    if ((k === null || k > effective) && k !== product.compareAtKobo && (k !== null || fields.compareAtPrice === null)) {
      before.compareAtKobo = product.compareAtKobo;
      after.compareAtKobo = k;
    }
  }
  if ("category" in fields) {
    const c = matchCategory(shop, fields.category);
    if (lower(c.name ?? "") !== lower(product.category ?? "")) {
      before.category = product.category;
      after.category = c.name;
      categoryIsNew = c.isNew;
    }
  }
  if (typeof fields.active === "boolean" && fields.active !== product.active) {
    before.active = product.active;
    after.active = fields.active;
  }
  if (typeof fields.featured === "boolean" && fields.featured !== product.featured) {
    before.featured = product.featured;
    after.featured = fields.featured;
  }
  if (Object.keys(after).length === 0) return null;
  return { product, before, after, categoryIsNew };
}

/** Stock counts for an existing product. Each figure must be one the owner stated (0 = sold out is always fine). */
export function shapeStockUpdate(
  raw: Record<string, unknown>,
  shop: ShopSnapshot,
  ownerText: string,
): { product: SnapshotProduct; changes: StockChange[] } | null {
  const product = findProduct(shop, raw);
  if (!product) return null;
  const said = ownerNumbers(ownerText);
  const list = Array.isArray(raw.changes) ? raw.changes : "stock" in raw ? [{ stock: raw.stock }] : [];
  const changes: StockChange[] = [];

  for (const c of list.slice(0, MAX_VARIANTS)) {
    if (!isRecord(c)) continue;
    const after = statedStock(c.stock, said);
    if (after === undefined) continue;
    if (product.variants.length === 0) {
      if (after !== null && !changes.length) changes.push({ variantId: null, label: "Standard", before: null, after });
      continue;
    }
    const id = typeof c.variantId === "string" ? c.variantId : "";
    const byId = product.variants.find((v) => v.id === id);
    const byLabel = product.variants.filter((v) => lower(Object.values(v.options).join("/")) === lower(clip(c.variant, 80)));
    const variant = byId ?? (byLabel.length === 1 ? byLabel[0] : product.variants.length === 1 ? product.variants[0] : undefined);
    if (!variant || variant.stock === after || changes.some((x) => x.variantId === variant.id)) continue;
    changes.push({ variantId: variant.id, label: Object.values(variant.options).join(" / ") || "default", before: variant.stock, after });
  }
  return changes.length ? { product, changes } : null;
}

/** Short human line for a product proposal, used when the model gave no summary. */
export function describeProduct(p: ProductDraft): string {
  const stock = p.variants.reduce((n, v) => n + (v.stock ?? 0), 0);
  return `Add “${p.name}” at ${formatNaira(p.priceKobo)}${p.variants.length ? ` (${p.variants.length} option${p.variants.length === 1 ? "" : "s"}${stock ? `, ${stock} in stock` : ""})` : ""}`;
}

// ---------- database rows (shared by the browser apply and the tests) ----------

export function productRow(siteId: string, p: ProductDraft, categoryId: string | null, images: Array<{ url: string; alt: string }>, position: number) {
  return {
    site_id: siteId,
    category_id: categoryId,
    name: p.name,
    slug: p.slug,
    description: p.description || null,
    images,
    price_kobo: p.priceKobo,
    compare_at_kobo: p.compareAtKobo,
    active: true,
    featured: p.featured,
    position,
  };
}

export function variantRows(siteId: string, productId: string, variants: VariantDraft[]) {
  return variants.map((v, position) => ({
    product_id: productId,
    site_id: siteId,
    options: v.options,
    price_kobo: v.priceKobo,
    stock: v.stock,
    sku: null,
    position,
  }));
}

// ---------- loading (rows -> snapshot) and attached photos ----------

type Row = Record<string, unknown>;

function int(v: unknown): number | null {
  if (typeof v === "number" && Number.isSafeInteger(v)) return v;
  return typeof v === "string" && /^\d{1,15}$/.test(v) ? Number(v) : null;
}

/** Shop rows (service-role reads in the route) into the compact snapshot the model reads. Unusable rows are skipped. */
export function shopFromRows(input: { categories: Row[]; products: Row[]; variants: Row[]; total?: number }): ShopSnapshot {
  const catName = new Map<string, string>();
  for (const c of input.categories) {
    if (typeof c.id === "string" && typeof c.name === "string" && c.name.trim()) catName.set(c.id, c.name.trim());
  }
  const byProduct = new Map<string, SnapshotVariant[]>();
  for (const v of input.variants) {
    if (typeof v.id !== "string" || typeof v.product_id !== "string") continue;
    const options: Record<string, string> = {};
    if (isRecord(v.options)) for (const [k, x] of Object.entries(v.options)) if (typeof x === "string") options[k] = x;
    byProduct.set(v.product_id, [
      ...(byProduct.get(v.product_id) ?? []),
      { id: v.id, options, priceKobo: v.price_kobo == null ? null : int(v.price_kobo), stock: v.stock == null ? null : (int(v.stock) ?? 0) },
    ]);
  }
  const products: SnapshotProduct[] = [];
  for (const p of input.products.slice(0, MAX_SHOP_PRODUCTS * 3)) {
    const price = int(p.price_kobo);
    if (typeof p.id !== "string" || typeof p.name !== "string" || typeof p.slug !== "string" || price === null) continue;
    products.push({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: typeof p.description === "string" ? p.description.replace(/\s+/g, " ").trim().slice(0, 300) : "",
      priceKobo: price,
      compareAtKobo: p.compare_at_kobo == null ? null : int(p.compare_at_kobo),
      category: typeof p.category_id === "string" ? (catName.get(p.category_id) ?? null) : null,
      active: p.active !== false,
      featured: p.featured === true,
      imageCount: Array.isArray(p.images) ? p.images.length : 0,
      variants: byProduct.get(p.id) ?? [],
    });
  }
  return { products, categories: [...catName.values()], total: input.total ?? products.length };
}

export const MAX_OWNER_PHOTOS = 3;
const MAX_PHOTO_CHARS = 900_000;

/** Photos the owner attached: small JPEG/PNG/WebP data URLs only, at most three. */
export function cleanOwnerPhotos(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.length <= MAX_PHOTO_CHARS && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x))
    .slice(0, MAX_OWNER_PHOTOS);
}

/** Product fields as database columns. categoryId undefined leaves the category alone; null clears it. */
export function fieldsToColumns(f: ProductFields, categoryId?: string | null): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  if (f.name !== undefined) c.name = f.name;
  if (f.description !== undefined) c.description = f.description || null;
  if (f.priceKobo !== undefined) c.price_kobo = f.priceKobo;
  if (f.compareAtKobo !== undefined) c.compare_at_kobo = f.compareAtKobo;
  if (f.active !== undefined) c.active = f.active;
  if (f.featured !== undefined) c.featured = f.featured;
  if (categoryId !== undefined) c.category_id = categoryId;
  return c;
}

/** True when the stored product still matches what the proposal was written against. */
export function productMatches(row: Record<string, unknown>, before: ProductFields, currentCategory: string | null): boolean {
  const num = (v: unknown) => (v == null ? null : Number(v));
  if (before.name !== undefined && row.name !== before.name) return false;
  if (before.description !== undefined && ((row.description as string | null) ?? "") !== before.description) return false;
  if (before.priceKobo !== undefined && num(row.price_kobo) !== before.priceKobo) return false;
  if (before.compareAtKobo !== undefined && num(row.compare_at_kobo) !== before.compareAtKobo) return false;
  if (before.active !== undefined && row.active !== before.active) return false;
  if (before.featured !== undefined && row.featured !== before.featured) return false;
  if (before.category !== undefined && lower(currentCategory ?? "") !== lower(before.category ?? "")) return false;
  return true;
}

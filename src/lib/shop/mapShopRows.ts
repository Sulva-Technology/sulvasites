/** Pure mapping of public shop DB rows to ShopData. Relative imports only (unit-tested). */
import type { ShopCategory, ShopData, ShopImage, ShopProduct, ShopVariant } from "./types.ts";
import { parseCheckoutMode } from "./checkoutMode.ts";

type Row = Record<string, unknown>;

function int(v: unknown): number | null {
  if (typeof v === "number" && Number.isSafeInteger(v)) return v;
  // PostgREST returns bigint as a JSON number; tolerate numeric strings.
  if (typeof v === "string" && /^\d{1,15}$/.test(v)) return Number(v);
  return null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function images(v: unknown): ShopImage[] {
  if (!Array.isArray(v)) return [];
  const out: ShopImage[] = [];
  for (const i of v) {
    if (typeof i === "string" && i.trim()) out.push({ url: i, alt: "" });
    else if (i && typeof i === "object") {
      const o = i as Row;
      const url = str(o.url);
      if (url) out.push({ url, alt: typeof o.alt === "string" ? o.alt : "" });
    }
  }
  return out;
}

function options(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const [k, val] of Object.entries(v as Row)) if (typeof val === "string") out[k] = val;
  }
  return out;
}

export function mapShopRows(input: {
  siteId: string;
  settings: Row;
  categories: Row[];
  products: Row[];
  variants: Row[];
}): ShopData {
  const s = input.settings;
  const categories: ShopCategory[] = [];
  for (const c of input.categories) {
    const id = str(c.id), slug = str(c.slug), name = str(c.name);
    if (id && slug && name) categories.push({ id, slug, name, position: int(c.position) ?? 0 });
  }

  const byProduct = new Map<string, ShopVariant[]>();
  for (const v of input.variants) {
    const id = str(v.id), productId = str(v.product_id);
    if (!id || !productId) continue;
    const variant: ShopVariant = {
      id,
      options: options(v.options),
      priceKobo: v.price_kobo == null ? null : int(v.price_kobo),
      stock: v.stock == null ? null : (int(v.stock) ?? 0),
      sku: str(v.sku),
      position: int(v.position) ?? 0,
    };
    byProduct.set(productId, [...(byProduct.get(productId) ?? []), variant]);
  }

  const products: ShopProduct[] = [];
  for (const p of input.products) {
    const id = str(p.id), slug = str(p.slug), name = str(p.name);
    const price = int(p.price_kobo);
    if (!id || !slug || !name || price === null) continue; // unparseable => hidden
    products.push({
      id,
      slug,
      name,
      description: str(p.description),
      images: images(p.images),
      priceKobo: price,
      compareAtKobo: p.compare_at_kobo == null ? null : int(p.compare_at_kobo),
      categoryId: str(p.category_id),
      featured: p.featured === true,
      position: int(p.position) ?? 0,
      variants: (byProduct.get(id) ?? []).sort((a, b) => a.position - b.position),
    });
  }

  return {
    siteId: input.siteId,
    currency: "NGN",
    settings: {
      deliveryFeeKobo: int(s.delivery_fee_kobo) ?? 0,
      pickupEnabled: s.pickup_enabled === true,
      pickupNote: str(s.pickup_note),
      checkoutMode: parseCheckoutMode(s.checkout_mode),
      whatsappNumber: str(s.whatsapp_orders_number),
    },
    categories: categories.sort((a, b) => a.position - b.position),
    products: products.sort((a, b) => a.position - b.position),
  };
}

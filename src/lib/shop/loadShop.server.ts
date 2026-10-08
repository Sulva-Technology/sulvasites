import type { SupabaseClient } from "@supabase/supabase-js";
import type { PricedProduct, PricedVariant } from "./pricing";
import { parseCheckoutMode, type CheckoutMode } from "./checkoutMode";

export type CheckoutSite = { id: string; slug: string };
export type CheckoutSettings = {
  delivery_fee_kobo: number;
  pickup_enabled: boolean;
  platform_fee_bps: number;
  checkout_mode: CheckoutMode;
};

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isSafeInteger(v)) return v;
  // PostgREST returns bigint as a JSON number, but be tolerant of numeric strings.
  if (typeof v === "string" && /^\d{1,15}$/.test(v)) return Number(v);
  return null;
}

/** Published site + enabled shop, or null. Service-client read; never exposes unpublished sites. */
export async function loadCheckoutContext(
  db: SupabaseClient,
  siteId: string,
): Promise<{ site: CheckoutSite; settings: CheckoutSettings } | null> {
  const { data: site, error } = await db
    .from("sites")
    .select("id, slug, status")
    .eq("id", siteId)
    .maybeSingle();
  if (error) throw new Error("Could not load site");
  if (!site || site.status !== "published") return null;

  const base = "enabled, delivery_fee_kobo, pickup_enabled, platform_fee_bps";
  let { data: s, error: sErr } = await db
    .from("shop_settings")
    .select(`${base}, checkout_mode`)
    .eq("site_id", siteId)
    .maybeSingle<Record<string, unknown>>();
  // Before migration 018 runs checkout_mode doesn't exist; fall back to the default mode.
  if (sErr?.code === "42703") {
    ({ data: s, error: sErr } = await db
      .from("shop_settings")
      .select(base)
      .eq("site_id", siteId)
      .maybeSingle<Record<string, unknown>>());
  }
  if (sErr) throw new Error("Could not load shop settings");
  if (!s || s.enabled !== true) return null;

  return {
    site: { id: site.id as string, slug: site.slug as string },
    settings: {
      delivery_fee_kobo: num(s.delivery_fee_kobo) ?? 0,
      pickup_enabled: s.pickup_enabled === true,
      platform_fee_bps: num(s.platform_fee_bps) ?? 0,
      checkout_mode: parseCheckoutMode(s.checkout_mode),
    },
  };
}

/** Products (and ALL their variants) for the given ids, restricted to this site. */
export async function loadPricingData(
  db: SupabaseClient,
  siteId: string,
  productIds: string[],
): Promise<{ products: PricedProduct[]; variants: PricedVariant[] }> {
  if (productIds.length === 0) return { products: [], variants: [] };

  const { data: prows, error } = await db
    .from("products")
    .select("id, name, price_kobo, active")
    .eq("site_id", siteId)
    .in("id", productIds);
  if (error) throw new Error("Could not load products");

  const products: PricedProduct[] = [];
  for (const p of prows ?? []) {
    const price = num(p.price_kobo);
    if (price === null) continue; // unparseable price => treated as unavailable
    products.push({ id: p.id as string, name: String(p.name), price_kobo: price, active: p.active === true });
  }

  const { data: vrows, error: vErr } = await db
    .from("product_variants")
    .select("id, product_id, price_kobo, stock, options")
    .eq("site_id", siteId)
    .in("product_id", productIds);
  if (vErr) throw new Error("Could not load variants");

  const variants: PricedVariant[] = (vrows ?? []).map((v) => {
    const options: Record<string, string> = {};
    if (v.options && typeof v.options === "object" && !Array.isArray(v.options)) {
      for (const [k, val] of Object.entries(v.options as Record<string, unknown>)) {
        if (typeof val === "string") options[k] = val;
      }
    }
    const override = v.price_kobo === null || v.price_kobo === undefined ? null : num(v.price_kobo);
    const stock = v.stock === null || v.stock === undefined ? null : (num(v.stock) ?? 0);
    return { id: v.id as string, product_id: v.product_id as string, price_kobo: override, stock, options };
  });

  return { products, variants };
}

/** Active custom-domain hostnames for a site (for callback URL validation). */
export async function loadActiveHostnames(db: SupabaseClient, siteId: string): Promise<string[]> {
  const { data, error } = await db
    .from("domains")
    .select("hostname")
    .eq("site_id", siteId)
    .eq("status", "active");
  if (error) return [];
  return (data ?? []).map((d) => String(d.hostname));
}

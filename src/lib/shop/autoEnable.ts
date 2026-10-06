// Turns the shop on without the owner having to find the switch. Relative imports only (Node test runner).
import { templateSupportsShop, TEMPLATE_META } from "../../templates/meta.ts";

type Db = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/** An online-store template: the shop is the point of the site, so it starts switched on. */
export function shopOnByDefault(templateKey: string): boolean {
  return TEMPLATE_META.some((t) => t.key === templateKey && t.shop === true);
}

/**
 * What to write so the shop is on. Products being added is the clearest signal there is, so that
 * also turns on a shop that was left off; otherwise an existing choice is respected.
 */
export function shopEnableWrite(existing: { enabled: boolean } | null, reason: "new_site" | "products"): "insert" | "update" | null {
  if (!existing) return "insert";
  if (existing.enabled) return null;
  return reason === "products" ? "update" : null;
}

/** Best effort: a failure here never blocks creating the site or the product. Returns true when the shop is on. */
export async function ensureShopEnabled(db: Db, siteId: string, reason: "new_site" | "products", templateKey?: string): Promise<boolean> {
  if (templateKey && !templateSupportsShop(templateKey)) return false;
  try {
    const { data, error } = await db.from("shop_settings").select("enabled").eq("site_id", siteId).maybeSingle();
    if (error) return false;
    const write = shopEnableWrite(data ? { enabled: data.enabled === true } : null, reason);
    if (write === "insert") {
      const { error: e } = await db.from("shop_settings").insert({ site_id: siteId, enabled: true });
      return !e;
    }
    if (write === "update") {
      const { error: e } = await db.from("shop_settings").update({ enabled: true }).eq("site_id", siteId);
      return !e;
    }
    return data?.enabled === true;
  } catch {
    return false;
  }
}

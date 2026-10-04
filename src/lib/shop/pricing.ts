import type { CartLine } from "./cart.ts";

export type PricedProduct = { id: string; name: string; price_kobo: number; active: boolean };
export type PricedVariant = {
  id: string; product_id: string; price_kobo: number | null; stock: number | null; options: Record<string, string>;
};
export type ShopPricingSettings = { delivery_fee_kobo: number; pickup_enabled: boolean };
export type PriceProblem = {
  lineIndex: number;
  reason: "unavailable" | "out_of_stock" | "insufficient_stock" | "variant_required" | "invalid_quantity";
  available?: number;
};
export type PricedItem = {
  lineIndex: number; productId: string; variantId: string | null; name: string; variantLabel: string | null;
  unitKobo: number; quantity: number; lineTotalKobo: number;
};

export function variantLabel(options: Record<string, string>): string {
  return Object.values(options).join(" / ");
}

export function priceCart(
  lines: CartLine[],
  products: PricedProduct[],
  variants: PricedVariant[],
  settings: ShopPricingSettings,
  deliveryMethod: "delivery" | "pickup",
  maxQty: number = 99,
): { items: PricedItem[]; subtotalKobo: number; deliveryKobo: number; totalKobo: number; problems: PriceProblem[] } {
  const items: PricedItem[] = [];
  const problems: PriceProblem[] = [];
  let subtotalKobo = 0;
  // Quantity already accepted per variant id (or product id when it has no variants).
  const reserved = new Map<string, number>();

  lines.forEach((line, lineIndex) => {
    const q = line.quantity as unknown;
    if (typeof q !== "number" || !Number.isSafeInteger(q) || q < 1 || q > maxQty) {
      problems.push({ lineIndex, reason: "invalid_quantity" });
      return;
    }
    const product = products.find((p) => p.id === line.productId);
    if (!product || !product.active) {
      problems.push({ lineIndex, reason: "unavailable" });
      return;
    }
    const productVariants = variants.filter((v) => v.product_id === product.id);
    let variant: PricedVariant | null = null;
    if (line.variantId === null) {
      if (productVariants.length > 0) {
        problems.push({ lineIndex, reason: "variant_required" });
        return;
      }
    } else {
      variant = productVariants.find((v) => v.id === line.variantId) ?? null;
      if (!variant) {
        problems.push({ lineIndex, reason: "unavailable" });
        return;
      }
      if (variant.stock !== null) {
        const stock = Number.isSafeInteger(variant.stock) ? Math.max(0, variant.stock) : 0;
        const available = Math.max(0, stock - (reserved.get(variant.id) ?? 0));
        if (available <= 0) {
          problems.push({ lineIndex, reason: "out_of_stock" });
          return;
        }
        if (line.quantity > available) {
          problems.push({ lineIndex, reason: "insufficient_stock", available });
          return;
        }
      }
    }
    const unitKobo = variant?.price_kobo ?? product.price_kobo;
    const lineTotalKobo = unitKobo * line.quantity;
    if (!Number.isSafeInteger(unitKobo) || unitKobo < 0 || !Number.isSafeInteger(lineTotalKobo)
      || !Number.isSafeInteger(subtotalKobo + lineTotalKobo)) {
      problems.push({ lineIndex, reason: "unavailable" });
      return;
    }
    const reserveKey = variant ? variant.id : product.id;
    reserved.set(reserveKey, (reserved.get(reserveKey) ?? 0) + line.quantity);
    subtotalKobo += lineTotalKobo;
    items.push({
      lineIndex,
      productId: product.id,
      variantId: variant ? variant.id : null,
      name: product.name,
      variantLabel: variant ? variantLabel(variant.options) : null,
      unitKobo,
      quantity: line.quantity,
      lineTotalKobo,
    });
  });

  const fee = settings.delivery_fee_kobo as unknown;
  const safeFee = typeof fee === "number" && Number.isSafeInteger(fee) && fee > 0 ? fee : 0;
  const deliveryKobo = deliveryMethod === "delivery" && subtotalKobo > 0 ? safeFee : 0;
  return { items, subtotalKobo, deliveryKobo, totalKobo: subtotalKobo + deliveryKobo, problems };
}

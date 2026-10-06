/**
 * Builds the argument object for the `create_order` SQL function (migration 010).
 * Pure: pricing happens before (priceCart); this only maps the priced cart to snake_case rpc params.
 * Relative imports only (unit-tested).
 */
import type { PricedItem } from "./pricing.ts";

export type CreateOrderInput = {
  siteId: string;
  reference: string;
  customer: { name: string; email: string; phone: string };
  deliveryMethod: "delivery" | "pickup";
  address: string | null;
  notes: string | null;
  priced: { items: PricedItem[]; subtotalKobo: number; deliveryKobo: number; totalKobo: number };
  paymentMode: "platform" | "own_keys";
  keyRef: string;
};

export function buildCreateOrderArgs(i: CreateOrderInput) {
  return {
    p_site: i.siteId,
    p_reference: i.reference,
    p_customer_name: i.customer.name,
    p_customer_email: i.customer.email,
    p_customer_phone: i.customer.phone,
    p_delivery_method: i.deliveryMethod,
    p_delivery_address: i.address,
    p_notes: i.notes,
    p_subtotal_kobo: i.priced.subtotalKobo,
    p_delivery_kobo: i.priced.deliveryKobo,
    p_total_kobo: i.priced.totalKobo,
    p_payment_mode: i.paymentMode,
    p_key_ref: i.keyRef || null,
    p_items: i.priced.items.map((it) => ({
      product_id: it.productId,
      variant_id: it.variantId,
      name: it.name,
      variant_label: it.variantLabel,
      unit_price_kobo: it.unitKobo,
      quantity: it.quantity,
      line_total_kobo: it.lineTotalKobo,
    })),
  };
}

export type CreateWhatsAppOrderInput = Omit<CreateOrderInput, "paymentMode" | "keyRef">;

/** Arguments for `create_whatsapp_order` (migration 015): create_order's, without payment mode / key ref. */
export function buildCreateWhatsAppOrderArgs(i: CreateWhatsAppOrderInput) {
  const args: Partial<ReturnType<typeof buildCreateOrderArgs>> = buildCreateOrderArgs({ ...i, paymentMode: "platform", keyRef: "" });
  delete args.p_payment_mode;
  delete args.p_key_ref;
  return args as Omit<ReturnType<typeof buildCreateOrderArgs>, "p_payment_mode" | "p_key_ref">;
}

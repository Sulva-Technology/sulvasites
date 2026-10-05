import { NextResponse } from "next/server";
import { shopRateLimit } from "@/lib/shop/rateLimit";
import { requireServiceClient, SHOP_NOT_CONFIGURED } from "@/lib/shop/serviceClient.server";
import { ShopPaymentsNotConfiguredError } from "@/lib/shop/shopSecrets.server";
import { canonicalSiteId } from "@/lib/shop/paymentInput";
import { isOrderReference } from "@/lib/shop/reference";
import { clientIp } from "@/lib/shop/requestIp";
import { settleOrder, type SettleResult } from "@/lib/shop/settleOrder.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ siteId: string; reference: string }> };

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

type OrderRow = {
  id: string;
  site_id: string;
  reference: string;
  status: string;
  payment_mode: string | null;
  paystack_key_ref?: string | null;
  customer_name: string;
  delivery_method: string;
  subtotal_kobo: number;
  delivery_kobo: number;
  total_kobo: number;
  paid_at: string | null;
  created_at: string;
};

const ORDER_COLUMNS =
  "id, site_id, reference, status, payment_mode, paystack_key_ref, customer_name, delivery_method, subtotal_kobo, delivery_kobo, total_kobo, paid_at, created_at";

/** Maps settlement to a shopper-facing payment state. */
function paymentState(order: OrderRow, settle: SettleResult | null): "paid" | "pending" | "failed" | "cancelled" | "refund_pending" {
  // Cancelled after payment was received: money is held; shop owner must refund.
  if (order.status === "cancelled" && order.paid_at) return "refund_pending";
  if (order.paid_at || order.status === "paid" || order.status === "fulfilled" || order.status === "refunded") {
    return "paid";
  }
  if (order.status === "cancelled") return "cancelled";
  if (settle?.kind === "not_success" && (settle.paystackStatus === "failed" || settle.paystackStatus === "reversed")) {
    return "failed";
  }
  return "pending";
}

export async function GET(req: Request, ctx: Ctx) {
  const { siteId: siteParam, reference } = await ctx.params;
  const siteId = canonicalSiteId(siteParam);
  if (!siteId || !isOrderReference(reference)) return json({ error: "Order not found." }, 404);

  // Each poll can hit Paystack, so cap by IP and per site. No per-reference limit: a stranger who
  // knows a reference must not be able to block the shopper's own polling.
  const ipLimited = shopRateLimit(`shop-verify:${clientIp(req)}`, 60, 60_000);
  if (ipLimited) return ipLimited;
  const siteLimited = shopRateLimit(`shop-verify-site:${siteId}`, 600, 60_000);
  if (siteLimited) return siteLimited;

  const db = requireServiceClient();
  if (!db) return json({ error: SHOP_NOT_CONFIGURED }, 500);

  try {
    const { data, error } = await db
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("site_id", siteId)
      .eq("reference", reference)
      .maybeSingle();
    if (error) throw new Error("Could not load order");
    if (!data) return json({ error: "Order not found." }, 404);
    let order = data as unknown as OrderRow;

    // Only pending, unpaid orders need a Paystack round trip.
    let settle: SettleResult | null = null;
    if (order.status === "pending" && !order.paid_at) {
      try {
        settle = await settleOrder(db, order);
      } catch (err) {
        if (err instanceof ShopPaymentsNotConfiguredError) return json({ error: SHOP_NOT_CONFIGURED }, 500);
        // Paystack hiccup: report "pending" so the page keeps polling.
        console.warn("[shop] verify could not reach Paystack", { order: order.id });
      }
      if (settle && (settle.kind === "paid" || settle.kind === "already_paid" || settle.kind === "flagged")) {
        const { data: fresh } = await db.from("orders").select(ORDER_COLUMNS).eq("id", order.id).maybeSingle();
        if (fresh) order = fresh as unknown as OrderRow;
      }
    }

    const { data: items, error: itemsError } = await db
      .from("order_items")
      .select("name, variant_label, unit_price_kobo, quantity, line_total_kobo")
      .eq("order_id", order.id)
      .order("name");
    if (itemsError) throw new Error("Could not load order items");

    const firstName = (order.customer_name || "").trim().split(/\s+/)[0] ?? "";
    return json({
      reference: order.reference,
      payment: paymentState(order, settle),
      status: order.status,
      firstName,
      deliveryMethod: order.delivery_method,
      subtotalKobo: order.subtotal_kobo,
      deliveryKobo: order.delivery_kobo,
      totalKobo: order.total_kobo,
      items: (items ?? []).map((i) => ({
        name: i.name,
        variantLabel: i.variant_label,
        unitKobo: i.unit_price_kobo,
        quantity: i.quantity,
        lineTotalKobo: i.line_total_kobo,
      })),
    });
  } catch (err) {
    console.error("[shop] verify failed", { reference, error: err instanceof Error ? err.message : "error" });
    return json({ error: "Could not check this order. Please try again." }, 500);
  }
}

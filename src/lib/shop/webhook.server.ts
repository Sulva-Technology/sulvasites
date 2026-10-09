import { NextResponse } from "next/server";
import { handleBillingWebhook } from "@/lib/billing/webhook.server";
import { isBillingWebhook } from "@/lib/billing/webhookEvents";
import { verifyPaystackSignature } from "./paystackSignature";
import { canonicalSiteId } from "./paymentInput";
import { isOrderReference } from "./reference";
import { getShopPaymentConfig, ShopPaymentsNotConfiguredError } from "./shopSecrets.server";
import { requireServiceClient, SHOP_NOT_CONFIGURED } from "./serviceClient.server";
import { shopRateLimit } from "./rateLimit";
import { clientIp } from "./requestIp";
import { settleOrder } from "./settleOrder.server";

const MAX_BODY_CHARS = 256 * 1024;
const SITE_MAX_BODY_BYTES = 64 * 1024;

export type WebhookScope = { kind: "platform" } | { kind: "site"; siteIdParam: string };

function ok(extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: true, ...extra }, { status: 200, headers: { "Cache-Control": "no-store" } });
}

function status(code: number, error: string) {
  return NextResponse.json({ error }, { status: code, headers: { "Cache-Control": "no-store" } });
}

/**
 * Shared Paystack webhook handler.
 * - platform scope: signed with PAYSTACK_SECRET_KEY, only settles `platform` orders.
 * - site scope: signed with that shop's own secret key, only settles that site's `own_keys` orders.
 * Bad signature => 401. Unknown site/order, other events, or flagged payments => 200 (ignored/logged).
 * Infrastructure failures => 5xx so Paystack retries.
 */
export async function handlePaystackWebhook(req: Request, scope: WebhookScope): Promise<NextResponse> {
  if (scope.kind === "site") {
    // Public per-site endpoint: cap size and rate before any DB read.
    const declared = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > SITE_MAX_BODY_BYTES) return status(413, "Payload too large");
    const key = `shop-webhook-site:${scope.siteIdParam.toLowerCase().slice(0, 64)}:${clientIp(req)}`;
    const limited = shopRateLimit(key, 60, 60_000);
    if (limited) return limited;
  }
  // Raw body must be read exactly once, before any parsing, so the HMAC matches.
  const raw = await req.text();
  if (raw.length > (scope.kind === "site" ? SITE_MAX_BODY_BYTES : MAX_BODY_CHARS)) return status(413, "Payload too large");
  const signature = req.headers.get("x-paystack-signature");

  let secret: string;
  let siteId: string | null = null;
  try {
    if (scope.kind === "platform") {
      const s = process.env.PAYSTACK_SECRET_KEY;
      if (!s) return status(500, SHOP_NOT_CONFIGURED);
      secret = s;
    } else {
      siteId = canonicalSiteId(scope.siteIdParam);
      if (!siteId) return ok({ ignored: "unknown_site" });
      const cfg = await getShopPaymentConfig(siteId, "own_keys");
      if (!cfg || cfg.mode !== "own_keys") return ok({ ignored: "unknown_site" });
      secret = cfg.secret;
    }
  } catch (err) {
    if (err instanceof ShopPaymentsNotConfiguredError) return status(500, SHOP_NOT_CONFIGURED);
    return status(500, "Webhook unavailable");
  }

  if (!verifyPaystackSignature(raw, signature, secret)) return status(401, "Invalid signature");

  let event: { event?: unknown; data?: { reference?: unknown } };
  try {
    event = JSON.parse(raw);
  } catch {
    return ok({ ignored: "bad_json" });
  }
  // Subscription billing shares Sulvatech's single Paystack webhook URL.
  if (scope.kind === "platform" && isBillingWebhook(event)) {
    const billingDb = requireServiceClient();
    if (!billingDb) return status(500, SHOP_NOT_CONFIGURED);
    return handleBillingWebhook(billingDb, event);
  }

  if (!event || typeof event !== "object" || event.event !== "charge.success") return ok({ ignored: "event" });

  const reference = event.data?.reference;
  if (!isOrderReference(reference)) return ok({ ignored: "reference" });

  const db = requireServiceClient();
  if (!db) return status(500, SHOP_NOT_CONFIGURED);

  try {
    const { data: order, error } = await db
      .from("orders")
      .select("id, site_id, reference, payment_mode, paystack_key_ref")
      .eq("reference", reference)
      .maybeSingle();
    if (error) return status(500, "Webhook unavailable");
    if (!order) {
      console.warn("[shop] webhook for unknown order", { reference });
      return ok({ ignored: "unknown_order" });
    }

    const expectedMode = scope.kind === "platform" ? "platform" : "own_keys";
    if (order.payment_mode !== expectedMode || (siteId !== null && order.site_id !== siteId)) {
      console.warn("[shop] webhook scope mismatch", { order: order.id, scope: scope.kind });
      return ok({ ignored: "scope" });
    }

    const result = await settleOrder(db, order);
    return ok({ result: result.kind });
  } catch (err) {
    console.error("[shop] webhook processing failed", { reference, error: err instanceof Error ? err.name : "error" });
    return status(500, "Webhook processing failed");
  }
}

import { NextResponse } from "next/server";
import { shopRateLimit } from "@/lib/shop/rateLimit";
import { paystackRequest, PaystackError } from "@/lib/shop/paystack.server";
import { requireServiceClient, SHOP_NOT_CONFIGURED } from "@/lib/shop/serviceClient.server";
import { getShopPaymentConfig, ShopPaymentsNotConfiguredError } from "@/lib/shop/shopSecrets.server";
import { canonicalSiteId } from "@/lib/shop/paymentInput";
import { parseCheckoutBody } from "@/lib/shop/checkoutInput";
import { priceCart } from "@/lib/shop/pricing";
import { platformFeeKobo } from "@/lib/shop/money";
import { newOrderReference } from "@/lib/shop/reference";
import { resolveCallbackUrl } from "@/lib/shop/callbackUrl";
import { clientIp } from "@/lib/shop/requestIp";
import { loadActiveHostnames, loadCheckoutContext, loadPricingData } from "@/lib/shop/loadShop.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ siteId: string }> };

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BODY_CHARS = 32 * 1024;
const PAYMENT_FAILED = "We couldn't start your payment. Please try again.";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function POST(req: Request, ctx: Ctx) {
  const { siteId: siteParam } = await ctx.params;
  const siteId = canonicalSiteId(siteParam);
  if (!siteId) return json({ error: "Shop not found." }, 404);

  // Cheap per-IP limit up front; the per-site backstop runs only after the request is valid and priced,
  // so garbage requests can't exhaust the site's budget and lock out real shoppers.
  const ipLimited = shopRateLimit(`shop-checkout:${clientIp(req)}`, 10, 60_000);
  if (ipLimited) return ipLimited;

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_CHARS) return json({ error: "Request too large." }, 413);
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = parseCheckoutBody(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const input = parsed.value;

  const db = requireServiceClient();
  if (!db) return json({ error: SHOP_NOT_CONFIGURED }, 500);

  try {
    const ctxData = await loadCheckoutContext(db, siteId);
    if (!ctxData) return json({ error: "This shop is not open for orders." }, 404);
    const { site, settings } = ctxData;

    if (input.deliveryMethod === "pickup" && !settings.pickup_enabled) {
      return json({ error: "Pickup is not available for this shop." }, 400);
    }

    // Current payment mode; its snapshot is stored on the order for verify/webhooks.
    let payment;
    try {
      payment = await getShopPaymentConfig(siteId);
    } catch (err) {
      if (err instanceof ShopPaymentsNotConfiguredError) return json({ error: SHOP_NOT_CONFIGURED }, 500);
      throw err;
    }
    if (!payment) return json({ error: "This shop can't take payments yet." }, 409);

    // Authoritative pricing from the database; client prices are never accepted.
    const productIds = [...new Set(input.lines.map((l) => l.productId))];
    const { products, variants } = await loadPricingData(db, siteId, productIds);
    const priced = priceCart(input.lines, products, variants, settings, input.deliveryMethod);
    if (priced.problems.length > 0) {
      return json({ error: "Some items in your cart changed. Please review your cart.", problems: priced.problems }, 409);
    }
    if (priced.items.length === 0 || priced.totalKobo <= 0) {
      return json({ error: "Your cart is empty." }, 400);
    }

    const siteLimited = shopRateLimit(`shop-checkout-site:${siteId}`, 300, 60_000);
    if (siteLimited) return siteLimited;

    const platformDomain = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "soothecontrols.site").trim().toLowerCase();
    const customHosts = await loadActiveHostnames(db, siteId);

    // Create the order (retry on the rare reference collision).
    let order: { id: string; reference: string } | null = null;
    for (let attempt = 0; attempt < 3 && !order; attempt++) {
      const reference = newOrderReference();
      const { data, error } = await db
        .from("orders")
        .insert({
          site_id: siteId,
          reference,
          status: "pending",
          customer_name: input.customer.name,
          customer_email: input.customer.email,
          customer_phone: input.customer.phone,
          delivery_method: input.deliveryMethod,
          delivery_address: input.address,
          notes: input.notes,
          subtotal_kobo: priced.subtotalKobo,
          delivery_kobo: priced.deliveryKobo,
          total_kobo: priced.totalKobo,
          payment_mode: payment.mode,
        })
        .select("id, reference")
        .single();
      if (!error && data) {
        order = { id: data.id as string, reference: data.reference as string };
      } else if (error?.code !== "23505") {
        throw new Error("Could not create order");
      }
    }
    if (!order) throw new Error("Could not create order");

    const { error: itemsError } = await db.from("order_items").insert(
      priced.items.map((it) => ({
        order_id: order!.id,
        site_id: siteId,
        product_id: it.productId,
        variant_id: it.variantId,
        name: it.name,
        variant_label: it.variantLabel,
        unit_price_kobo: it.unitKobo,
        quantity: it.quantity,
        line_total_kobo: it.lineTotalKobo,
      })),
    );
    if (itemsError) {
      await db.from("orders").delete().eq("id", order.id); // no payment attempted yet
      throw new Error("Could not create order items");
    }

    const callbackUrl = resolveCallbackUrl({
      returnUrl: input.returnUrl,
      slug: site.slug,
      reference: order.reference,
      platformDomain,
      customHosts,
      fallbackOrigin: process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim() || null,
      allowLocal: process.env.NODE_ENV !== "production",
    });
    if (!callbackUrl) {
      await db.from("orders").delete().eq("id", order.id);
      return json({ error: SHOP_NOT_CONFIGURED }, 500);
    }

    const initBody: Record<string, unknown> = {
      amount: priced.totalKobo,
      email: input.customer.email,
      reference: order.reference,
      currency: "NGN",
      callback_url: callbackUrl,
      metadata: { site_id: siteId, order_id: order.id },
    };
    let secret: string;
    if (payment.mode === "platform") {
      secret = payment.platformSecret;
      initBody.subaccount = payment.subaccountCode;
      initBody.bearer = "subaccount";
      const fee = platformFeeKobo(priced.totalKobo, settings.platform_fee_bps);
      // Omitted when 0. Only correct if subaccounts are created with percentage_charge 0
      // (otherwise Paystack applies the subaccount's stored percentage when this is absent).
      if (fee > 0) initBody.transaction_charge = fee;
    } else {
      secret = payment.secret;
    }

    let authorizationUrl: string;
    try {
      const init = await paystackRequest<{ authorization_url?: unknown }>("/transaction/initialize", {
        method: "POST",
        secret,
        body: initBody,
      });
      authorizationUrl = typeof init?.authorization_url === "string" ? init.authorization_url : "";
    } catch (err) {
      // Order stays pending (hidden from the inbox after 24h); never echo Paystack details to shoppers.
      console.error("[shop] paystack initialize failed", {
        order: order.id,
        status: err instanceof PaystackError ? err.status : undefined,
      });
      return json({ error: PAYMENT_FAILED }, 502);
    }
    if (!authorizationUrl.startsWith("https://")) {
      console.error("[shop] paystack initialize returned no authorization url", { order: order.id });
      return json({ error: PAYMENT_FAILED }, 502);
    }

    return json({ authorizationUrl, reference: order.reference });
  } catch (err) {
    console.error("[shop] checkout failed", { site: siteId, error: err instanceof Error ? err.message : "error" });
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}

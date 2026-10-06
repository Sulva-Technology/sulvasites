import { NextResponse } from "next/server";
import { shopRateLimit } from "@/lib/shop/rateLimit";
import { requireServiceClient, SHOP_NOT_CONFIGURED } from "@/lib/shop/serviceClient.server";
import { canonicalSiteId } from "@/lib/shop/paymentInput";
import { DELIVERY_UNDECIDED_NOTE, parseWhatsAppOrderBody } from "@/lib/shop/whatsappOrderInput";
import { priceCart } from "@/lib/shop/pricing";
import { newOrderReference } from "@/lib/shop/reference";
import { buildCreateWhatsAppOrderArgs } from "@/lib/shop/createOrderArgs";
import { clientIp } from "@/lib/shop/requestIp";
import { loadCheckoutContext, loadPricingData } from "@/lib/shop/loadShop.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ siteId: string }> };

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BODY_CHARS = 32 * 1024;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/**
 * Registers a bag the shopper is about to send to the business on WhatsApp as a pending order
 * (channel 'whatsapp'), priced from the database like checkout. The shop owner later confirms it
 * with "Mark completed" (complete_whatsapp_order, migration 015). No payment is taken here.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { siteId: siteParam } = await ctx.params;
  const siteId = canonicalSiteId(siteParam);
  if (!siteId) return json({ error: "Shop not found." }, 404);

  const ipLimited = shopRateLimit(`shop-whatsapp:${clientIp(req)}`, 10, 60_000);
  if (ipLimited) return ipLimited;

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_CHARS) return json({ error: "Request too large." }, 413);
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = parseWhatsAppOrderBody(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const input = parsed.value;

  const db = requireServiceClient();
  if (!db) return json({ error: SHOP_NOT_CONFIGURED }, 500);

  try {
    const ctxData = await loadCheckoutContext(db, siteId);
    if (!ctxData) return json({ error: "This shop is not open for orders." }, 404);
    const { settings } = ctxData;

    if (input.deliveryMethod === "pickup" && !settings.pickup_enabled) {
      return json({ error: "Pickup is not available for this shop." }, 400);
    }
    // From the bag nothing is chosen yet. Delivery is certain when it's the only option; otherwise
    // the fee is left out and the order notes say it's to be agreed in the chat.
    const undecided = input.deliveryMethod === null && settings.pickup_enabled;
    const method = input.deliveryMethod ?? "delivery";

    const productIds = [...new Set(input.lines.map((l) => l.productId))];
    const { products, variants } = await loadPricingData(db, siteId, productIds);
    const priced = priceCart(input.lines, products, variants, settings, undecided ? "pickup" : method);
    if (priced.problems.length > 0) {
      return json({ error: "Some items in your cart changed. Please review your cart.", problems: priced.problems }, 409);
    }
    if (priced.items.length === 0 || priced.totalKobo <= 0) return json({ error: "Your cart is empty." }, 400);

    const siteLimited = shopRateLimit(`shop-whatsapp-site:${siteId}`, 300, 60_000);
    if (siteLimited) return siteLimited;

    const notes = [input.notes, undecided ? DELIVERY_UNDECIDED_NOTE : null].filter(Boolean).join("\n") || null;

    let reference: string | null = null;
    for (let attempt = 0; attempt < 3 && !reference; attempt++) {
      const candidate = newOrderReference();
      const { data, error } = await db.rpc(
        "create_whatsapp_order",
        buildCreateWhatsAppOrderArgs({
          siteId,
          reference: candidate,
          customer: input.customer,
          deliveryMethod: method,
          address: method === "delivery" ? input.address : null,
          notes,
          priced,
        }),
      );
      if (!error && typeof data === "string") reference = candidate;
      else if (error?.code !== "23505") throw new Error("Could not create order");
    }
    if (!reference) throw new Error("Could not create order");

    return json({
      reference,
      deliveryMethod: undecided ? null : method,
      subtotalKobo: priced.subtotalKobo,
      deliveryKobo: priced.deliveryKobo,
      totalKobo: priced.totalKobo,
      items: priced.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        variantLabel: i.variantLabel,
        unitKobo: i.unitKobo,
        quantity: i.quantity,
        lineTotalKobo: i.lineTotalKobo,
      })),
    });
  } catch (err) {
    console.error("[shop] whatsapp order failed", { site: siteId, error: err instanceof Error ? err.message : "error" });
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}

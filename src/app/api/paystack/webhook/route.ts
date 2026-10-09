import { handlePaystackWebhook } from "@/lib/shop/webhook.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Settling a first charge makes several Paystack calls; a stale settling claim is reclaimable after 5 min.
export const maxDuration = 60;

// Platform-mode webhook (Sulvatech's Paystack account). Own-keys shops use /api/paystack/webhook/[siteId].
export async function POST(req: Request) {
  return handlePaystackWebhook(req, { kind: "platform" });
}

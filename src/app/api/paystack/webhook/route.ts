import { handlePaystackWebhook } from "@/lib/shop/webhook.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Platform-mode webhook (Sulvatech's Paystack account). Own-keys shops use /api/paystack/webhook/[siteId].
export async function POST(req: Request) {
  return handlePaystackWebhook(req, { kind: "platform" });
}

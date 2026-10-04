import { handlePaystackWebhook } from "@/lib/shop/webhook.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ siteId: string }> };

// Own-keys webhook: signed with that shop's own Paystack secret key.
export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  return handlePaystackWebhook(req, { kind: "site", siteIdParam: siteId });
}

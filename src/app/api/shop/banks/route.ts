import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/supabase/requireAdmin.server";
import { paystackRequest, PaystackError } from "@/lib/shop/paystack.server";
import { SHOP_NOT_CONFIGURED } from "@/lib/shop/serviceClient.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Bank = { name: string; code: string };
type PaystackBank = { name?: unknown; code?: unknown; active?: unknown; is_deleted?: unknown };

const TTL_MS = 24 * 60 * 60 * 1000;
let cache: { banks: Bank[]; at: number } | null = null;
let inflight: Promise<Bank[]> | null = null;

async function loadBanks(secret: string): Promise<Bank[]> {
  const raw = await paystackRequest<PaystackBank[]>("/bank?country=nigeria&perPage=200", { secret });
  const banks: Bank[] = [];
  const seen = new Set<string>();
  for (const b of Array.isArray(raw) ? raw : []) {
    if (typeof b?.name !== "string" || typeof b?.code !== "string") continue;
    if (b.active === false || b.is_deleted === true) continue;
    if (seen.has(b.code)) continue;
    seen.add(b.code);
    banks.push({ name: b.name, code: b.code });
  }
  banks.sort((a, b) => a.name.localeCompare(b.name));
  return banks;
}

export async function GET(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: SHOP_NOT_CONFIGURED }, { status: 500 });

  if (!cache || Date.now() - cache.at > TTL_MS) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limited = rateLimit(`shop-banks:${ip}`, { limit: 20, windowMs: 60_000 });
    if (limited) return limited;
    try {
      // One upstream call at a time, shared by concurrent requests.
      inflight ??= loadBanks(secret).finally(() => {
        inflight = null;
      });
      const banks = await inflight;
      if (banks.length) cache = { banks, at: Date.now() };
      else return NextResponse.json({ error: "Paystack returned no banks." }, { status: 502 });
    } catch (err) {
      const message = err instanceof PaystackError ? err.message : "Could not load banks.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  return NextResponse.json(
    { banks: cache.banks },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}

import { NextResponse } from "next/server";
import { rateLimit, requireAdmin } from "@/lib/supabase/requireAdmin.server";
import { paystackRequestWithMeta, PaystackError } from "@/lib/shop/paystack.server";
import { SHOP_NOT_CONFIGURED } from "@/lib/shop/serviceClient.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Used by the admin payments UI only. Auth: Sulvatech admins (owners arrive with the dashboard).

type Bank = { name: string; code: string };
type PaystackBank = { name?: unknown; code?: unknown; active?: unknown; is_deleted?: unknown };

const TTL_MS = 24 * 60 * 60 * 1000;
const FAILURE_BACKOFF_MS = 60_000;
const MAX_PAGES = 10;
const LOAD_FAILED = "Could not load banks.";

let cache: { banks: Bank[]; at: number } | null = null;
let failedAt = 0;
let inflight: Promise<Bank[]> | null = null;

async function loadBanks(secret: string): Promise<Bank[]> {
  const banks: Bank[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({ country: "nigeria", perPage: "100", use_cursor: "true" });
    if (cursor) qs.set("next", cursor);
    const { data, meta } = await paystackRequestWithMeta<PaystackBank[]>(`/bank?${qs.toString()}`, { secret });
    for (const b of Array.isArray(data) ? data : []) {
      if (typeof b?.name !== "string" || typeof b?.code !== "string") continue;
      if (b.active === false || b.is_deleted === true) continue;
      if (seen.has(b.code)) continue;
      seen.add(b.code);
      banks.push({ name: b.name, code: b.code });
    }
    const next = meta?.next;
    if (typeof next !== "string" || !next || next === cursor) break;
    cursor = next;
  }
  banks.sort((a, b) => a.name.localeCompare(b.name));
  return banks;
}

function failure() {
  return NextResponse.json({ error: LOAD_FAILED }, { status: 502 });
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const perUser = rateLimit(`shop-banks:${auth.userId}`, { limit: 30, windowMs: 60_000 });
  if (perUser) return perUser;

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: SHOP_NOT_CONFIGURED }, { status: 500 });

  if (!cache || Date.now() - cache.at > TTL_MS) {
    if (Date.now() - failedAt < FAILURE_BACKOFF_MS) return failure();
    if (!inflight) {
      // Global cap on upstream fetches, whoever asks.
      const global = rateLimit("shop-banks", { limit: 10, windowMs: 60_000 });
      if (global) return global;
      inflight = loadBanks(secret).finally(() => {
        inflight = null;
      });
    }
    try {
      const banks = await inflight;
      if (!banks.length) throw new PaystackError(502, "empty");
      cache = { banks, at: Date.now() };
    } catch (err) {
      failedAt = Date.now();
      console.error("[shop/banks] Paystack bank list failed", err instanceof PaystackError ? err.status : "error");
      return failure();
    }
  }

  return NextResponse.json({ banks: cache.banks }, { headers: { "Cache-Control": "private, max-age=3600" } });
}

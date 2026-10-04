import { NextResponse } from "next/server";
import { checkWindow, MAX_KEYS, type Bucket } from "./rateWindow";

const buckets = new Map<string, Bucket>();

/** Best-effort in-memory limiter for public shop routes. Returns a 429 response when limited. */
export function shopRateLimit(key: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  const retryAfter = checkWindow(buckets, key, limit, windowMs, now, MAX_KEYS);
  if (retryAfter === null) return null;
  return NextResponse.json(
    { error: `Too many requests. Try again in ${retryAfter}s.` },
    { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
  );
}

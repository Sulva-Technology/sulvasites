import { NextResponse } from "next/server";

import { TRACK_LIMITS } from "@/lib/insights/limits";
import { countryFromHeaders, deviceClass, hasPrivacySignal, isBot, parseTrackBody, referrerHost } from "@/lib/insights/track";
import { utcDay, visitorHash } from "@/lib/insights/visitor";
import { canonicalSiteId } from "@/lib/shop/paymentInput";
import { shopRateLimit } from "@/lib/shop/rateLimit";
import { clientIp } from "@/lib/shop/requestIp";
import { requireServiceClient } from "@/lib/shop/serviceClient.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ siteId: string }> };

const NO_STORE = { "Cache-Control": "no-store" };
const ok = () => new NextResponse(null, { status: 204, headers: NO_STORE });
const fail = (status: number) => new NextResponse(null, { status, headers: NO_STORE });

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/**
 * Public, unauthenticated page-view beacon. Privacy: no cookies; raw IP and user agent are only used to
 * derive a daily-rotating salted hash and are never stored. Honours Do-Not-Track / Global Privacy Control,
 * ignores bots, and records published sites only. Always answers with an empty body.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { siteId: siteParam } = await ctx.params;
  const siteId = canonicalSiteId(siteParam);
  if (!siteId) return fail(404);

  // Privacy signals and bots: succeed silently so the client never retries or reveals anything.
  if (hasPrivacySignal(req.headers)) return ok();
  const ua = req.headers.get("user-agent") ?? "";
  if (isBot(ua)) return ok();

  const ip = clientIp(req);
  const ipLimited = shopRateLimit(`track-ip:${ip}`, TRACK_LIMITS.ipMax, TRACK_LIMITS.ipWindowMs);
  if (ipLimited) return fail(429);
  const pairLimited = shopRateLimit(`track-ip-site:${ip}:${siteId}`, TRACK_LIMITS.ipSiteMax, TRACK_LIMITS.ipSiteWindowMs);
  if (pairLimited) return fail(429);

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > TRACK_LIMITS.maxBodyChars * 4) return fail(413);
  const text = await req.text();
  const parsed = parseTrackBody(text);
  if (!parsed.ok) return fail(400);
  const { path, referrer } = parsed.value;

  const db = requireServiceClient();
  if (!db) return ok();

  try {
    const { data: site, error: siteErr } = await db.from("sites").select("id, status").eq("id", siteId).maybeSingle();
    if (siteErr) throw new Error("site lookup");
    if (!site || site.status !== "published") return fail(404);

    const siteLimited = shopRateLimit(`track-site:${siteId}`, TRACK_LIMITS.siteMax, TRACK_LIMITS.siteWindowMs);
    if (siteLimited) return fail(429);

    const secret = process.env.INSIGHTS_SALT?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!secret) return ok();

    const ownHost = hostOf(req.headers.get("origin")) ?? req.headers.get("host");
    const { error: insErr } = await db.from("page_views").insert({
      site_id: siteId,
      path,
      referrer_host: referrerHost(referrer, ownHost),
      device: deviceClass(ua),
      country: countryFromHeaders(req.headers),
      visitor: visitorHash(secret, utcDay(new Date()), siteId, ip, ua),
    });
    if (insErr) throw new Error("insert");
    return ok();
  } catch (err) {
    console.error("[insights] track failed", { site: siteId, step: err instanceof Error ? err.message : "error" });
    // Analytics must never surface problems to visitors.
    return ok();
  }
}

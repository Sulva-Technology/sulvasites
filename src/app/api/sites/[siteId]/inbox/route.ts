import { NextResponse } from "next/server";
import { shopRateLimit } from "@/lib/shop/rateLimit";
import { requireServiceClient } from "@/lib/shop/serviceClient.server";
import { canonicalSiteId } from "@/lib/shop/paymentInput";
import { clientIp } from "@/lib/shop/requestIp";
import { INBOX_LIMITS } from "@/lib/inbox/limits";
import { parseInboxBody, spamScore, SPAM_THRESHOLD } from "@/lib/inbox/input";
import { buildNotification, isNotifiable, sendResend } from "@/lib/inbox/notify";
import { siteGateMessage } from "@/lib/billing/gates";
import { loadSubscription } from "@/lib/billing/subscriptions.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ siteId: string }> };

const NO_STORE = { "Cache-Control": "no-store" };
const UNAVAILABLE = "We couldn't send your message right now. Please call or email us directly.";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/** Public, unauthenticated: stores a visitor enquiry/booking for a published site and emails the business. */
export async function POST(req: Request, ctx: Ctx) {
  const { siteId: siteParam } = await ctx.params;
  const siteId = canonicalSiteId(siteParam);
  if (!siteId) return json({ error: "Not found." }, 404);

  const ipLimited = shopRateLimit(`inbox-ip:${clientIp(req)}`, INBOX_LIMITS.ipMax, INBOX_LIMITS.ipWindowMs);
  if (ipLimited) return ipLimited;

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > INBOX_LIMITS.maxBodyChars * 4) return json({ error: "Request too large." }, 413);
  const rawBody = await req.text();
  if (rawBody.length > INBOX_LIMITS.maxBodyChars) return json({ error: "Request too large." }, 413);
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = parseInboxBody(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const input = parsed.value;

  // Honeypot: look successful, store nothing.
  if (input.honeypot) return json({ ok: true });

  const db = requireServiceClient();
  if (!db) return json({ error: UNAVAILABLE }, 503);

  try {
    const { data: site, error: siteErr } = await db
      .from("sites")
      .select("id, slug, status")
      .eq("id", siteId)
      .maybeSingle();
    if (siteErr) throw new Error("site lookup");
    if (!site || site.status !== "published") return json({ error: "Not found." }, 404);

    const billingGate = siteGateMessage(await loadSubscription(db, siteId), Date.now());
    if (billingGate) return json({ error: billingGate }, 403);

    const siteLimited = shopRateLimit(`inbox-site:${siteId}`, INBOX_LIMITS.siteMax, INBOX_LIMITS.siteWindowMs);
    if (siteLimited) return siteLimited;

    const score = spamScore(input);
    const isSpam = score >= SPAM_THRESHOLD;

    const { data: row, error: insErr } = await db
      .from("inbox_messages")
      .insert({
        site_id: siteId,
        kind: input.kind,
        name: input.name,
        email: input.email,
        phone: input.phone,
        message: input.message,
        extra: input.extra,
        source_page: input.sourcePage,
        spam_score: score,
        is_spam: isSpam,
      })
      .select("id")
      .single();
    if (insErr || !row) throw new Error("insert");

    // Email is best-effort: the message is already stored, so nothing below may fail the request.
    if (!isSpam) {
      try {
        const { data: profile } = await db
          .from("business_profiles")
          .select("business_name, email")
          .eq("site_id", siteId)
          .maybeSingle();
        const cfg = {
          apiKey: process.env.RESEND_API_KEY?.trim() || null,
          from: process.env.RESEND_FROM?.trim() || null,
          to: typeof profile?.email === "string" ? profile.email.trim() : null,
        };
        if (isNotifiable(cfg)) {
          const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim().replace(/\/+$/, "");
          const mail = buildNotification({
            siteName: (profile?.business_name as string | undefined) || (site.slug as string),
            kind: input.kind,
            name: input.name,
            email: input.email,
            phone: input.phone,
            message: input.message,
            extra: input.extra,
            dashboardUrl: origin ? `${origin}/dashboard/${siteId}/inbox` : null,
          });
          const sent = await sendResend(
            { apiKey: cfg.apiKey!, from: cfg.from!, to: cfg.to!, replyTo: input.email },
            mail,
          );
          if (sent) {
            await db.from("inbox_messages").update({ notified_at: new Date().toISOString() }).eq("id", row.id);
          } else {
            console.error("[inbox] notification email failed", { site: siteId, message: row.id });
          }
        }
      } catch {
        console.error("[inbox] notification step failed", { site: siteId, message: row.id });
      }
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[inbox] submit failed", { site: siteId, step: err instanceof Error ? err.message : "error" });
    return json({ error: UNAVAILABLE }, 500);
  }
}

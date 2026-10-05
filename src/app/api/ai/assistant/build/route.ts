import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/lib/ai/http.server";
import { MAX_SETUP_UPLOADS, MAX_STOCK_PICKS, isAllowedStockUrl } from "@/lib/ai/setupPhotos";
import {
  buildSite,
  finishSite,
  planSite,
  rehydratePlan,
  writePage,
  writeProfile,
  profileFromBrief,
  type PageResult,
  type SiteProfile,
} from "@/lib/ai/siteBuilder";
import { validatePageData, type PageData } from "@/lib/pageSchema";
import { rateLimit, requireAdmin } from "@/lib/supabase/requireAdmin.server";

// Each stage is its own request, so every call stays well inside the 60s function limit.
export const maxDuration = 60;

const MAX_BODY_CHARS = 700_000;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function str(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function toProfile(raw: unknown, fallbackName: string): SiteProfile {
  const r = isRecord(raw) ? raw : {};
  const s = isRecord(r.socials) ? r.socials : {};
  const n = (v: unknown, max = 300) => str(v, max) || null;
  return {
    business_name: str(r.business_name, 120) || fallbackName,
    tagline: n(r.tagline, 120),
    description: n(r.description, 600),
    address: n(r.address, 200),
    phone: n(r.phone, 40),
    email: n(r.email, 120),
    whatsapp: n(r.whatsapp, 40),
    socials: { instagram: n(s.instagram), facebook: n(s.facebook), twitter: n(s.twitter), tiktok: n(s.tiktok) },
  };
}

function toResult(raw: unknown): PageResult | null {
  if (!isRecord(raw) || typeof raw.key !== "string" || !validatePageData(raw.data).ok) return null;
  const data = raw.data as PageData;
  if (!Array.isArray(data.sections) || typeof data.seo?.title !== "string") return null;
  return {
    key: raw.key.slice(0, 40),
    data,
    repairRounds: Number(raw.repairRounds) || 0,
    fallbackTypes: Array.isArray(raw.fallbackTypes) ? raw.fallbackTypes.filter((x): x is string => typeof x === "string").slice(0, 12) : [],
    aiFailed: raw.aiFailed === true,
  };
}

/**
 * POST /api/ai/assistant/build
 * body.stage: "plan" | "profile" | "page" | "finish" | "all" (default "all").
 *  plan    { messages?, state?, templateOverride? }  -> { plan }
 *  profile { plan }                                   -> { profile }
 *  page    { plan, key, avoid? }                      -> { result }
 *  finish  { plan, profile, results[], uploadSlots?, preferredImages? } -> BuildResult
 *          (uploadSlots: 0-8 "upload:N" gallery placeholders; preferredImages: <= 12 Unsplash photo urls)
 *  all     { messages?, state?, templateOverride? }   -> BuildResult (may exceed 60s on slow models; the UI uses stages)
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const limited = rateLimit(`ai-build:${auth.userId}`, { limit: 80, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_CHARS) return bad("Request too large.", 413);
    body = JSON.parse(text);
  } catch {
    return bad("Invalid JSON body.");
  }
  if (!isRecord(body)) return bad("Invalid body.");

  const stage = typeof body.stage === "string" ? body.stage : "all";
  try {
    switch (stage) {
      case "plan": {
        const plan = await planSite({ messages: body.messages, state: body.state, templateOverride: str(body.templateOverride, 8) || null });
        return NextResponse.json({ plan });
      }
      case "profile": {
        const profile = await writeProfile(rehydratePlan(body.plan));
        return NextResponse.json({ profile });
      }
      case "page": {
        const plan = rehydratePlan(body.plan);
        const key = str(body.key, 40);
        if (!plan.pages.some((p) => p.key === key)) return bad("Unknown page key for this template.");
        const avoid = Array.isArray(body.avoid) ? body.avoid.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 120)).slice(0, 6) : [];
        const result = await writePage(plan, key, {}, avoid);
        return NextResponse.json({ result });
      }
      case "finish": {
        const plan = rehydratePlan(body.plan);
        if (!Array.isArray(body.results) || body.results.length > 12) return bad("Missing 'results'.");
        const results: PageResult[] = [];
        for (const r of body.results) {
          const v = toResult(r);
          if (!v) return bad("Invalid page result.");
          results.push(v);
        }
        const profile = isRecord(body.profile) ? toProfile(body.profile, plan.brief.businessName) : profileFromBrief(plan.brief, "", "");
        const uploadSlots = Math.max(0, Math.min(MAX_SETUP_UPLOADS, Math.floor(Number(body.uploadSlots) || 0)));
        const preferred = Array.isArray(body.preferredImages)
          ? body.preferredImages
              .filter(isRecord)
              .map((x) => ({ url: str(x.url, 300), alt: str(x.alt, 120) }))
              .filter((x) => isAllowedStockUrl(x.url))
              .slice(0, MAX_STOCK_PICKS)
          : [];
        return NextResponse.json(finishSite(plan, profile, results, { uploadSlots, preferred }));
      }
      case "all": {
        const result = await buildSite({ messages: body.messages, state: body.state, templateOverride: str(body.templateOverride, 8) || null });
        return NextResponse.json(result);
      }
      default:
        return bad("Unknown stage.");
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Not enough information")) return bad(e.message, 422);
    return aiErrorResponse(e);
  }
}

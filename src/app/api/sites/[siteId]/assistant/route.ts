import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { blogLabelFor } from "@/lib/blog/blogPath";
import { parseOverview, type Overview } from "@/lib/insights/overview";
import { cleanAttachments } from "@/lib/ai/agent/attachments";
import { AssistantOutputError, runAssistantTurn } from "@/lib/ai/agent/run.server";
import { aiErrorResponse } from "@/lib/ai/http.server";
import { shopFromRows, type ShopSnapshot } from "@/lib/ai/shopAssistant";
import {
  PROFILE_COLUMNS,
  USAGE_CHAT,
  USAGE_COUNTED,
  chatAllowanceFor,
  monthStartIso,
  monthlyLimitFor,
  normalizeAssistantMessages,
  profileFromRow,
  usageFeatureFor,
  type BlogSnapshot,
  type SiteSnapshot,
  type SnapshotPage,
} from "@/lib/ai/siteAssistant";
import { effectiveAiLimit } from "@/lib/billing/planFeatures";
import { loadSubscription } from "@/lib/billing/subscriptions.server";
import type { PageData } from "@/lib/pageSchema";
import { supabaseService } from "@/lib/supabase/admin.server";
import { rateLimit } from "@/lib/supabase/requireAdmin.server";
import { requireSiteRole } from "@/lib/supabase/requireSiteRole.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ siteId: string }> };
type Usage = { used: number; limit: number | null };


function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** This month's usage rows of one kind, or null when metering is unavailable (migration 013 not run). */
async function usedThisMonth(siteId: string, feature: string = USAGE_COUNTED): Promise<number | null> {
  const { count, error } = await supabaseService()
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("site_id", siteId)
    .eq("feature", feature)
    .gte("created_at", monthStartIso());
  if (error) {
    console.error("ai_usage count failed (run migration 013_ai_usage.sql):", error.message);
    return null;
  }
  return count ?? 0;
}

/**
 * Visitor numbers for the last `days` days, read with the caller's own session so insights_overview
 * applies its owner/admin check. Null when insights are unavailable (e.g. migration 011 not run); the
 * assistant then says so instead of guessing.
 */
async function loadTraffic(req: Request, siteId: string, days: number): Promise<Overview | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = (req.headers.get("authorization") ?? "").replace(/^bearer\s+/i, "").trim();
  if (!url || !anonKey || !token) return null;
  try {
    const db = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await db.rpc("insights_overview", { p_site: siteId, p_days: days });
    if (error) {
      console.error("insights_overview failed for the assistant:", error.message);
      return null;
    }
    return parseOverview(data);
  } catch (e) {
    console.error("insights_overview failed for the assistant:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Products, categories and stock for the prompt. Null when the shop tables cannot be read (the assistant then says so). */
async function loadShop(siteId: string): Promise<ShopSnapshot | null> {
  const db = supabaseService();
  const [cats, prods, vars] = await Promise.all([
    db.from("product_categories").select("id, name").eq("site_id", siteId).order("position"),
    db
      .from("products")
      .select("id, name, slug, description, images, price_kobo, compare_at_kobo, category_id, active, featured, position", { count: "exact" })
      .eq("site_id", siteId)
      .order("position")
      .limit(200),
    db.from("product_variants").select("id, product_id, options, price_kobo, stock, position").eq("site_id", siteId).order("position").limit(2000),
  ]);
  if (cats.error || prods.error || vars.error) {
    console.error("shop load failed for the assistant:", (cats.error ?? prods.error ?? vars.error)?.message);
    return null;
  }
  return shopFromRows({
    categories: (cats.data ?? []) as Record<string, unknown>[],
    products: (prods.data ?? []) as Record<string, unknown>[],
    variants: (vars.data ?? []) as Record<string, unknown>[],
    total: prods.count ?? undefined,
  });
}

/** The site's posts for the prompt. Null when the blog table cannot be read (migration 017 not run). */
async function loadBlog(siteId: string, templateKey: string): Promise<BlogSnapshot | null> {
  const { data, error } = await supabaseService()
    .from("blog_posts")
    .select("title, slug, status")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("blog load failed for the assistant:", error.message);
    return null;
  }
  return {
    label: blogLabelFor(templateKey),
    posts: ((data ?? []) as Array<{ title: string; slug: string; status: string }>).map((r) => ({
      title: r.title,
      slug: r.slug,
      status: r.status === "published" ? "published" : "draft",
    })),
  };
}

async function loadSnapshot(siteId: string): Promise<SiteSnapshot | null> {
  const db = supabaseService();
  const [siteRes, profileRes, pagesRes, extraRes] = await Promise.all([
    db.from("sites").select("template_key, slug").eq("id", siteId).maybeSingle(),
    db.from("business_profiles").select(PROFILE_COLUMNS).eq("site_id", siteId).maybeSingle(),
    db.from("pages").select("key, status, data").eq("site_id", siteId),
    db.from("extra_pages").select("key, status, data").eq("site_id", siteId),
  ]);
  if (siteRes.error || pagesRes.error || extraRes.error) {
    throw new Error("Could not load the site's pages.");
  }
  if (!siteRes.data) return null;

  const profile = profileFromRow(profileRes.data as Record<string, unknown> | null);

  const toPage = (kind: SnapshotPage["kind"]) => (r: Record<string, unknown>): SnapshotPage => {
    const data = (r.data ?? {}) as Partial<PageData>;
    return {
      key: String(r.key),
      kind,
      status: r.status === "published" ? "published" : "draft",
      data: {
        seo: data.seo ?? { title: "", description: "" },
        sections: Array.isArray(data.sections) ? data.sections : [],
      },
    };
  };
  const coreOrder = ["home", "about", "contact"];
  const core = ((pagesRes.data ?? []) as Record<string, unknown>[])
    .map(toPage("core"))
    .sort((a, b) => coreOrder.indexOf(a.key) - coreOrder.indexOf(b.key));
  const extra = ((extraRes.data ?? []) as Record<string, unknown>[]).map(toPage("extra"));

  return {
    templateKey: String(siteRes.data.template_key ?? ""),
    businessName: profile.business_name || String(siteRes.data.slug ?? ""),
    profile,
    pages: [...core, ...extra],
  };
}

/** GET: this month's usage, so the panel can show the allowance before the first question. */
export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["owner", "admin"]);
  if (!auth.ok) return auth.response;
  const limit = effectiveAiLimit(auth.role, await loadSubscription(supabaseService(), siteId), monthlyLimitFor(auth.role, process.env));
  const used = await usedThisMonth(siteId);
  return json({ usage: { used: used ?? 0, limit } satisfies Usage });
}

/**
 * POST: one assistant turn. Returns a reply plus proposed edits; nothing is written to the site
 * here. The owner applies the edits they approve from the browser, under their own permissions.
 */
export async function POST(req: Request, ctx: Ctx) {
  const startedAt = Date.now();
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["owner", "admin"]);
  if (!auth.ok) return auth.response;

  const limited = rateLimit(`ai-site-assistant:${auth.userId}`, { limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const messages = normalizeAssistantMessages(b.messages);
  if (messages.length === 0 || messages[messages.length - 1]!.role !== "user") {
    return json({ error: "Send a message first." }, 400);
  }
  const focusPage = typeof b.focusPage === "string" ? b.focusPage.slice(0, 80) : undefined;
  const attachments = cleanAttachments(b.attachments, siteId, process.env.NEXT_PUBLIC_SUPABASE_URL);

  const limit = effectiveAiLimit(auth.role, await loadSubscription(supabaseService(), siteId), monthlyLimitFor(auth.role, process.env));
  const used = await usedThisMonth(siteId);
  if (limit !== null && used !== null && used >= limit) {
    return json(
      {
        error: `You've used all ${limit} AI requests for this month. Your allowance resets on the 1st — or upgrade your plan in Billing.`,
        usage: { used, limit } satisfies Usage,
      },
      429,
    );
  }
  const chatLimit = chatAllowanceFor(limit);
  if (chatLimit !== null) {
    const chats = await usedThisMonth(siteId, USAGE_CHAT);
    if (chats !== null && chats >= chatLimit) {
      return json({ error: "You've reached this month's limit for AI chat. It resets on the 1st.", usage: { used: used ?? 0, limit } }, 429);
    }
  }

  try {
    const [snapshot, shop] = await Promise.all([loadSnapshot(siteId), loadShop(siteId)]);
    if (!snapshot) return json({ error: "Site not found." }, 404);
    snapshot.shop = shop;
    snapshot.blog = await loadBlog(siteId, snapshot.templateKey);

    // The whole request must end inside maxDuration: the model gets most of it, photo search the rest.
    const { meta, ...result } = await runAssistantTurn({
      snapshot,
      messages,
      focusPage,
      attachments,
      readEnv: { snapshot, traffic: (days) => loadTraffic(req, siteId, days) },
      deadline: startedAt + 55_000,
    });
    console.info(`assistant turn: ${meta.path}${meta.fellBack ? " (fell back)" : ""} via ${meta.provider ?? "?"}:${meta.model ?? "?"}, ${result.actions.length} proposal(s)`);

    // Only an answer that proposes a change uses up the allowance; advice and "I didn't get that" are free.
    const feature = usageFeatureFor(result);
    const { error: logError } = await supabaseService()
      .from("ai_usage")
      .insert({ site_id: siteId, user_id: auth.userId, feature });
    if (logError) console.error("ai_usage insert failed:", logError.message);

    const usedNow = (used ?? 0) + (feature === USAGE_COUNTED ? 1 : 0);
    return json({ ...result, usage: { used: usedNow, limit } satisfies Usage });
  } catch (e) {
    if (e instanceof AssistantOutputError) return json({ error: "The AI gave a muddled answer. Please send your message again." }, 422);
    return aiErrorResponse(e);
  }
}

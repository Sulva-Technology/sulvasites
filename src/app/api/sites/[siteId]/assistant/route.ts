import { NextResponse } from "next/server";

import { extractJson, groqChat } from "@/lib/ai/groq.server";
import { aiErrorResponse } from "@/lib/ai/http.server";
import { SAMPLING } from "@/lib/ai/prompts/rules";
import {
  buildAssistantPrompt,
  PROFILE_COLUMNS,
  USAGE_CHAT,
  USAGE_COUNTED,
  chatAllowanceFor,
  monthStartIso,
  monthlyLimitFor,
  normalizeAssistantMessages,
  parseAssistantOutput,
  profileFromRow,
  usageFeatureFor,
  type SiteSnapshot,
  type SnapshotPage,
} from "@/lib/ai/siteAssistant";
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
  const limit = monthlyLimitFor(auth.role, process.env);
  const used = await usedThisMonth(siteId);
  return json({ usage: { used: used ?? 0, limit } satisfies Usage });
}

/**
 * POST: one assistant turn. Returns a reply plus proposed edits; nothing is written to the site
 * here. The owner applies the edits they approve from the browser, under their own permissions.
 */
export async function POST(req: Request, ctx: Ctx) {
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

  const limit = monthlyLimitFor(auth.role, process.env);
  const used = await usedThisMonth(siteId);
  if (limit !== null && used !== null && used >= limit) {
    return json(
      {
        error: `You've used all ${limit} AI requests for this month. Your allowance resets on the 1st — or ask Sulvatech about a bigger plan.`,
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
    const snapshot = await loadSnapshot(siteId);
    if (!snapshot) return json({ error: "Site not found." }, 404);

    const { system, user } = buildAssistantPrompt({ snapshot, messages, focusPage });
    const text = await groqChat({ system, user, json: true, ...SAMPLING.assistant });

    let raw: unknown;
    try {
      raw = extractJson(text);
    } catch {
      return json({ error: "The AI gave a garbled answer. Please try again." }, 422);
    }
    const ownerText = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
    const result = parseAssistantOutput(raw, snapshot, ownerText);

    // Only an answer that proposes a change uses up the allowance; advice and "I didn't get that" are free.
    const feature = usageFeatureFor(result);
    const { error: logError } = await supabaseService()
      .from("ai_usage")
      .insert({ site_id: siteId, user_id: auth.userId, feature });
    if (logError) console.error("ai_usage insert failed:", logError.message);

    const usedNow = (used ?? 0) + (feature === USAGE_COUNTED ? 1 : 0);
    return json({ ...result, usage: { used: usedNow, limit } satisfies Usage });
  } catch (e) {
    return aiErrorResponse(e);
  }
}

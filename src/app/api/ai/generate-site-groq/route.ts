import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/lib/ai/http.server";
import { buildSite } from "@/lib/ai/siteBuilder";
import { rateLimit, requireAdmin } from "@/lib/supabase/requireAdmin.server";

export const maxDuration = 60;

const MAX_BRIEF_CHARS = 8000;

/**
 * Legacy one-shot endpoint, kept for API compatibility. It now runs the same multi-stage
 * pipeline as the site assistant (see /api/ai/assistant/build) and returns the old shape.
 * The admin UI calls the staged endpoint instead, which stays inside serverless time limits.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const limited = rateLimit(`ai:${auth.userId}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  try {
    const body = (await req.json()) as { brief?: string; templateKey?: string };
    const brief = (body.brief ?? "").trim();
    if (!brief) return NextResponse.json({ error: "Missing 'brief'." }, { status: 400 });
    if (brief.length > MAX_BRIEF_CHARS) {
      return NextResponse.json({ error: `Brief too long (max ${MAX_BRIEF_CHARS} characters).` }, { status: 400 });
    }

    const result = await buildSite({
      messages: [{ role: "user", content: brief }],
      templateOverride: typeof body.templateKey === "string" ? body.templateKey : null,
    });
    return NextResponse.json(
      { profile: result.profile, pages: result.pages, photoCategory: result.photoCategory, templateKey: result.templateKey, notes: result.notes },
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Not enough information")) {
      return NextResponse.json({ error: e.message }, { status: 422 });
    }
    return aiErrorResponse(e);
  }
}

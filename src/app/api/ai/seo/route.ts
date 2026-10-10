import { NextResponse } from "next/server";

import { extractJson } from "@/lib/ai/groq.server";
import { aiChat } from "@/lib/ai/llm.server";
import { aiErrorResponse } from "@/lib/ai/http.server";
import { SAMPLING } from "@/lib/ai/prompts/rules";
import {
  MAX_PAGE_CHARS,
  MAX_SEO_PAGES,
  buildSeoPrompt,
  mergeSeoOutput,
  type SeoPageInput,
  type SeoProfile,
} from "@/lib/ai/seo";
import { validatePageData, type PageData } from "@/lib/pageSchema";
import { rateLimit, requireAdmin } from "@/lib/supabase/requireAdmin.server";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function str(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : null;
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const limited = rateLimit(`ai-seo:${auth.userId}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body.");
  }
  if (!isRecord(body) || !Array.isArray(body.pages)) return bad("Missing 'pages'.");
  if (body.pages.length < 1 || body.pages.length > MAX_SEO_PAGES) {
    return bad(`Send between 1 and ${MAX_SEO_PAGES} pages.`);
  }

  const inputs: SeoPageInput[] = [];
  const seen = new Set<string>();
  for (const p of body.pages) {
    if (!isRecord(p) || typeof p.key !== "string" || !p.key || p.key.length > 40 || seen.has(p.key)) {
      return bad("Invalid page key.");
    }
    const valid = validatePageData(p.data);
    if (!valid.ok) return bad(`Invalid data for page '${p.key}': ${valid.error ?? "Invalid."}`);
    const data = p.data as PageData;
    if (!Array.isArray(data.sections) || typeof data.seo?.title !== "string" || typeof data.seo?.description !== "string") {
      return bad(`Invalid data for page '${p.key}'.`);
    }
    if (JSON.stringify(data).length > MAX_PAGE_CHARS) return bad(`Page '${p.key}' is too large.`);
    seen.add(p.key);
    inputs.push({ key: p.key, data });
  }

  let profile: SeoProfile | undefined;
  if (isRecord(body.profile)) {
    profile = {
      business_name: str(body.profile.business_name, 120),
      tagline: str(body.profile.tagline, 200),
      description: str(body.profile.description, 800),
    };
  }

  try {
    const { system, user } = buildSeoPrompt(inputs, profile);
    const text = await aiChat({
      system,
      user,
      json: true,
      task: "small",
      ...SAMPLING.seo,
    });

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      return NextResponse.json({ error: "AI did not return valid JSON. Try again." }, { status: 422 });
    }

    return NextResponse.json({ pages: mergeSeoOutput(inputs, parsed) }, { status: 200 });
  } catch (e) {
    return aiErrorResponse(e);
  }
}

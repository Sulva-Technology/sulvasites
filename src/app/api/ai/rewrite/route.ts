import { NextResponse } from "next/server";

import type { Section } from "@/lib/pageSchema";
import { extractJson, groqChat } from "@/lib/ai/groq.server";
import { aiErrorResponse } from "@/lib/ai/http.server";
import { SAMPLING } from "@/lib/ai/prompts/rules";
import {
  MAX_CONTEXT_CHARS,
  MAX_OPTION_CHARS,
  MAX_SECTION_CHARS,
  buildRewritePrompt,
  isRewriteAction,
  mergeRewrite,
} from "@/lib/ai/rewrite";
import { rateLimit, requireAdmin } from "@/lib/supabase/requireAdmin.server";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const limited = rateLimit(`ai-rewrite:${auth.userId}`, { limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body.");
  }
  if (!isRecord(body)) return bad("Invalid body.");

  const { section, action } = body;
  if (!isRecord(section) || typeof section.type !== "string") return bad("Missing 'section'.");
  if (section.type === "contact_card") return bad("This section has no text to rewrite.");
  if (JSON.stringify(section).length > MAX_SECTION_CHARS) return bad("Section too large.");
  if (!isRewriteAction(action)) return bad("Invalid 'action'.");

  const option = typeof body.option === "string" ? body.option.trim() : "";
  if (option.length > MAX_OPTION_CHARS) return bad("Option too long.");
  if ((action === "tone" || action === "translate") && !option) {
    return bad(action === "tone" ? "Pick a tone." : "Enter a language.");
  }
  const context = typeof body.context === "string" ? body.context.trim().slice(0, MAX_CONTEXT_CHARS) : "";

  try {
    const original = section as unknown as Section;
    const { system, user } = buildRewritePrompt({ section: original, action, option, context });
    const text = await groqChat({
      system,
      user,
      json: true,
      ...(action === "translate" ? SAMPLING.translate : SAMPLING.rewrite),
    });

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      return NextResponse.json({ error: "AI did not return valid JSON. Try again." }, { status: 422 });
    }

    return NextResponse.json({ section: mergeRewrite(original, parsed) }, { status: 200 });
  } catch (e) {
    return aiErrorResponse(e);
  }
}

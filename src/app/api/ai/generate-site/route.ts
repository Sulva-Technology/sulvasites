import { NextResponse } from "next/server";

import type { PageData } from "@/lib/pageSchema";
import { validatePageData } from "@/lib/pageSchema";
import { rateLimit, requireAdmin } from "@/lib/supabase/requireAdmin.server";
import { fillSiteImages, normalizeCategory, PHOTO_CATEGORY_PROMPT, stripAiImageUrls } from "@/lib/stockPhotos";

const MAX_BRIEF_CHARS = 8000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function parseRetryAfterSeconds(detail: string): number | null {
  const m = detail.match(/retry in\s+([0-9.]+)s/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function extractJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("Model did not return JSON.");
  }
  const slice = cleaned.slice(first, last + 1);
  return JSON.parse(slice) as unknown;
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const limited = rateLimit(`ai:${auth.userId}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  try {
    const body = (await req.json()) as { brief?: string };
    const brief = (body.brief ?? "").trim();
    if (!brief) {
      return NextResponse.json({ error: "Missing 'brief'." }, { status: 400 });
    }
    if (brief.length > MAX_BRIEF_CHARS) {
      return NextResponse.json(
        { error: `Brief too long (max ${MAX_BRIEF_CHARS} characters).` },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini is not configured. Set GEMINI_API_KEY in server environment variables.",
        },
        { status: 500 },
      );
    }

    // NOTE: gemini-2.5-pro frequently has 0 free-tier quota on new projects.
    // Default to a Flash model to avoid immediate 429s unless explicitly overridden.
    const primaryModel = (process.env.GEMINI_MODEL || "gemini-3-flash-preview").trim();
    const fallbackModels = (process.env.GEMINI_MODEL_FALLBACKS || "gemini-flash-latest,gemini-2.5-flash")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const modelsToTry = [primaryModel, ...fallbackModels.filter((m) => m !== primaryModel)];

    // Try v1beta first (works with gemini-2.0-flash), then v1 as fallback
    const apiVersions = ["v1beta", "v1"];

    const prompt = `
You are generating content for a small business website builder.

Task:
- Given the user's brief, produce JSON that fills:
  1) business profile fields
  2) PageData for home/about/contact pages with rich, professional content
- Output MUST be valid JSON and MUST match the schema below exactly.
- Output JSON ONLY (no markdown, no commentary).

Schema:
{
  "photoCategory": string,
  "profile": {
    "business_name": string,
    "tagline": string | null,
    "description": string | null,
    "address": string | null,
    "phone": string | null,
    "email": string | null,
    "whatsapp": string | null,
    "socials": {
      "instagram": string | null,
      "facebook": string | null,
      "twitter": string | null,
      "tiktok": string | null
    }
  },
  "pages": {
    "home": PageData,
    "about": PageData,
    "contact": PageData
  }
}

PageData schema:
{
  "seo": { "title": string, "description": string },
  "sections": Section[]
}

Section union types (use these exact "type" values):
- { "type":"hero", "headline": string, "subtext": string, "ctaText": string, "ctaHref": string }
- { "type":"services", "items": [ { "title": string, "desc": string }, ... ] }
- { "type":"richtext", "title": string, "body": string }  (body MUST be HTML, e.g. "<p>..</p><ul><li>..</li></ul>")
- { "type":"values", "items": [ { "title": string, "desc": string }, ... ] }
- { "type":"backed_by", "title": string, "logos": [ { "name": string, "url": string|null }, ... ] }
- { "type":"use_cases", "title": string, "description": string, "items": [ { "title": string, "description": string, "linkText": string, "linkHref": string }, ... ] }
- { "type":"testimonials", "title": string, "items": [ { "name": string, "role": string, "quote": string, "company": string }, ... ] }
- { "type":"gallery", "title": string, "images": [ { "url": string, "alt": string }, ... ] } (url "" — server fills photos)
- { "type":"faq", "title": string, "items": [ { "question": string, "answer": string }, ... ] }
- { "type":"team", "title": string, "subtitle": string, "members": [ { "name": string, "role": string, "bio": string, "photoUrl": string, "linkedinUrl": string }, ... ] } (photoUrl/linkedinUrl can be "")
- { "type":"contact_card", "showForm": true, "mapLink": string } (mapLink may be "")

Requirements:
- Produce rich content, but avoid hallucinating facts. If not provided, keep specifics generic.
- Make copy crisp and credible. No lorem ipsum.
- Home sections (recommended order):
  hero, services, values, backed_by, use_cases, testimonials, gallery, faq, contact_card
- About sections (recommended order):
  hero, richtext, team, values, testimonials, gallery, faq, contact_card
- Contact sections (recommended order):
  hero, contact_card, faq, richtext
- Include 4-6 services, 4-6 values, 3-5 use cases, 3 testimonials (can be "Client" if no names), 6 FAQs, 3 team members (generic if unknown).
- Use CTA href values that work across templates: "#contact" and "#services".
${PHOTO_CATEGORY_PROMPT}

User brief:
${brief}
`.trim();

    let lastErrStatus: number | null = null;
    let lastErrDetail: string | null = null;
    let data: GeminiResponse | null = null;

    // Try each API version with each model
    for (const apiVersion of apiVersions) {
      for (const model of modelsToTry) {
        // Use query parameter method (works with both v1 and v1beta)
        const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${encodeURIComponent(
          model,
        )}:generateContent?key=${encodeURIComponent(apiKey)}`;

        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { 
              "content-type": "application/json",
              // Also include header method as fallback (some API keys prefer this)
              "X-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.65,
                // Gemini 3 thinking tokens count against this budget.
                maxOutputTokens: 16384,
              },
            }),
          });

          if (!res.ok) {
            const txt = await res.text();
            lastErrStatus = res.status;
            lastErrDetail = txt.slice(0, 2000);

            // If rate-limited, honor suggested retry delay and try again
            if (res.status === 429) {
              const retry = parseRetryAfterSeconds(txt);
              // Wait up to 60 seconds if retry time is suggested
              if (retry && retry <= 60) {
                await new Promise((r) => setTimeout(r, Math.ceil(retry * 1000)));
                // Retry the same model/version after waiting
                continue;
              }
              // If no retry time suggested or too long, try next model
              continue;
            }

            // If model not found (404), try next model/version
            if (res.status === 404) {
              continue; // Try next model or API version
            }

            // For other errors, try next model/version
            continue;
          }

          data = (await res.json()) as unknown as GeminiResponse;
          break; // Success - exit both loops
        } catch (fetchErr) {
          // Network error - try next
          lastErrDetail = fetchErr instanceof Error ? fetchErr.message : "Network error";
          continue;
        }
      }

      if (data) break; // Success - exit API version loop
    }

    if (!data) {
      const status = lastErrStatus ?? 502;
      const detail = lastErrDetail ?? "Unknown error";
      const isQuota = status === 429;
      const isNotFound = status === 404;
      
      let errorMessage = `Gemini request failed (${status}).`;
      if (isQuota) {
        errorMessage = `AI quota/rate limit exceeded for all models tried (${modelsToTry.join(", ")}). 

Solutions:
1. Wait a few minutes and try again (quota resets periodically)
2. Enable billing in Google Cloud Console for your Gemini API project
3. Check your quota limits at: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
4. Try using a different Google Cloud project with available quota

Note: Free tier quotas are limited. Enabling billing (even with $0 spend limit) often increases quota limits.`;
      } else if (isNotFound) {
        errorMessage = "Gemini model not found. Please check GEMINI_MODEL environment variable or use gemini-3-flash-preview.";
      }
      
      return NextResponse.json(
        {
          error: errorMessage,
          detail,
        },
        { status: 502 },
      );
    }

    const text =
      (data?.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p?.text)
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .join("\n") ?? "";

    const parsed = extractJson(text);
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: "Invalid AI output: expected JSON object." }, { status: 422 });
    }

    const pages = parsed.pages;
    if (!isRecord(pages)) {
      return NextResponse.json({ error: "Invalid AI output: missing pages." }, { status: 422 });
    }

    const home = (pages as Record<string, unknown>).home;
    const about = (pages as Record<string, unknown>).about;
    const contact = (pages as Record<string, unknown>).contact;
    if (!home || !about || !contact) {
      return NextResponse.json({ error: "Invalid AI output: missing pages." }, { status: 422 });
    }

    for (const k of ["home", "about", "contact"] as const) {
      const v = validatePageData((pages as Record<string, unknown>)[k]);
      if (!v.ok) {
        return NextResponse.json(
          { error: `Invalid AI output for page '${k}': ${v.error ?? "Invalid."}` },
          { status: 422 },
        );
      }
    }

    const profile = (parsed as Record<string, unknown>).profile;
    const businessName =
      isRecord(profile) && typeof profile.business_name === "string" ? profile.business_name : brief.slice(0, 80);
    const photoCategory = normalizeCategory((parsed as Record<string, unknown>).photoCategory);
    const filled = fillSiteImages(
      stripAiImageUrls({ home, about, contact } as { home: PageData; about: PageData; contact: PageData }),
      photoCategory,
      businessName,
    );

    return NextResponse.json(
      {
        profile: profile ?? null,
        pages: filled,
        photoCategory,
      },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}


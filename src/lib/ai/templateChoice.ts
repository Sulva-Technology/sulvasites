// Template selection: validates the model's pick and falls back to deterministic keyword scoring. Pure.
import { TEMPLATE_META } from "../../templates/meta.ts";
import { normalizeCategory } from "../stockPhotos.ts";
import type { PhotoCategory } from "../stockPhotoData.ts";
import type { Brief } from "./brief.ts";
import { INDUSTRIES, getIndustry } from "./prompts/industries.ts";

export type TemplateChoice = {
  templateKey: string;
  reason: string;
  alternatives: Array<{ templateKey: string; reason: string }>;
  photoCategory: PhotoCategory;
  source: "model" | "fallback" | "user";
};

export const TEMPLATE_KEYS = TEMPLATE_META.map((t) => t.key);

export function isTemplateKey(v: unknown): v is string {
  return typeof v === "string" && TEMPLATE_KEYS.includes(v);
}

function isShop(key: string) {
  return !!INDUSTRIES[key]?.shop;
}

function haystack(b: Brief): string {
  return [b.businessName, b.whatTheyDo, b.services.join(" "), b.audience, b.notes].join(" ").toLowerCase();
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type KeywordScore = { key: string; score: number; matched: string[] };

/** Scores every template by keyword hits. Multi-word keywords weigh more. */
export function scoreTemplates(brief: Brief): KeywordScore[] {
  const text = haystack(brief);
  return TEMPLATE_KEYS.map((key) => {
    const matched: string[] = [];
    let score = 0;
    for (const kw of INDUSTRIES[key]?.keywords ?? []) {
      if (new RegExp(`(^|[^a-z0-9])${escapeRe(kw)}s?([^a-z0-9]|$)`, "i").test(text)) {
        matched.push(kw);
        score += kw.includes(" ") ? 2 : 1;
      }
    }
    return { key, score, matched };
  });
}

function allowedByShop(key: string, brief: Brief, scores: KeywordScore[]): boolean {
  if (!isShop(key)) return brief.shopIntent !== true;
  if (brief.shopIntent === true) return true;
  if (brief.shopIntent === false) return false;
  return (scores.find((s) => s.key === key)?.score ?? 0) > 0;
}

function reasonFor(key: string, matched: string[]): string {
  const g = getIndustry(key);
  const t = TEMPLATE_META.find((m) => m.key === key);
  const name = t ? `${t.name} (${g.category.toLowerCase()})` : g.category.toLowerCase();
  return matched.length
    ? `${name} fits what you described: you mentioned ${matched.slice(0, 2).map((m) => `"${m}"`).join(" and ")}.`
    : `${name} is a flexible starting point for this kind of business.`;
}

/** Deterministic pick: best keyword score among allowed templates, else t1 (or t14 for online shops). */
export function chooseTemplateFallback(brief: Brief): TemplateChoice {
  const scores = scoreTemplates(brief);
  const wantsShop = brief.shopIntent === true;
  const candidates = scores
    .filter((s) => (wantsShop ? isShop(s.key) : brief.shopIntent === false ? !isShop(s.key) : true))
    .sort((a, b) => b.score - a.score || TEMPLATE_KEYS.indexOf(a.key) - TEMPLATE_KEYS.indexOf(b.key));
  const best = candidates[0];
  const key = best && best.score > 0 ? best.key : wantsShop ? "t14" : "t1";
  const matched = scores.find((s) => s.key === key)?.matched ?? [];
  const alternatives = candidates
    .filter((c) => c.key !== key && c.score > 0)
    .slice(0, 2)
    .map((c) => ({ templateKey: c.key, reason: reasonFor(c.key, c.matched) }));
  return {
    templateKey: key,
    reason: reasonFor(key, matched),
    alternatives,
    photoCategory: getIndustry(key).photoCategory,
    source: "fallback",
  };
}

function clip(s: unknown, max: number): string {
  return typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/**
 * Turns the plan model's JSON (or garbage) into a valid choice. The key is always a real
 * template; shop templates are only accepted when the brief supports them.
 */
export function resolveTemplateChoice(raw: unknown, brief: Brief, override?: string | null): TemplateChoice {
  const fallback = chooseTemplateFallback(brief);
  if (isTemplateKey(override)) {
    return {
      templateKey: override,
      reason: "Template chosen by you.",
      alternatives: [],
      photoCategory: getIndustry(override).photoCategory,
      source: "user",
    };
  }
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const scores = scoreTemplates(brief);
  const modelKey = r.templateKey;
  const valid =
    isTemplateKey(modelKey) &&
    (isShop(modelKey) ? allowedByShop(modelKey, brief, scores) : brief.shopIntent !== true);
  if (!valid) {
    // Invalid key, or shop/non-shop mismatch: trust the deterministic rule.
    return fallback;
  }
  const key = modelKey as string;
  const alternatives: TemplateChoice["alternatives"] = [];
  if (Array.isArray(r.alternatives)) {
    for (const a of r.alternatives) {
      const ak = a && typeof a === "object" ? (a as Record<string, unknown>).templateKey : null;
      if (isTemplateKey(ak) && ak !== key && !alternatives.some((x) => x.templateKey === ak)) {
        const rs = clip((a as Record<string, unknown>).reason, 140);
        alternatives.push({ templateKey: ak, reason: rs || reasonFor(ak, []) });
      }
      if (alternatives.length >= 2) break;
    }
  }
  const modelCategory = normalizeCategory(r.photoCategory);
  const hasCategory = r.photoCategory !== undefined && modelCategory !== "general";
  return {
    templateKey: key,
    reason: clip(r.reason, 160) || reasonFor(key, scores.find((s) => s.key === key)?.matched ?? []),
    alternatives,
    photoCategory: hasCategory ? modelCategory : getIndustry(key).photoCategory,
    source: "model",
  };
}

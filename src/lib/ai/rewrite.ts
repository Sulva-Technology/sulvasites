import type { Section } from "../pageSchema.ts";

export const REWRITE_ACTIONS = ["rewrite", "shorten", "expand", "tone", "translate"] as const;
export type RewriteAction = (typeof REWRITE_ACTIONS)[number];

export const MAX_SECTION_CHARS = 20000;
export const MAX_OPTION_CHARS = 60;
export const MAX_CONTEXT_CHARS = 1500;

// Keys the model may never change: structure, links, images.
const LOCKED_KEYS = new Set([
  "type",
  "url",
  "photoUrl",
  "linkedinUrl",
  "linkHref",
  "ctaHref",
  "mapLink",
  "showForm",
]);

const ACTION_TEXT: Record<RewriteAction, string> = {
  rewrite: "Rewrite all text so it is clearer, more professional and more engaging. Keep the same meaning and facts.",
  shorten: "Shorten all text. Keep the key message, cut filler. Aim for roughly half the length.",
  expand: "Expand all text with more helpful detail and benefits, roughly 1.5x to 2x the length. Do not invent specific facts, prices, names or numbers.",
  tone: "Rewrite all text in the requested tone. Keep the same meaning and facts.",
  translate: "Translate all text into the requested language. Keep names, brands and proper nouns as they are.",
};

export function isRewriteAction(v: unknown): v is RewriteAction {
  return typeof v === "string" && (REWRITE_ACTIONS as readonly string[]).includes(v);
}

export function buildRewritePrompt(args: {
  section: Section;
  action: RewriteAction;
  option?: string;
  context?: string;
}): { system: string; user: string } {
  const { section, action, option, context } = args;
  const system = [
    "You edit website copy for a small business website builder.",
    "You receive one page section as JSON and must return the SAME JSON structure with edited text.",
    "Rules:",
    "- Output valid JSON only, no markdown, no commentary.",
    "- Keep every key, the same number of items, and the same order.",
    "- Never change the values of: type, url, photoUrl, linkedinUrl, linkHref, ctaHref, mapLink, showForm.",
    "- Fields containing HTML (e.g. richtext body) must stay valid HTML using the same kinds of tags.",
    "- Do not add facts that are not in the input or context. No lorem ipsum.",
  ].join("\n");

  const lines = [`Task: ${ACTION_TEXT[action]}`];
  if (option && (action === "tone" || action === "translate")) {
    lines.push(action === "tone" ? `Tone: ${option}` : `Language: ${option}`);
  }
  if (context) lines.push(`Page context: ${context}`);
  lines.push("", "Section JSON:", JSON.stringify(section));
  return { system, user: lines.join("\n") };
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<\s*(script|iframe|object|embed|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|style)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2');
}

function mergeValue(original: unknown, ai: unknown, key: string | null): unknown {
  if (typeof original === "string") {
    if (key && LOCKED_KEYS.has(key)) return original;
    if (typeof ai !== "string" || !ai.trim()) return original;
    return key === "body" ? sanitizeHtml(ai) : ai;
  }
  if (Array.isArray(original)) {
    const aiArr = Array.isArray(ai) ? ai : [];
    return original.map((item, i) => mergeValue(item, aiArr[i], null));
  }
  if (original && typeof original === "object") {
    const aiObj = ai && typeof ai === "object" && !Array.isArray(ai) ? (ai as Record<string, unknown>) : {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(original as Record<string, unknown>)) {
      out[k] = mergeValue(v, aiObj[k], k);
    }
    return out;
  }
  return original;
}

/** Structure, links and images come from the original; only text is taken from the model. */
export function mergeRewrite(original: Section, aiOutput: unknown): Section {
  return mergeValue(original, aiOutput, null) as Section;
}

export type TextChange = { path: string; before: string; after: string };

export function diffText(before: unknown, after: unknown, path = ""): TextChange[] {
  if (typeof before === "string" && typeof after === "string") {
    return before === after ? [] : [{ path, before, after }];
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    return before.flatMap((b, i) => diffText(b, after[i], `${path}[${i + 1}]`));
  }
  if (before && after && typeof before === "object" && typeof after === "object") {
    return Object.keys(before as object).flatMap((k) =>
      diffText(
        (before as Record<string, unknown>)[k],
        (after as Record<string, unknown>)[k],
        path ? `${path}.${k}` : k,
      ),
    );
  }
  return [];
}

// Post-generation quality gate: lint (for the repair loop) and deterministic clean-up. Pure.
import type { PageData, Section } from "../pageSchema.ts";
import { briefFactText, type Brief } from "./brief.ts";
import { ALLOWED_HTML_TAGS, BANNED_PHRASES, BUDGETS as B, ITEM_COUNTS, WORD_REPLACEMENTS } from "./prompts/rules.ts";

export type QualityContext = {
  brief: Brief;
  templateKey: string;
  /** Keys of every page on the site, for CTA href checks (extra pages live at /p/<key>). */
  extraKeys: string[];
  /** Page key -> label, used for SEO title fallbacks. */
  labels?: Record<string, string>;
};

export type LintIssue = { path: string; code: "banned" | "invented-number" | "invented-contact"; message: string };

const SKIP_KEYS = new Set(["type", "url", "photoUrl", "linkedinUrl", "linkHref", "ctaHref", "mapLink", "showForm", "alt"]);

// ---------- text helpers ----------

export function stripTags(s: string) {
  return s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function norm(s: string) {
  return stripTags(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Trim to max chars, preferring a sentence end, then a word boundary. No ellipsis. */
export function fitSentence(input: string, max: number): string {
  const s = input.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentenceEnd > max * 0.5) return cut.slice(0, sentenceEnd + 1).trim();
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.5 ? cut.slice(0, space) : cut;
  return base.replace(/[\s,;:\-–—(]+$/, "").trim();
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function bannedIn(text: string): string | null {
  const t = text.toLowerCase();
  for (const p of BANNED_PHRASES) if (t.includes(p)) return p;
  return null;
}

const NUMBER_RE = /(?:₦|\$|£|€|ngn\s?)?\d[\d,]*(?:\.\d+)?(\s?(?:%|\+|k\b|years?\b|yrs?\b|clients?\b|customers?\b|projects?\b|members?\b|students?\b|patients?\b|stores?\b|branches\b))?/gi;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

function factDigitSet(brief: Brief): Set<string> {
  const set = new Set<string>();
  for (const m of briefFactText(brief).matchAll(/\d[\d,]*/g)) set.add(m[0].replace(/,/g, ""));
  return set;
}

function inventedEmail(text: string, factText: string): string | null {
  for (const m of stripTags(text).matchAll(EMAIL_RE)) {
    if (!factText.includes(m[0].toLowerCase())) return m[0];
  }
  return null;
}

/** Numbers and prices in copy that the owner never stated. */
function inventedNumber(text: string, facts: Set<string>, factText: string): string | null {
  const plain = stripTags(text);
  if (/24\/7/.test(plain)) {
    // allowed as a common phrase only when the owner said it
    if (!factText.includes("24/7") && !factText.includes("24 hours")) return "24/7";
  }
  for (const m of plain.matchAll(NUMBER_RE)) {
    const raw = m[0];
    const digits = raw.replace(/[^\d.]/g, "").replace(/\.0+$/, "");
    if (!digits || facts.has(digits.split(".")[0]!)) continue;
    const value = Number(digits);
    const flagged = !!m[1] || /^[₦$£€]|^ngn/i.test(raw) || value > 12;
    if (flagged) return raw.trim();
  }
  return null;
}

function inventedIn(text: string, facts: Set<string>, factText: string): string | null {
  return inventedNumber(text, facts, factText) ?? inventedEmail(text, factText);
}

// ---------- html ----------

/** Keeps only p/ul/li/strong/em/h3 without attributes; unwraps everything else. */
export function sanitizeRichHtml(html: string): string {
  const allowed = new Set<string>(ALLOWED_HTML_TAGS);
  let out = html
    .replace(/<\s*(script|style|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(\/?)\s*([a-z0-9]+)[^>]*>/gi, (_m, slash: string, tag: string) => {
      const t = tag.toLowerCase();
      if (t === "br") return " ";
      if (t === "b") return slash ? "</strong>" : "<strong>";
      if (t === "i") return slash ? "</em>" : "<em>";
      if (t === "h1" || t === "h2" || t === "h4" || t === "h5" || t === "h6") return slash ? "</h3>" : "<h3>";
      if (t === "ol") return slash ? "</ul>" : "<ul>";
      return allowed.has(t) ? `<${slash}${t}>` : "";
    });
  // markdown leftovers inside html text
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|\s)#{1,3}\s+/g, "$1");
  out = out.replace(/<(p|li|h3|strong|em)>\s*<\/\1>/g, "");
  if (!/<(p|ul|h3)\b/i.test(out) && out.trim()) out = `<p>${out.trim()}</p>`;
  return out.trim();
}

/** Applies a text transform to every text node of an HTML string. */
function mapHtmlText(html: string, fn: (t: string) => string): string {
  return html.replace(/>([^<]+)</g, (_m, t: string) => `>${fn(t)}<`).replace(/<(p|li|h3)>\s*<\/\1>/g, "");
}

function clampHtml(html: string, max: number): string {
  let out = html;
  while (out.length > max) {
    const units = [...out.matchAll(/<(ul|p|h3)>[\s\S]*?<\/\1>/g)];
    if (units.length <= 1) break;
    const last = units[units.length - 1]!;
    out = out.slice(0, last.index!) + out.slice(last.index! + last[0].length);
  }
  return out.trim();
}

// ---------- text cleaning ----------

function applyReplacements(s: string): string {
  let out = s;
  for (const [re, to] of WORD_REPLACEMENTS) out = out.replace(re, to);
  return out;
}

function removePhrases(s: string): string {
  let out = s;
  for (const p of BANNED_PHRASES) {
    out = out.replace(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
  }
  return out.replace(/\s{2,}/g, " ").replace(/^[\s,;:\-–—]+/, "").trim();
}

type CleanCtx = { facts: Set<string>; factText: string; stats: { fixes: number } };

/** Drops sentences with banned phrases or invented facts; never returns an emptier field than it must. */
function cleanText(text: string, ctx: CleanCtx): string {
  const replaced = applyReplacements(text);
  if (replaced !== text) ctx.stats.fixes++;
  const sentences = splitSentences(replaced);
  const kept = sentences.filter((s) => !bannedIn(s) && !inventedIn(s, ctx.facts, ctx.factText));
  if (kept.length === sentences.length) return replaced;
  ctx.stats.fixes++;
  if (kept.length) return kept.join(" ");
  // Every sentence was bad: strip the offending words instead of leaving the field empty.
  const stripped = removePhrases(replaced).replace(NUMBER_RE, (m) => (inventedIn(m, ctx.facts, ctx.factText) ? "" : m));
  return stripped.replace(/\s{2,}/g, " ").trim();
}

function cleanField(value: unknown, key: string, ctx: CleanCtx): unknown {
  if (typeof value !== "string") return value;
  if (key === "body") return mapHtmlText(value, (t) => cleanText(t, ctx));
  return cleanText(value, ctx);
}

function walk(v: unknown, ctx: CleanCtx, key = ""): unknown {
  if (typeof v === "string") return SKIP_KEYS.has(key) ? v : cleanField(v, key, ctx);
  if (Array.isArray(v)) return v.map((x) => walk(x, ctx, key));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = walk(x, ctx, k);
    return out;
  }
  return v;
}

function cleanSeoText(s: string, ctx: CleanCtx) {
  return cleanText(s, ctx);
}

// ---------- lint (used by the repair loop) ----------

function collect(v: unknown, path: string, out: Array<{ path: string; text: string }>, key = "") {
  if (typeof v === "string") {
    if (!SKIP_KEYS.has(key)) out.push({ path, text: v });
  } else if (Array.isArray(v)) v.forEach((x, i) => collect(x, `${path}[${i}]`, out, key));
  else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) collect(x, path ? `${path}.${k}` : k, out, k);
  }
}

export function lintPage(page: PageData, brief: Brief): LintIssue[] {
  const facts = factDigitSet(brief);
  const factText = briefFactText(brief);
  const fields: Array<{ path: string; text: string }> = [];
  collect(page.seo, "seo", fields);
  collect(page.sections, "sections", fields);
  const issues: LintIssue[] = [];
  for (const f of fields) {
    const banned = bannedIn(f.text);
    if (banned) issues.push({ path: f.path, code: "banned", message: `${f.path} contains the banned phrase "${banned}". Rewrite it plainly.` });
    const num = inventedNumber(f.text, facts, factText);
    if (num) {
      issues.push({ path: f.path, code: "invented-number", message: `${f.path} contains "${num}" which the owner never stated. Remove it; do not invent numbers, prices or stats.` });
    }
    const mail = inventedEmail(f.text, factText);
    if (mail) {
      issues.push({ path: f.path, code: "invented-contact", message: `${f.path} contains the email "${mail}" which the owner never gave. Remove it.` });
    }
  }
  return issues;
}

// ---------- gate ----------

function clampSection(s: Section): Section {
  switch (s.type) {
    case "hero":
      return {
        ...s,
        headline: fitSentence(s.headline.replace(/!+/g, ".").replace(/\.+$/, ""), B.heroHeadline),
        subtext: fitSentence(s.subtext, B.heroSubtext),
        ctaText: fitSentence(s.ctaText, B.heroCta),
      };
    case "services":
      return { ...s, items: s.items.slice(0, ITEM_COUNTS.services[1]).map((i) => ({ title: fitSentence(i.title, B.serviceTitle), desc: fitSentence(i.desc, B.serviceDesc) })) };
    case "values":
      return { ...s, items: s.items.slice(0, ITEM_COUNTS.values[1]).map((i) => ({ title: fitSentence(i.title, B.valueTitle), desc: fitSentence(i.desc, B.valueDesc) })) };
    case "use_cases":
      return {
        ...s,
        title: fitSentence(s.title, B.sectionTitle),
        description: fitSentence(s.description, B.useCasesIntro),
        items: s.items.slice(0, ITEM_COUNTS.use_cases[1]).map((i) => ({
          ...i,
          title: fitSentence(i.title, B.useCaseTitle),
          description: fitSentence(i.description, B.useCaseDesc),
          linkText: fitSentence(i.linkText ?? "", B.linkText),
        })),
      };
    case "richtext":
      return { ...s, title: fitSentence(s.title, B.sectionTitle), body: clampHtml(sanitizeRichHtml(s.body), B.richtextBody) };
    case "faq":
      return {
        ...s,
        title: fitSentence(s.title, B.sectionTitle),
        items: s.items.slice(0, ITEM_COUNTS.faq[1]).map((i) => ({ question: fitSentence(i.question, B.faqQuestion), answer: fitSentence(i.answer, B.faqAnswer) })),
      };
    case "team":
      return {
        ...s,
        title: fitSentence(s.title, B.sectionTitle),
        subtitle: fitSentence(s.subtitle, B.heroSubtext),
        members: s.members.slice(0, ITEM_COUNTS.team[1]).map((m) => ({
          ...m,
          name: fitSentence(m.name, B.teamName),
          role: fitSentence(m.role, B.teamRole),
          bio: fitSentence(m.bio, B.teamBio),
        })),
      };
    default:
      return s;
  }
}

function dedupeItems<T extends { [k: string]: unknown }>(items: T[], keyOf: (i: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = norm(keyOf(it));
    if (k && seen.has(k)) continue;
    if (k) seen.add(k);
    out.push(it);
  }
  return out;
}

function dedupeSection(s: Section): Section {
  switch (s.type) {
    case "services":
      return { ...s, items: dedupeItems(s.items, (i) => i.title) };
    case "values":
      return { ...s, items: dedupeItems(s.items, (i) => i.title) };
    case "use_cases":
      return { ...s, items: dedupeItems(s.items, (i) => i.title) };
    case "faq":
      return { ...s, items: dedupeItems(s.items, (i) => i.question) };
    default:
      return s;
  }
}

function hrefOk(href: string, page: PageData, ctx: QualityContext, factText: string): boolean {
  if (!href) return true;
  if (href === "#contact") return page.sections.some((s) => s.type === "contact_card");
  if (href === "#services") return page.sections.some((s) => s.type === "services");
  const extra = href.match(/^\/p\/([a-z0-9-]+)$/);
  if (extra) return ctx.extraKeys.includes(extra[1]!);
  if (/^https?:\/\//i.test(href)) return factText.includes(href.toLowerCase().replace(/^https?:\/\/(www\.)?/, ""));
  return false;
}

function fixLinks(page: PageData, ctx: QualityContext): PageData {
  const factText = briefFactText(ctx.brief);
  const hasContact = page.sections.some((s) => s.type === "contact_card");
  const shop = ctx.templateKey === "t13" || ctx.templateKey === "t14";
  const fallback = hasContact ? "#contact" : "";
  return {
    ...page,
    sections: page.sections.map((s) => {
      if (s.type === "hero") {
        const href = hrefOk(s.ctaHref, page, ctx, factText) ? s.ctaHref : fallback;
        // Shop templates supply their own fallback link, so the button text can stay.
        const ctaText = href || shop ? s.ctaText : "";
        return { ...s, ctaHref: href, ctaText };
      }
      if (s.type === "use_cases") {
        return {
          ...s,
          items: s.items.map((i) => {
            const href = hrefOk(i.linkHref ?? "", page, ctx, factText) && i.linkHref ? i.linkHref : fallback;
            return { ...i, linkHref: href, linkText: href ? i.linkText ?? "" : "" };
          }),
        };
      }
      return s;
    }),
  };
}

function heroOf(page: PageData) {
  return page.sections.find((s) => s.type === "hero") as Extract<Section, { type: "hero" }> | undefined;
}

function fixSeo(key: string, page: PageData, ctx: QualityContext, ctxClean: CleanCtx, usedTitles: Set<string>, usedDescs: Set<string>): PageData {
  const name = ctx.brief.businessName.trim();
  const label = ctx.labels?.[key] ?? key;
  const hero = heroOf(page);
  let title = cleanSeoText(page.seo.title ?? "", ctxClean).replace(/\s+/g, " ").trim();
  if (!title) title = key === "home" ? hero?.headline ?? label : label;
  if (name && !title.toLowerCase().includes(name.toLowerCase())) {
    const suffix = ` | ${name}`;
    title = `${fitSentence(title, Math.max(10, B.seoTitle - suffix.length))}${suffix}`;
  }
  title = fitSentence(title, B.seoTitle);
  if (usedTitles.has(title.toLowerCase())) {
    const suffix = name ? ` | ${name}` : "";
    title = fitSentence(`${label}${suffix}`, B.seoTitle);
  }
  usedTitles.add(title.toLowerCase());

  let description = cleanSeoText(page.seo.description ?? "", ctxClean).replace(/\s+/g, " ").trim();
  if (!description || usedDescs.has(norm(description))) {
    description = hero?.subtext || ctx.brief.whatTheyDo || "";
  }
  description = fitSentence(description.replace(/"/g, ""), B.seoDescription);
  usedDescs.add(norm(description));
  return { ...page, seo: { title, description } };
}

export type GateResult = { pages: Record<string, PageData>; fixes: number };

/** Deterministic clean-up applied to every generated page before it is returned. */
export function applyQualityGate(pages: Record<string, PageData>, ctx: QualityContext): GateResult {
  const clean: CleanCtx = { facts: factDigitSet(ctx.brief), factText: briefFactText(ctx.brief), stats: { fixes: 0 } };
  const usedTitles = new Set<string>();
  const usedDescs = new Set<string>();
  const out: Record<string, PageData> = {};
  for (const [key, page] of Object.entries(pages)) {
    const sections = (walk(page.sections, clean) as Section[]).map((s) => dedupeSection(clampSection(s)));
    let next: PageData = { seo: page.seo, sections };
    next = fixLinks(next, ctx);
    next = fixSeo(key, next, ctx, clean, usedTitles, usedDescs);
    out[key] = next;
  }
  return { pages: out, fixes: clean.stats.fixes };
}

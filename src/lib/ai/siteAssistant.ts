// "Ask AI" site assistant: the site snapshot, proposal types and the validators and renderers they
// use. Pure (no I/O). The prompts, the tool registry and the agent loop live in ./agent/; the client
// applies approved proposals with the user's own session (RLS). Relative imports only (Node test runner).
import { excerptOf, htmlToText, slugifyTitle } from "../blog/blogPath.ts";
import { sanitizePostHtml } from "../blog/sanitize.ts";
import { defaultSection, type PageData, type SeoData, type Section } from "../pageSchema.ts";
import { PAGE_STARTERS, getPagePresets, labelForPageKey, type PagePreset } from "../../templates/pagePresets.ts";
import { hasTraffic, shareOf, type Overview } from "../insights/overview.ts";
import { formatNaira } from "../shop/money.ts";
import { emptyBrief, verifyContact, type BriefContact } from "./brief.ts";
import { BUDGETS } from "./prompts/rules.ts";
import { clampSection, cleanCopyField, copyFacts, dedupeSection, fitSentence, type CopyFacts } from "./quality.ts";
import { sanitizeHtml } from "./rewrite.ts";
import {
  renderShop,
  type ImageChoice,
  type ProductDraft,
  type ProductFields,
  type ShopSnapshot,
  type StockChange,
} from "./shopAssistant.ts";

export type AssistantMessage = { role: "user" | "assistant"; content: string };

export type SnapshotPage = {
  key: string;
  /** home / about / contact live in `pages`; everything else in `extra_pages`. */
  kind: "core" | "extra";
  status: "draft" | "published";
  data: PageData;
};

/** Business details the assistant may change. Socials and hours live in the profile's `socials` JSON. */
export const PROFILE_FIELDS = [
  "business_name", "tagline", "description", "address", "phone", "whatsapp", "email",
  "instagram", "facebook", "twitter", "tiktok", "hours",
] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type ProfileFields = Partial<Record<ProfileField, string>>;
export const SOCIAL_FIELDS: ProfileField[] = ["instagram", "facebook", "twitter", "tiktok", "hours"];

const PROFILE_LIMITS: Record<ProfileField, number> = {
  business_name: 80, tagline: BUDGETS.tagline, description: BUDGETS.profileDescription, address: 200,
  phone: 30, whatsapp: 30, email: 100, instagram: 100, facebook: 150, twitter: 100, tiktok: 100, hours: 400,
};
const PROFILE_LABELS: Record<ProfileField, string> = {
  business_name: "Business name", tagline: "Tagline", description: "About the business", address: "Address",
  phone: "Phone", whatsapp: "WhatsApp", email: "Email", instagram: "Instagram", facebook: "Facebook",
  twitter: "X / Twitter", tiktok: "TikTok", hours: "Opening hours",
};
export function profileFieldLabel(f: string): string {
  return PROFILE_LABELS[f as ProfileField] ?? f;
}

export type SiteSnapshot = {
  templateKey: string;
  businessName: string;
  profile: ProfileFields;
  pages: SnapshotPage[];
  /** Page-view summary for the owner's questions about visitors; absent when insights are unavailable. */
  traffic?: Overview | null;
  /** The shop's products, categories and stock; absent when the shop tables are unavailable. */
  shop?: ShopSnapshot | null;
  /** The site's blog posts (newest first); absent when the blog table is unavailable. */
  blog?: BlogSnapshot | null;
};

export type BlogSnapshot = {
  /** Nav label of the blog, e.g. "Blog" or "Journal". */
  label: string;
  posts: Array<{ title: string; slug: string; status: "draft" | "published" }>;
};

/** A blog post the assistant wrote, ready to insert into blog_posts. */
export type BlogPostDraft = {
  title: string;
  slug: string;
  excerpt: string;
  /** Sanitised article HTML. */
  body: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  /** Publish on apply (the owner asked for it to go live); otherwise saved as a draft. */
  publish: boolean;
};

type ActionBase = { id: string; summary: string };
export type PageRef = { page: string; pageKind: "core" | "extra"; pageLabel: string; pageLive: boolean };

export type AssistantAction =
  | (ActionBase & PageRef & { type: "edit_section"; sectionIndex: number; before: Section; after: Section })
  | (ActionBase & PageRef & { type: "add_section"; position: number; section: Section })
  | (ActionBase & PageRef & { type: "remove_section"; sectionIndex: number; before: Section })
  | (ActionBase & PageRef & { type: "move_section"; sectionIndex: number; to: number; before: Section })
  | (ActionBase & PageRef & { type: "set_seo"; before: SeoData; after: SeoData })
  | (ActionBase & { type: "update_profile"; before: ProfileFields; after: ProfileFields })
  | (ActionBase & { type: "add_page"; key: string; label: string; data: PageData })
  | (ActionBase & { type: "add_blog_post"; post: BlogPostDraft })
  | (ActionBase & { type: "add_product"; product: ProductDraft; categoryIsNew: boolean; imageOptions: ImageChoice[] })
  | (ActionBase & { type: "update_product"; productId: string; productName: string; before: ProductFields; after: ProductFields; categoryIsNew: boolean })
  | (ActionBase & { type: "set_stock"; productId: string; productName: string; changes: StockChange[] });

export type { ImageChoice, ProductDraft, ProductFields, ShopSnapshot, StockChange };

/** Actions that change the shop rather than the site's pages. They have their own, larger cap. */
export const isProductAction = (type: unknown): boolean =>
  type === "add_product" || type === "update_product" || type === "set_stock";

export type AssistantResult = { reply: string; actions: AssistantAction[] };

export const MAX_MESSAGES = 16;
/** Long enough for an owner to paste a whole article for the blog. */
export const MAX_MESSAGE_CHARS = 8000;
export const MAX_ACTIONS = 6;
export const MAX_REPLY_CHARS = 2500;
const MAX_LIST_ITEMS = 12;
const MAX_FIELD_CHARS = 3000;
export const MAX_BLOG_POSTS = 3;
const MAX_POST_BODY_CHARS = 60000;
const MIN_POST_WORDS = 60;
export const SNAPSHOT_BUDGET = 28000;

export const SECTION_LABEL_FOR: Record<Section["type"], string> = {
  hero: "banner", services: "services", richtext: "text", values: "why us", contact_card: "contact",
  backed_by: "logos", use_cases: "projects", gallery: "photos", testimonials: "reviews", faq: "FAQ", team: "team",
};

const SECTION_TYPES: Section["type"][] = [
  "hero", "services", "richtext", "values", "contact_card", "backed_by", "use_cases", "gallery", "testimonials", "faq", "team",
];
// Never taken from the model: structure, links and images.
const LOCKED_KEYS = new Set(["type", "url", "photoUrl", "linkedinUrl", "linkHref", "ctaHref", "mapLink", "showForm"]);

export const DEFAULT_MONTHLY_LIMIT = 50;

/** Monthly AI request allowance for a role. Sulvatech admins are not metered. */
export function monthlyLimitFor(role: string, env: Record<string, string | undefined> = {}): number | null {
  if (role === "admin") return null;
  const n = Number(env.AI_ASSISTANT_MONTHLY_LIMIT);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_MONTHLY_LIMIT;
}

/** Usage rows: only answers that propose a change count toward the owner's allowance. */
export const USAGE_COUNTED = "assistant";
export const USAGE_CHAT = "assistant_chat";

/** The ai_usage feature to record for a finished turn. */
export function usageFeatureFor(result: AssistantResult): string {
  return result.actions.length > 0 ? USAGE_COUNTED : USAGE_CHAT;
}

/** Free (no-change) turns are not counted, but are capped so the chat cannot be used without limit. */
export function chatAllowanceFor(limit: number | null): number | null {
  return limit === null ? null : Math.max(30, limit * 3);
}

const ADVICE_RE = /\b(why|how (can|do|should)|should i|improv|advice|suggest|strateg|analy[sz]|insight|grow|more sales|sell more|traffic|visitor|compet|better|review my|what.{0,12}(wrong|missing|best|work)|plan|price|pricing)\b/i;

/** Reasoning effort for a turn: think hardest on advice and strategy, move quickly on plain edits. */
export function effortFor(lastMessage: string): "medium" | "high" {
  return ADVICE_RE.test(lastMessage) ? "high" : "medium";
}

/** First instant of the current calendar month (UTC), as ISO. */
export function monthStartIso(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function normalizeAssistantMessages(v: unknown): AssistantMessage[] {
  if (!Array.isArray(v)) return [];
  const out: AssistantMessage[] = [];
  for (const m of v.slice(-MAX_MESSAGES)) {
    if (!m || typeof m !== "object") continue;
    const r = m as Record<string, unknown>;
    const role = r.role === "assistant" ? "assistant" : r.role === "user" ? "user" : null;
    const content = typeof r.content === "string" ? r.content.trim().slice(0, MAX_MESSAGE_CHARS) : "";
    if (role && content) out.push({ role, content });
  }
  return out;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function hasLockedKey(item: unknown): boolean {
  return isRecord(item) && Object.keys(item).some((k) => LOCKED_KEYS.has(k));
}

/**
 * Builds a value shaped like `template`, taking text from `value` (the model) and everything else
 * from `original`. Lists of plain-text items (services, FAQs, reviews…) may grow or shrink; lists
 * carrying images or links keep their length so a photo never lands on the wrong person.
 */
function shapeValue(template: unknown, value: unknown, original: unknown, key: string | null): unknown {
  if (typeof template === "string") {
    const orig = typeof original === "string" ? original : template;
    if (key && LOCKED_KEYS.has(key)) return orig;
    if (typeof value !== "string" || !value.trim()) return orig;
    const text = value.trim().slice(0, MAX_FIELD_CHARS);
    return key === "body" ? sanitizeHtml(text) : text;
  }
  if (typeof template === "boolean" || template === null) {
    return original === undefined ? template : original;
  }
  if (Array.isArray(template)) {
    const origArr = Array.isArray(original) ? original : [];
    const itemTemplate = template[0] ?? origArr[0];
    const fixed = hasLockedKey(itemTemplate) || hasLockedKey(origArr[0]);
    const aiArr = Array.isArray(value) ? value.slice(0, MAX_LIST_ITEMS) : null;
    const count = fixed || !aiArr || aiArr.length === 0 ? origArr.length : aiArr.length;
    return Array.from({ length: count }, (_, i) =>
      shapeValue(itemTemplate, aiArr?.[i], origArr[i] ?? itemTemplate, null),
    );
  }
  if (isRecord(template)) {
    const orig = isRecord(original) ? original : {};
    const ai = isRecord(value) ? value : {};
    const out: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(template), ...Object.keys(orig)])) {
      const t = k in template ? template[k] : typeof orig[k] === "string" ? "" : orig[k];
      out[k] = shapeValue(t, ai[k], k in orig ? orig[k] : template[k], k);
    }
    return out;
  }
  return original;
}

/** The model's version of an existing section: same type, same images/links, new text. */
export function shapeEditedSection(original: Section, aiSection: unknown): Section {
  return shapeValue(defaultSection(original.type), aiSection, original, null) as Section;
}

/** A brand-new section of `type` filled with the model's text (images and links left empty). */
export function shapeNewSection(type: Section["type"], aiSection: unknown): Section {
  const blank = defaultSection(type);
  const section = shapeValue(blank, aiSection, blank, null) as Section;
  // A new banner button needs somewhere to go; the contact block is on every page.
  if (section.type === "hero" && section.ctaText && !section.ctaHref) section.ctaHref = "#contact";
  return section;
}

const SKIP_CLEAN = new Set([...LOCKED_KEYS, "alt", "name"]);

function mapText(v: unknown, fn: (text: string, key: string) => string, key = ""): unknown {
  if (typeof v === "string") return SKIP_CLEAN.has(key) ? v : fn(v, key);
  if (Array.isArray(v)) return v.map((x) => mapText(x, fn, key));
  if (isRecord(v)) {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = mapText(x, fn, k);
    return out;
  }
  return v;
}

/** Text the model left as it was keeps the owner's exact wording, even if the gate would trim it. */
function keepUntouched(polished: unknown, shaped: unknown, original: unknown): unknown {
  if (typeof polished === "string") return shaped === original && typeof original === "string" ? original : polished;
  if (Array.isArray(polished)) {
    const s = Array.isArray(shaped) ? shaped : [];
    const o = Array.isArray(original) ? original : [];
    return polished.map((x, i) => keepUntouched(x, s[i], o[i]));
  }
  if (isRecord(polished)) {
    const s = isRecord(shaped) ? shaped : {};
    const o = isRecord(original) ? original : {};
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(polished)) out[k] = keepUntouched(x, s[k], o[k]);
    return out;
  }
  return polished;
}

/**
 * Runs the same quality gate the site generator uses (cliches, invented numbers and emails,
 * length budgets, duplicate items) over the text the model wrote. Untouched text is left alone.
 */
export function polishSection(shaped: Section, original: Section | null, facts: CopyFacts): Section {
  const cleaned = mapText(shaped, (t, k) => cleanCopyField(t, k, facts)) as Section;
  const clamped = clampSection(cleaned);
  const merged = original ? (keepUntouched(clamped, shaped, original) as Section) : clamped;
  return dedupeSection(merged);
}

/** Facts the model may repeat: the owner's own words, the current site and the business details. */
export function assistantFacts(snapshot: SiteSnapshot, ownerText: string): CopyFacts {
  const brief = emptyBrief();
  brief.businessName = snapshot.businessName;
  const p = snapshot.profile;
  brief.contact = { ...brief.contact, ...pickContact(p) };
  brief.notes = [ownerText, Object.values(p).join(" "), JSON.stringify(snapshot.pages.map((x) => x.data)), renderShop(snapshot.shop)].join(" ");
  return copyFacts(brief);
}

function pickContact(p: ProfileFields): Partial<BriefContact> {
  const out: Partial<BriefContact> = {};
  for (const k of ["phone", "whatsapp", "email", "address", "instagram", "facebook", "twitter", "tiktok"] as const) {
    if (p[k]) out[k] = p[k];
  }
  return out;
}

function digitGroups(s: string): string[] {
  return [...s.matchAll(/\d+/g)].map((m) => m[0]);
}

/**
 * Validates a proposed business-details change. Contact details (phone, WhatsApp, email,
 * socials, address) are kept only when the owner typed them, so the model can never invent one;
 * hours may only use numbers the owner gave; text fields go through the quality gate.
 */
export function shapeProfileUpdate(
  raw: Record<string, unknown>,
  current: ProfileFields,
  ownerText: string,
  facts: CopyFacts,
): { before: ProfileFields; after: ProfileFields } | null {
  const before: ProfileFields = {};
  const after: ProfileFields = {};
  const lowerOwner = ownerText.toLowerCase();
  for (const f of PROFILE_FIELDS) {
    if (!(f in raw)) continue;
    const v = raw[f];
    if (typeof v !== "string" && v !== null) continue;
    let next = (v ?? "").replace(f === "hours" ? /[ \t]+/g : /\s+/g, " ").trim().slice(0, PROFILE_LIMITS[f]);
    const prev = current[f] ?? "";
    if (next === prev) continue;

    if (next) {
      if (f in pickContact({ [f]: next })) {
        const checked = verifyContact({ ...emptyBrief().contact, [f]: next } as BriefContact, ownerText);
        if (!checked[f as keyof BriefContact]) continue;
      } else if (f === "business_name") {
        if (!lowerOwner.includes(next.toLowerCase())) continue;
      } else if (f === "hours") {
        next = next.split(/\n+/).map((l) => l.trim()).filter(Boolean).slice(0, 8).join("\n");
        const known = new Set([...digitGroups(ownerText), ...digitGroups(prev)].map(Number));
        // 6pm may become 18:00, and :00 minutes are always fine; any other number must come from the owner.
        const ok = (n: number) => n === 0 || known.has(n) || (n >= 13 && n <= 23 && known.has(n - 12));
        if (digitGroups(next).some((d) => !ok(Number(d)))) continue;
      } else {
        next = fitSentence(cleanCopyField(next, f, facts), PROFILE_LIMITS[f]);
        if (!next || next === prev) continue;
      }
    }
    before[f] = prev;
    after[f] = next;
  }
  return Object.keys(after).length ? { before, after } : null;
}

export function isSectionType(v: unknown): v is Section["type"] {
  return typeof v === "string" && (SECTION_TYPES as string[]).includes(v);
}

export function clip(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function pageLabel(templateKey: string, key: string): string {
  if (key === "home") return "Home";
  if (key === "about") return "About";
  if (key === "contact") return "Contact";
  return labelForPageKey(templateKey, key);
}

/** "slug", or "slug-2", "slug-3"… when taken. */
export function uniquePostSlug(title: string, taken: string[]): string {
  const base = slugifyTitle(title).slice(0, 74).replace(/-+$/g, "") || "post";
  const used = new Set(taken);
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

function cleanTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const t = typeof x === "string" ? x.replace(/[#,]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40) : "";
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
    if (out.length >= 5) break;
  }
  return out;
}

/**
 * Validates a proposed blog post: safe HTML only, the same quality gate as page copy (no invented
 * numbers, emails or banned phrases), a real article length, and a web address no other post uses.
 */
export function shapeBlogPost(raw: Record<string, unknown>, facts: CopyFacts, takenSlugs: string[]): BlogPostDraft | null {
  const title = fitSentence(cleanCopyField(clip(raw.title, 300), "title", facts), 160);
  if (!title) return null;
  const html = sanitizePostHtml(typeof raw.body === "string" ? raw.body.slice(0, MAX_POST_BODY_CHARS) : "");
  const body = sanitizePostHtml(cleanCopyField(html, "body", facts));
  if (htmlToText(body).split(" ").filter(Boolean).length < MIN_POST_WORDS) return null;
  const written = fitSentence(cleanCopyField(clip(raw.excerpt, 600), "excerpt", facts), 200);
  return {
    title,
    slug: uniquePostSlug(title, takenSlugs),
    excerpt: excerptOf(written, body, 200),
    body,
    tags: cleanTags(raw.tags),
    seoTitle: fitSentence(cleanCopyField(clip(raw.seoTitle, 200), "title", facts), BUDGETS.seoTitle),
    seoDescription: fitSentence(cleanCopyField(clip(raw.seoDescription, 400), "description", facts), BUDGETS.seoDescription),
    publish: raw.publish === true,
  };
}

/** The blog for the prompt: label, address and existing posts (so the assistant doesn't repeat one). */
export function renderBlog(blog: BlogSnapshot | null | undefined): string {
  if (!blog) return "BLOG: not available right now.";
  const count = blog.posts.length ? `${blog.posts.length} post(s)` : "no posts yet";
  const head = `BLOG "${blog.label}" at /blog: ${count}. The "${blog.label}" link joins the site menu once a post is published.`;
  const rows = blog.posts.slice(0, 50).map((p) => `  - ${JSON.stringify(p.title)} (/blog/${p.slug}, ${p.status === "published" ? "live" : "draft"})`);
  return [head, ...rows].join("\n");
}

// ---------- prompt ----------

export const SECTION_SHAPES = [
  '{"type":"hero","headline":string,"subtext":string,"ctaText":string,"ctaHref":string}',
  '{"type":"services","items":[{"title":string,"desc":string}]}',
  '{"type":"values","items":[{"title":string,"desc":string}]}',
  '{"type":"richtext","title":string,"body":html string}',
  '{"type":"faq","title":string,"items":[{"question":string,"answer":string}]}',
  '{"type":"testimonials","title":string,"items":[{"name":string,"role":string,"quote":string,"company":string}]}',
  '{"type":"use_cases","title":string,"description":string,"items":[{"title":string,"description":string,"linkText":string,"linkHref":string}]}',
  '{"type":"team","title":string,"subtitle":string,"members":[{"name":string,"role":string,"bio":string,"photoUrl":string,"linkedinUrl":string}]}',
  '{"type":"gallery","title":string,"images":[{"url":string,"alt":string}]}',
  '{"type":"backed_by","title":string,"logos":[{"name":string,"url":string|null}]}',
  '{"type":"contact_card","showForm":boolean,"mapLink":string}',
];


export function renderPage(p: SnapshotPage, templateKey: string, full: boolean): string {
  const head = `PAGE "${p.key}" — ${pageLabel(templateKey, p.key)} (${p.status === "published" ? "live" : "draft"})`;
  const seo = `seo: ${JSON.stringify(p.data.seo ?? { title: "", description: "" })}`;
  const sections = (p.data.sections ?? []).map((s, i) => {
    if (full) return `  [${i}] ${JSON.stringify(s)}`;
    const headline = s.type === "hero" ? ` — "${clip(s.headline, 80)}"` : "title" in s ? ` — "${clip(s.title, 60)}"` : "";
    return `  [${i}] ${s.type}${headline}`;
  });
  return [head, seo, ...sections].join("\n");
}

/** Site content for the prompt: the page in focus first and in full, others in full while the budget lasts. */
export function renderSnapshot(snapshot: SiteSnapshot, focusPage?: string, budget: number = SNAPSHOT_BUDGET): string {
  const pages = [...snapshot.pages].sort((a, b) => (a.key === focusPage ? -1 : b.key === focusPage ? 1 : 0));
  const parts: string[] = [];
  let used = 0;
  for (const p of pages) {
    let text = renderPage(p, snapshot.templateKey, true);
    if (used + text.length > budget) text = renderPage(p, snapshot.templateKey, false);
    used += text.length;
    parts.push(text);
  }
  const profile = PROFILE_FIELDS.map((f) => `${f}: ${JSON.stringify(snapshot.profile[f] ?? "")}`).join("\n");
  return ["BUSINESS DETAILS (edit with update_profile):", profile, "", ...parts].join("\n");
}

/** Visitor numbers for the prompt, so the assistant can answer "which page is visited most?" from real data. */
export function renderTraffic(traffic: Overview | null | undefined): string {
  if (!traffic) return "TRAFFIC: not available right now.";
  if (!hasTraffic(traffic)) {
    return `TRAFFIC (last ${traffic.days} days): no visits recorded yet. Visit tracking may be new, or the site has not had visitors.`;
  }
  const label = (path: string) => (path === "/" ? "Home (/)" : path);
  const last7 = traffic.daily.slice(-7).reduce((n, d) => n + d.views, 0);
  const lines = [
    `TRAFFIC (last ${traffic.days} days, bots and Do-Not-Track visitors excluded):`,
    `total page views: ${traffic.totals.views}; visitors (sum of daily unique visitors): ${traffic.totals.visitors}; views in the last 7 days: ${last7}`,
    traffic.totals.prevViews > 0 ? `previous ${traffic.days} days: ${traffic.totals.prevViews} views` : "",
    "most visited pages (most first):",
    ...traffic.topPages.map(
      (r, i) => `  ${i + 1}. ${label(r.path)} — ${r.views} views, ${r.visitors} visitors (${shareOf(r.views, traffic.totals.views)}% of views)`,
    ),
    traffic.topReferrers.length
      ? "where visitors came from: " + traffic.topReferrers.map((r) => `${r.host} (${r.views})`).join(", ")
      : "",
    traffic.devices.length ? "devices: " + traffic.devices.map((d) => `${d.device} ${d.views}`).join(", ") : "",
    `enquiries: ${traffic.inbox.enquiries}; bookings: ${traffic.inbox.bookings}; unread messages: ${traffic.inbox.unread}`,
    `shop: ${traffic.shop.orders} paid orders, ${formatNaira(traffic.shop.revenueKobo)} revenue` +
      (traffic.shop.prevOrders > 0 ? ` (previous ${traffic.days} days: ${traffic.shop.prevOrders} orders, ${formatNaira(traffic.shop.prevRevenueKobo)})` : ""),
    traffic.shop.topProducts.length
      ? "best sellers: " + traffic.shop.topProducts.map((x) => `${x.name} (${x.quantity} sold, ${formatNaira(x.revenueKobo)})`).join(", ")
      : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export function layoutOptions(templateKey: string): PagePreset[] {
  const seen = new Set<string>();
  return [...getPagePresets(templateKey), ...PAGE_STARTERS].filter((p) => !seen.has(p.key) && seen.add(p.key));
}


// ---------- parsing ----------

export function findPage(snapshot: SiteSnapshot, key: unknown): SnapshotPage | null {
  if (typeof key !== "string") return null;
  const k = key.trim().toLowerCase();
  return snapshot.pages.find((p) => p.key === k) ?? null;
}

export function pageRef(snapshot: SiteSnapshot, page: SnapshotPage): PageRef {
  return {
    page: page.key,
    pageKind: page.kind,
    pageLabel: pageLabel(snapshot.templateKey, page.key),
    pageLive: page.status === "published",
  };
}

export function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}


// ---------- business_profiles row mapping (shared by the API route and the browser apply) ----------

export const PROFILE_COLUMNS = "business_name, tagline, description, address, phone, whatsapp, email, socials";

/** Reads a business_profiles row into the flat fields the assistant works with. */
export function profileFromRow(row: Record<string, unknown> | null | undefined): ProfileFields {
  const r = row ?? {};
  const socials = isRecord(r.socials) ? r.socials : {};
  const out: ProfileFields = {};
  for (const f of PROFILE_FIELDS) {
    const v = SOCIAL_FIELDS.includes(f) ? socials[f] : r[f];
    out[f] = typeof v === "string" ? v.slice(0, 600) : Array.isArray(v) ? v.filter((x) => typeof x === "string").join("\n") : "";
  }
  return out;
}

/** The update to send for `after`, keeping every other key templates store in `socials`. */
export function profileUpdatePayload(row: Record<string, unknown> | null | undefined, after: ProfileFields): Record<string, unknown> {
  const socials = { ...(isRecord(row?.socials) ? row!.socials : {}) } as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  let socialsChanged = false;
  for (const [f, v] of Object.entries(after) as Array<[ProfileField, string]>) {
    if (SOCIAL_FIELDS.includes(f)) {
      socials[f] = v || null;
      socialsChanged = true;
    } else if (f === "business_name") {
      if (v) payload[f] = v;
    } else {
      payload[f] = v || null;
    }
  }
  if (socialsChanged) payload.socials = socials;
  return payload;
}

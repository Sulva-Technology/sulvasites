import type { PageData } from "../pageSchema.ts";
import { buildSystemPrompt, delimitUserData, detectLocale } from "./prompts/rules.ts";

export const TITLE_MAX = 65;
export const DESCRIPTION_MAX = 160;
export const ALT_MAX = 125;
export const MAX_SEO_PAGES = 3;
export const MAX_PAGE_CHARS = 20000;
const SUMMARY_MAX = 2500;

export type SeoProfile = { business_name?: string | null; tagline?: string | null; description?: string | null };
export type SeoPageInput = { key: string; data: PageData };

const SKIP_KEYS = new Set(["type", "url", "photoUrl", "linkedinUrl", "linkHref", "ctaHref", "mapLink", "showForm", "alt"]);

function stripTags(s: string) {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectText(v: unknown, out: string[]) {
  if (typeof v === "string") {
    const t = stripTags(v);
    if (t) out.push(t);
  } else if (Array.isArray(v)) {
    for (const x of v) collectText(x, out);
  } else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (!SKIP_KEYS.has(k)) collectText(x, out);
    }
  }
}

/** Compact text view of a page: visible copy plus a list of gallery images to describe. */
export function summarizePage(data: PageData): string {
  const texts: string[] = [];
  collectText(data.sections, texts);
  let body = texts.join(" | ");
  if (body.length > SUMMARY_MAX) body = body.slice(0, SUMMARY_MAX) + "…";

  const images: string[] = [];
  (data.sections ?? []).forEach((s, si) => {
    if (s.type !== "gallery") return;
    const title = typeof s.title === "string" ? s.title : "";
    (s.images ?? []).forEach((img, ii) => {
      images.push(`section ${si}, image ${ii} (gallery "${title}", current alt: "${img?.alt ?? ""}")`);
    });
  });

  return [
    `Current title: ${data.seo?.title ?? ""}`,
    `Current description: ${data.seo?.description ?? ""}`,
    `Page copy: ${body}`,
    images.length ? `Gallery images:\n${images.join("\n")}` : "Gallery images: none",
  ].join("\n");
}

export function buildSeoPrompt(pages: SeoPageInput[], profile?: SeoProfile): { system: string; user: string } {
  const system = buildSystemPrompt({
    task: "Write SEO titles, meta descriptions and image alt text for pages of a small business website.",
    locale: detectLocale(profile?.business_name, profile?.description, ...pages.map((p) => summarizePage(p.data))),
    preserveLinks: true,
    extraRules: [
      `Title: ${TITLE_MAX - 10}-${TITLE_MAX} characters, includes the business name and the main service or topic, unique per page. Put the service first and the business name last ("Wedding cakes in Lagos | Kings Bakery"). No keyword stuffing, no "Home |" prefix.`,
      `Meta description: ${DESCRIPTION_MAX - 20}-${DESCRIPTION_MAX} characters, natural sentence, benefit-led, names the location only if the page copy does, ends with a soft call to action starting with a verb. No quotes, no emoji, no exclamation marks.`,
      `Alt text: up to ${ALT_MAX} characters (about 6 to 14 words), describes what the image shows in the context of the business and gallery. Do not start with "image of" or "photo of". Do not invent names, prices or claims. If unsure what is pictured, describe the setting generally.`,
      "Use only facts present in the business details and page copy. Titles and descriptions must differ between pages.",
      'Shape: { "pages": { "<key>": { "title": string, "description": string, "alts": [ { "section": number, "image": number, "alt": string } ] } } }',
      "Return an entry for every page key given. Use an empty alts array when a page has no gallery images.",
    ],
  });

  const lines: string[] = [];
  if (profile) {
    const bits = [
      profile.business_name && `Business: ${profile.business_name}`,
      profile.tagline && `Tagline: ${profile.tagline}`,
      profile.description && `About: ${profile.description}`,
    ].filter(Boolean);
    if (bits.length) lines.push(...(bits as string[]), "");
  }
  for (const p of pages) {
    lines.push(`=== Page "${p.key}" ===`, summarizePage(p.data), "");
  }
  return { system, user: delimitUserData("business and pages", lines.join("\n").trim(), 14000) };
}

function clean(s: unknown) {
  return typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "";
}

/** Trim to max chars on a word boundary. */
export function fitLength(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut.slice(0, max)).replace(/[\s,;:.\-–—]+$/, "");
}

/** Apply model output onto one page. Only seo.title, seo.description and gallery alts can change. */
export function mergeSeoPage(original: PageData, ai: unknown): PageData {
  const a = ai && typeof ai === "object" ? (ai as Record<string, unknown>) : {};
  const title = fitLength(clean(a.title), TITLE_MAX);
  const description = fitLength(clean(a.description), DESCRIPTION_MAX);

  const alts = new Map<string, string>();
  if (Array.isArray(a.alts)) {
    for (const item of a.alts) {
      if (!item || typeof item !== "object") continue;
      const { section, image, alt } = item as Record<string, unknown>;
      const text = fitLength(clean(alt), ALT_MAX);
      if (Number.isInteger(section) && Number.isInteger(image) && text) alts.set(`${section}:${image}`, text);
    }
  }

  return {
    ...original,
    seo: {
      ...original.seo,
      title: title || original.seo.title,
      description: description || original.seo.description,
    },
    sections: original.sections.map((s, si) =>
      s.type === "gallery"
        ? { ...s, images: s.images.map((img, ii) => ({ ...img, alt: alts.get(`${si}:${ii}`) ?? img.alt })) }
        : s,
    ),
  };
}

export function mergeSeoOutput(inputs: SeoPageInput[], ai: unknown): Record<string, PageData> {
  const root = ai && typeof ai === "object" ? (ai as Record<string, unknown>) : {};
  const pagesOut = root.pages && typeof root.pages === "object" ? (root.pages as Record<string, unknown>) : {};
  const result: Record<string, PageData> = {};
  for (const p of inputs) result[p.key] = mergeSeoPage(p.data, pagesOut[p.key]);
  return result;
}

export type SeoChange = {
  id: string;
  pageKey: string;
  field: "title" | "description" | "alt";
  label: string;
  before: string;
  after: string;
  section?: number;
  image?: number;
};

export function listSeoChanges(pageKey: string, before: PageData, after: PageData): SeoChange[] {
  const out: SeoChange[] = [];
  if (before.seo.title !== after.seo.title) {
    out.push({ id: `${pageKey}:title`, pageKey, field: "title", label: "SEO title", before: before.seo.title, after: after.seo.title });
  }
  if (before.seo.description !== after.seo.description) {
    out.push({
      id: `${pageKey}:description`,
      pageKey,
      field: "description",
      label: "SEO description",
      before: before.seo.description,
      after: after.seo.description,
    });
  }
  before.sections.forEach((s, si) => {
    const next = after.sections[si];
    if (s.type !== "gallery" || next?.type !== "gallery") return;
    s.images.forEach((img, ii) => {
      const nextAlt = next.images[ii]?.alt;
      if (nextAlt !== undefined && nextAlt !== img.alt) {
        out.push({
          id: `${pageKey}:alt:${si}:${ii}`,
          pageKey,
          field: "alt",
          label: `Gallery image ${ii + 1} alt text`,
          before: img.alt,
          after: nextAlt,
          section: si,
          image: ii,
        });
      }
    });
  });
  return out;
}

/** Apply only the chosen changes (for one page) onto its current data. */
export function applySeoChanges(data: PageData, changes: SeoChange[]): PageData {
  let next = data;
  for (const c of changes) {
    if (c.field === "title") next = { ...next, seo: { ...next.seo, title: c.after } };
    else if (c.field === "description") next = { ...next, seo: { ...next.seo, description: c.after } };
    else if (c.field === "alt" && c.section !== undefined && c.image !== undefined) {
      next = {
        ...next,
        sections: next.sections.map((s, si) =>
          si === c.section && s.type === "gallery"
            ? { ...s, images: s.images.map((img, ii) => (ii === c.image ? { ...img, alt: c.after } : img)) }
            : s,
        ),
      };
    }
  }
  return next;
}

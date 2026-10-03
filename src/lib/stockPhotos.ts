// Relative imports (not "@/") so the Node test runner can load this module.
import type { PageData, Section } from "./pageSchema.ts";
import {
  PEOPLE_PHOTOS, PHOTO_CATEGORIES, STOCK_PHOTOS, type PhotoCategory, type StockPhoto,
} from "./stockPhotoData.ts";

export { PEOPLE_PHOTOS, PHOTO_CATEGORIES, STOCK_PHOTOS, type PhotoCategory, type StockPhoto };

const GALLERY_SIZE = 6;

const TEMPLATE_CATEGORY: Record<string, PhotoCategory> = {
  t1: "corporate", t2: "creative", t3: "creative", t4: "tech", t5: "beauty", t6: "real_estate", t7: "food", t8: "clinic", t9: "fitness",
};

export const PHOTO_CATEGORY_PROMPT = `Also include a top-level "photoCategory" field: the ONE value from this list that best fits the business: ${PHOTO_CATEGORIES.join(", ")}. Leave every image "url" and "photoUrl" as "" — the server fills in photos.`;

export function photoUrl(id: string, width = 1600) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=75`;
}

export function normalizeCategory(value: unknown): PhotoCategory {
  const v = typeof value === "string" ? value.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
  return (PHOTO_CATEGORIES as readonly string[]).includes(v) ? (v as PhotoCategory) : "general";
}

export function categoryForTemplate(templateKey: string | null | undefined): PhotoCategory {
  return (templateKey && TEMPLATE_CATEGORY[templateKey]) || "general";
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shuffled<T>(items: T[], seed: string): T[] {
  let a = hash(seed) || 1;
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Ordered, de-duplicated pool: category photos first, then the rest of the library. */
function pool(category: PhotoCategory, seed: string): StockPhoto[] {
  const seen = new Set<string>();
  const out: StockPhoto[] = [];
  const add = (list: StockPhoto[]) => {
    for (const p of list) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
  };
  add(shuffled(STOCK_PHOTOS[category], seed));
  if (category !== "general") add(shuffled(STOCK_PHOTOS.general, seed));
  add(shuffled(PHOTO_CATEGORIES.flatMap((c) => STOCK_PHOTOS[c]), seed));
  return out;
}

export function pickPhotos(category: PhotoCategory, count: number, seed: string): StockPhoto[] {
  const p = pool(category, seed);
  return Array.from({ length: Math.max(0, count) }, (_, i) => p[i % p.length]!);
}

function picker(list: StockPhoto[]) {
  let i = 0;
  return () => list[i++ % list.length]!;
}

function galleryInsertIndex(sections: Section[]) {
  const i = sections.findIndex((s) => s.type === "faq" || s.type === "contact_card");
  return i === -1 ? sections.length : i;
}

export function fillSiteImages<T extends Record<string, PageData>>(
  pages: T,
  category: PhotoCategory,
  seed: string,
): T {
  const next = picker(pool(category, seed));
  const nextPerson = picker(shuffled(PEOPLE_PHOTOS, seed));
  const toImage = (p: StockPhoto) => ({ url: photoUrl(p.id), alt: p.alt });

  const fillSection = (s: Section): Section => {
    if (s.type === "gallery") {
      const images = Array.isArray(s.images) ? s.images : [];
      const hasUrl = (im: { url?: unknown } | null | undefined) =>
        typeof im?.url === "string" && im.url.trim();
      if (images.every((im) => !hasUrl(im)) && images.length < GALLERY_SIZE) {
        return { ...s, images: Array.from({ length: GALLERY_SIZE }, () => toImage(next())) };
      }
      return { ...s, images: images.map((im) => (hasUrl(im) ? im : toImage(next()))) };
    }
    if (s.type === "team") {
      const members = Array.isArray(s.members) ? s.members : [];
      return {
        ...s,
        members: members.map((m) =>
          typeof m?.photoUrl === "string" && m.photoUrl.trim()
            ? m
            : { ...m, photoUrl: photoUrl(nextPerson().id, 800) },
        ),
      };
    }
    return s;
  };

  const out = {} as Record<string, PageData>;
  for (const [key, page] of Object.entries(pages)) {
    let sections = page.sections.map(fillSection);
    if (key === "home" && !sections.some((s) => s.type === "gallery")) {
      const at = galleryInsertIndex(sections);
      const gallery: Section = {
        type: "gallery",
        title: "Gallery",
        images: Array.from({ length: GALLERY_SIZE }, () => toImage(next())),
      };
      sections = [...sections.slice(0, at), gallery, ...sections.slice(at)];
    }
    out[key] = { ...page, sections };
  }
  return out as T;
}

/**
 * AI models often ignore "leave url empty" and invent URLs, which blocks fillSiteImages
 * (which never overwrites a non-empty url/photoUrl, to protect user data). This clears
 * AI-invented gallery image urls and team photoUrls before filling, so the fill step
 * always runs.
 */
export function stripAiImageUrls<T extends Record<string, PageData>>(pages: T): T {
  const stripSection = (s: Section): Section => {
    if (s.type === "gallery") {
      const images = Array.isArray(s.images) ? s.images : undefined;
      if (!images) return s;
      return { ...s, images: images.map((im) => ({ ...im, url: "" })) };
    }
    if (s.type === "team") {
      const members = Array.isArray(s.members) ? s.members : undefined;
      if (!members) return s;
      return { ...s, members: members.map((m) => ({ ...m, photoUrl: "" })) };
    }
    return s;
  };

  const out = {} as Record<string, PageData>;
  for (const [key, page] of Object.entries(pages)) {
    out[key] = { ...page, sections: page.sections.map(stripSection) };
  }
  return out as T;
}

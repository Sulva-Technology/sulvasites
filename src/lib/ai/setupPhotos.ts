// Owner photo choices for the assistant setup step. Pure; relative imports only (Node test runner).
import type { PageData, Section } from "../pageSchema.ts";
import type { ColorChoice } from "./setupPalette.ts";

export type ImageRef = { url: string; alt: string };

/** Client only: a photo the owner picked from disk, uploaded after the site exists. */
export type SetupUpload = { file: File; previewUrl: string; alt: string };

export type SiteSetup = {
  logo: { file: File; previewUrl: string } | null;
  color: ColorChoice | null;
  /** At most MAX_SETUP_UPLOADS. */
  uploads: SetupUpload[];
  /** StockPhoto ids picked in the demo grid, at most MAX_STOCK_PICKS. */
  stockIds: string[];
  skipped: { logo: boolean; color: boolean; photos: boolean };
};

export const MAX_SETUP_UPLOADS = 8;
export const MAX_STOCK_PICKS = 12;
export const MAX_SETUP_FILE_BYTES = 10 * 1024 * 1024;

/** Gallery url placeholder for owner uploads: "upload:0", "upload:1"… */
export const UPLOAD_TOKEN = "upload:";

const STOCK_PREFIX = "https://images.unsplash.com/photo-";
const GALLERY_SIZE = 6;

export function emptySetup(): SiteSetup {
  return { logo: null, color: null, uploads: [], stockIds: [], skipped: { logo: false, color: false, photos: false } };
}

/** Only photo URLs built by photoUrl() may reach pages from the client. */
export function isAllowedStockUrl(url: unknown): boolean {
  return typeof url === "string" && url.startsWith(STOCK_PREFIX) && url.length <= 300;
}

/** "upload:3" -> 3; anything else -> -1. */
export function uploadIndex(url: unknown): number {
  if (typeof url !== "string" || !url.startsWith(UPLOAD_TOKEN)) return -1;
  const rest = url.slice(UPLOAD_TOKEN.length);
  return /^\d{1,2}$/.test(rest) ? Number(rest) : -1;
}

const hasUrl = (im: { url?: unknown } | null | undefined) => typeof im?.url === "string" && !!im.url.trim();

// Same spot fillSiteImages uses, so a gallery created here is not duplicated there.
function galleryInsertIndex(sections: Section[]) {
  const i = sections.findIndex((s) => s.type === "faq" || s.type === "contact_card");
  return i === -1 ? sections.length : i;
}

/**
 * Puts the owner's images (upload tokens and picked stock) into empty gallery slots:
 * home gallery first (created if missing), then other pages' galleries. Anything left
 * is appended to the home gallery. Team photos and existing urls are never touched.
 */
export function placeOwnerImages<T extends Record<string, PageData>>(pages: T, owner: ImageRef[]): T {
  if (!owner.length) return pages;
  const queue = [...owner];
  const out = {} as Record<string, PageData>;

  const fill = (s: Section): Section => {
    if (s.type !== "gallery") return s;
    let images = Array.isArray(s.images) ? s.images : [];
    // Mirror fillSiteImages: an all-empty short gallery becomes a full one.
    if (images.every((im) => !hasUrl(im)) && images.length < GALLERY_SIZE) {
      images = Array.from({ length: GALLERY_SIZE }, (_, i) => images[i] ?? { url: "", alt: "" });
    }
    return { ...s, images: images.map((im) => (hasUrl(im) || !queue.length ? im : { ...queue.shift()! })) };
  };

  const keys = Object.keys(pages);
  const ordered = keys.includes("home") ? ["home", ...keys.filter((k) => k !== "home")] : keys;
  for (const key of ordered) {
    const page = pages[key]!;
    let sections = page.sections;
    if (key === "home" && !sections.some((s) => s.type === "gallery")) {
      const at = galleryInsertIndex(sections);
      const gallery: Section = { type: "gallery", title: "Gallery", images: Array.from({ length: GALLERY_SIZE }, () => ({ url: "", alt: "" })) };
      sections = [...sections.slice(0, at), gallery, ...sections.slice(at)];
    }
    out[key] = { ...page, sections: sections.map(fill) };
  }

  if (queue.length && out.home) {
    const home = out.home;
    const gi = home.sections.findIndex((s) => s.type === "gallery");
    const g = home.sections[gi];
    if (g && g.type === "gallery") {
      const sections = [...home.sections];
      sections[gi] = { ...g, images: [...g.images, ...queue.splice(0).map((x) => ({ ...x }))] };
      out.home = { ...home, sections };
    }
  }

  // keep the caller's key order
  const result = {} as Record<string, PageData>;
  for (const k of keys) result[k] = out[k]!;
  return result as T;
}

/**
 * Swaps "upload:N" gallery urls for the uploaded public urls. A failed or missing
 * upload (null / out of range) uses fallback(N) instead.
 */
export function replaceUploadTokens<T extends Record<string, PageData>>(
  pages: T,
  urls: Array<string | null>,
  fallback: (i: number) => ImageRef,
): T {
  const swap = (s: Section): Section => {
    if (s.type !== "gallery" || !Array.isArray(s.images)) return s;
    return {
      ...s,
      images: s.images.map((im) => {
        const n = uploadIndex(im?.url);
        if (n < 0) return im;
        const real = urls[n];
        return real ? { ...im, url: real } : { ...fallback(n) };
      }),
    };
  };
  const out = {} as Record<string, PageData>;
  for (const [key, page] of Object.entries(pages)) out[key] = { ...page, sections: page.sections.map(swap) };
  return out as T;
}

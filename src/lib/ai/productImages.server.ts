// Product photos for the "Ask AI" assistant: search real photos by what the product is, let a vision
// model look at the candidates and keep only the ones that show the item. The main assistant model is
// text-only, so the looking is done by OPENROUTER_VISION_MODEL. Never throws: when search or vision is
// unavailable the owner simply gets fewer (or no) suggestions and can still upload their own.
// Relative imports only (Node test runner).
import { extractJson } from "./groq.server.ts";
import { openRouterVisionChat, visionConfigured } from "./openrouter.server.ts";
import { isAllowedProductImageUrl, type ImageChoice } from "./shopAssistant.ts";
import type { AssistantAction } from "./siteAssistant.ts";
import { STOCK_PHOTOS, hintWords, photoUrl } from "../stockPhotos.ts";

type Env = Record<string, string | undefined>;
export type ImageDeps = { env?: Env; fetch?: typeof fetch; now?: () => number };

const CANDIDATES = 6;
const KEEP = 3;
const MAX_PRODUCTS = 15;
const WORKERS = 4;
const SEARCH_TIMEOUT_MS = 6000;
const VISION_TIMEOUT_MS = 18000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
const text = (v: unknown, max = 200) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

// ---------- providers ----------

/** Pexels search response to choices. Exported for tests. */
export function mapPexels(json: unknown, fallbackAlt: string): ImageChoice[] {
  const photos = isRecord(json) && Array.isArray(json.photos) ? json.photos : [];
  const out: ImageChoice[] = [];
  for (const p of photos) {
    if (!isRecord(p) || !isRecord(p.src)) continue;
    const url = text(p.src.large, 600);
    const thumb = text(p.src.medium, 600) || url;
    if (!isAllowedProductImageUrl(url) || !isAllowedProductImageUrl(thumb)) continue;
    const who = text(p.photographer, 60);
    out.push({
      url, thumb, alt: text(p.alt, 140) || fallbackAlt,
      credit: who ? `Photo by ${who} on Pexels` : "Photo from Pexels", source: "pexels", why: null,
    });
  }
  return out;
}

/** Unsplash search response to choices. Exported for tests. */
export function mapUnsplash(json: unknown, fallbackAlt: string): ImageChoice[] {
  const results = isRecord(json) && Array.isArray(json.results) ? json.results : [];
  const out: ImageChoice[] = [];
  for (const r of results) {
    if (!isRecord(r) || !isRecord(r.urls)) continue;
    const url = text(r.urls.regular, 600);
    const thumb = text(r.urls.small, 600) || url;
    if (!isAllowedProductImageUrl(url) || !isAllowedProductImageUrl(thumb)) continue;
    const who = isRecord(r.user) ? text(r.user.name, 60) : "";
    out.push({
      url, thumb, alt: text(r.alt_description, 140) || text(r.description, 140) || fallbackAlt,
      credit: who ? `Photo by ${who} on Unsplash` : "Photo from Unsplash", source: "unsplash", why: null,
    });
  }
  return out;
}

/** Curated photos whose description really mentions the query. Nothing when none do: never a random category shot. */
export function libraryMatches(query: string): ImageChoice[] {
  const hints = hintWords(query);
  if (!hints.length) return [];
  const scored: Array<{ id: string; alt: string; score: number }> = [];
  const seen = new Set<string>();
  for (const list of Object.values(STOCK_PHOTOS)) {
    for (const p of list) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const alt = p.alt.toLowerCase();
      const score = hints.reduce((n, h) => n + (alt.includes(h) ? 1 : 0), 0);
      if (score > 0) scored.push({ ...p, score });
    }
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((p) => ({
      url: photoUrl(p.id, 1200), thumb: photoUrl(p.id, 400), alt: p.alt, credit: "Photo from Unsplash",
      source: "library" as const, why: null,
    }));
}

async function getJson(fetchImpl: typeof fetch, url: string, headers: Record<string, string>): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { headers, signal: controller.signal });
    return res.ok ? await res.json().catch(() => null) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Real photos for a search phrase: Pexels, then Unsplash (whichever keys are set), then matching curated shots. */
export async function searchProductPhotos(query: string, deps: ImageDeps = {}): Promise<ImageChoice[]> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetch ?? fetch;
  const q = query.trim().slice(0, 80);
  if (!q) return [];
  const enc = encodeURIComponent(q);
  let found: ImageChoice[] = [];

  if (env.PEXELS_API_KEY) {
    const json = await getJson(fetchImpl, `https://api.pexels.com/v1/search?query=${enc}&per_page=${CANDIDATES}`, { Authorization: env.PEXELS_API_KEY });
    found = mapPexels(json, q);
  }
  if (found.length < 3 && env.UNSPLASH_ACCESS_KEY) {
    const json = await getJson(
      fetchImpl,
      `https://api.unsplash.com/search/photos?query=${enc}&per_page=${CANDIDATES}&content_filter=high`,
      { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}`, "Accept-Version": "v1" },
    );
    found = [...found, ...mapUnsplash(json, q)];
  }
  found = [...found, ...libraryMatches(q)];
  const seen = new Set<string>();
  return found.filter((c) => !seen.has(c.url) && seen.add(c.url)).slice(0, CANDIDATES);
}

// ---------- vision ----------

const VISION_SYSTEM =
  "You choose product photos for a small business's online shop. You are shown numbered candidate photos, in order. " +
  "Pick up to " + KEEP + " that clearly show the product described, best first. " +
  "Reject a photo if it shows a different item, a collage, a screenshot, visible text, a watermark or a logo, a person's face as the main subject (unless the product is worn), anything unsafe, or if it is blurry or cluttered. " +
  'Reply with one JSON object only: {"picks":[{"image":<number>,"why":"<one short sentence on what you can see>"}]}. If no photo fits, reply {"picks":[]}.';

/** The vision model's picks as ordered choices. Exported for tests. */
export function parsePicks(raw: unknown, candidates: ImageChoice[]): ImageChoice[] | null {
  const picks = isRecord(raw) && Array.isArray(raw.picks) ? raw.picks : null;
  if (!picks) return null;
  const out: ImageChoice[] = [];
  const taken = new Set<number>();
  for (const p of picks) {
    if (!isRecord(p)) continue;
    const at = Number(p.image) - 1;
    const c = candidates[at];
    if (c && !taken.has(at)) {
      taken.add(at);
      out.push({ ...c, why: text(p.why, 160) || null });
    }
    if (out.length >= KEEP) break;
  }
  return out;
}

/**
 * Looks at the candidates and keeps the ones that show `product`. null means vision could not run
 * (off, timed out, garbled): the caller then falls back to the provider's own relevance order.
 */
export async function pickWithVision(
  product: { name: string; description: string; query: string },
  candidates: ImageChoice[],
  deps: ImageDeps & { timeoutMs?: number } = {},
): Promise<ImageChoice[] | null> {
  const env = deps.env ?? process.env;
  if (!visionConfigured(env) || candidates.length === 0) return null;
  try {
    const reply = await openRouterVisionChat(
      {
        system: VISION_SYSTEM,
        user:
          `Product: ${product.name}\n` +
          (product.description ? `About it: ${product.description.slice(0, 200)}\n` : "") +
          `Search phrase used: ${product.query}\n` +
          `The ${candidates.length} candidate photos follow, numbered 1 to ${candidates.length} in order.`,
        images: candidates.map((c) => c.thumb),
        temperature: 0.1,
        reasoningEffort: "low",
        maxTokens: 1500,
        timeoutMs: deps.timeoutMs ?? VISION_TIMEOUT_MS,
      },
      { env, fetch: deps.fetch },
    );
    return parsePicks(extractJson(reply), candidates);
  } catch (e) {
    console.error("Product photo check failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

// ---------- the whole step ----------

/** What the vision model sees in photos the owner attached, one sentence each. Empty when vision is unavailable. */
export async function describeOwnerPhotos(photos: string[], deps: ImageDeps = {}): Promise<string[]> {
  const env = deps.env ?? process.env;
  if (!photos.length || !visionConfigured(env)) return [];
  try {
    const reply = await openRouterVisionChat(
      {
        system:
          "You describe product photos for a shop owner who is adding items to their online store. For each photo, in order, say what the item is, its colour, material and any readable text, brand or size, in one or two plain sentences. " +
          'Say only what you can see; never guess a price. Reply with one JSON object only: {"photos":[{"description":"..."}]}.',
        user: `${photos.length} photo${photos.length === 1 ? "" : "s"} follow, in order.`,
        images: photos,
        temperature: 0.1,
        reasoningEffort: "low",
        maxTokens: 2000,
        timeoutMs: VISION_TIMEOUT_MS,
      },
      { env, fetch: deps.fetch },
    );
    const list = (extractJson(reply) as { photos?: unknown }).photos;
    return Array.isArray(list) ? list.map((p) => (isRecord(p) ? text(p.description, 300) : "")) : [];
  } catch (e) {
    console.error("Describing owner photos failed:", e instanceof Error ? e.message : e);
    return [];
  }
}

/**
 * Fills imageOptions on every add_product action: the owner's own photo when they attached one,
 * otherwise real photos found by what the product is and confirmed by the vision model.
 * Stops starting new work once `deadline` (ms since epoch) is near so the request still finishes.
 */
export async function enrichProductImages(actions: AssistantAction[], deadline: number, deps: ImageDeps = {}): Promise<void> {
  const now = deps.now ?? Date.now;
  const queue = actions.filter((a): a is Extract<AssistantAction, { type: "add_product" }> => a.type === "add_product");
  const used = new Set<string>();

  const work = queue.slice(0, MAX_PRODUCTS);
  for (const a of queue) {
    if (a.product.photo) {
      const n = a.product.photo;
      a.imageOptions = [{ url: `upload:${n}`, thumb: `upload:${n}`, alt: a.product.name, credit: null, source: "upload", why: "Your photo" }];
    }
  }

  let next = 0;
  async function worker() {
    for (;;) {
      const a = work[next++];
      if (!a) return;
      if (a.product.photo || now() > deadline - 4000) continue;
      try {
        const queries = [...new Set([a.product.imageQuery, a.product.name])];
        let found: ImageChoice[] = [];
        for (const q of queries) {
          found = (await searchProductPhotos(q, deps)).filter((c) => !used.has(c.url));
          if (found.length >= 2) break;
        }
        if (!found.length) continue;
        // Claim these now so a product being searched at the same moment cannot be offered the same photos.
        for (const c of found) used.add(c.url);
        const left = deadline - now();
        const picked =
          (await pickWithVision({ name: a.product.name, description: a.product.description, query: a.product.imageQuery }, found, {
            ...deps,
            timeoutMs: Math.max(3000, Math.min(VISION_TIMEOUT_MS, left - 2000)),
          })) ?? found.slice(0, KEEP);
        const kept = new Set(picked.map((c) => c.url));
        for (const c of found) if (!kept.has(c.url)) used.delete(c.url);
        a.imageOptions = picked;
      } catch (e) {
        console.error("Product photo search failed:", e instanceof Error ? e.message : e);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(WORKERS, work.length) }, worker));
}

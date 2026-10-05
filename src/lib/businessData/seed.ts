// "Import from my site content": turn the section items already on the site's pages into manager rows.
// Relative imports (not "@/") so the Node test runner can load this module.
import type { PageData } from "../pageSchema.ts";
import { HTTPS_URL_RE, NAME_MAX } from "./validate.ts";
import { kindDef, type KindDef } from "./kinds.ts";
import { categoryForTemplate } from "../stockPhotos.ts";
import type { BusinessItemInput, BusinessKind } from "./types.ts";

export const SEED_MAX = 100;

function clip(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

type Candidate = { name: string; data: Record<string, unknown> };

function candidates(def: KindDef, pages: PageData[]): Candidate[] {
  const out: Candidate[] = [];
  for (const page of pages) {
    for (const s of page?.sections ?? []) {
      if (def.target === "services" && s.type === "services") {
        for (const it of s.items ?? []) out.push({ name: clip(it?.title, NAME_MAX), data: { description: clip(it?.desc, 600) } });
      } else if (def.target === "team" && s.type === "team") {
        for (const m of s.members ?? []) {
          const photo = typeof m?.photoUrl === "string" && HTTPS_URL_RE.test(m.photoUrl) && m.photoUrl.length <= 600 ? m.photoUrl : "";
          out.push({
            name: clip(m?.name, NAME_MAX),
            data: { specialty: clip(m?.role, 100), bio: clip(m?.bio, 800), ...(photo ? { photo } : {}) },
          });
        }
      } else if (def.target === "use_cases" && s.type === "use_cases") {
        for (const it of s.items ?? []) out.push({ name: clip(it?.title, NAME_MAX), data: { description: clip(it?.description, 600) } });
      }
    }
  }
  return out;
}

/**
 * Rows to insert for `kind`: items from the pages' matching sections, minus blanks, duplicates (by name,
 * case-insensitive, also against `existingNames`) and fields the kind does not have.
 */
export function seedFromPages(
  kind: BusinessKind,
  templateKey: string | null | undefined,
  pages: PageData[],
  existingNames: string[],
): BusinessItemInput[] {
  const def = kindDef(kind, categoryForTemplate(templateKey));
  const fieldKeys = new Set(def.fields.map((f) => f.key));
  const seen = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  const out: BusinessItemInput[] = [];
  for (const c of candidates(def, pages)) {
    const key = c.name.toLowerCase();
    if (!c.name || seen.has(key)) continue;
    seen.add(key);
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(c.data)) if (fieldKeys.has(k) && v !== "") data[k] = v;
    out.push({ name: c.name, price_kobo: null, data, active: true });
    if (out.length >= SEED_MAX) break;
  }
  return out;
}

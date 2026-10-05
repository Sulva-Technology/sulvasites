// Pure mapper: business_items rows -> the existing section arrays templates already render.
// Relative imports (not "@/") so the Node test runner can load this module.
import type { PageData, Section } from "../pageSchema.ts";
import { categoryForTemplate } from "../stockPhotos.ts";
import { DAYS, DIETARY, PROJECT_STATUSES, kindDef, kindsForCategory, type KindDef, type SectionTarget } from "./kinds.ts";
import { formatKobo } from "./price.ts";
import type { BusinessItemRow, BusinessKind } from "./types.ts";

/** Items shown on the home page when the site has other pages (a teaser, the full list lives elsewhere). */
export const HOME_TEASER: Record<SectionTarget, number> = { services: 6, use_cases: 6, team: 4 };
/** Max gallery photos contributed by business items. */
export const GALLERY_ADD_MAX = 12;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const label = (list: ReadonlyArray<{ value: string; label: string }>, v: unknown) =>
  list.find((o) => o.value === v)?.label ?? "";

function dayIndex(v: unknown) {
  const i = DAYS.findIndex((d) => d.value === v);
  return i < 0 ? 99 : i;
}

/** Display order: manual `position`, except auto-sorted kinds (timetable) and grouped kinds (menu sections). */
export function orderItems(items: BusinessItemRow[], def: Pick<KindDef, "autoSort" | "groupBy">): BusinessItemRow[] {
  const byPos = [...items].sort((a, b) => a.position - b.position || (a.created_at ?? "").localeCompare(b.created_at ?? "") || a.id.localeCompare(b.id));
  if (def.autoSort) {
    return byPos.sort(
      (a, b) =>
        dayIndex(a.data.day) - dayIndex(b.data.day) ||
        str(a.data.start).localeCompare(str(b.data.start)) ||
        a.position - b.position,
    );
  }
  if (def.groupBy) {
    const key = def.groupBy;
    const first = new Map<string, number>();
    byPos.forEach((it, i) => {
      const g = str(it.data[key]).trim().toLowerCase();
      if (!first.has(g)) first.set(g, i);
    });
    return byPos.sort(
      (a, b) =>
        (first.get(str(a.data[key]).trim().toLowerCase()) ?? 0) - (first.get(str(b.data[key]).trim().toLowerCase()) ?? 0),
    );
  }
  return byPos;
}

const join = (parts: Array<string | null | undefined | false>, sep = " · ") =>
  parts.filter((p): p is string => typeof p === "string" && p.trim() !== "").join(sep);

/** { title, desc } for the `services` section. */
export function toServiceItem(it: BusinessItemRow): { title: string; desc: string } {
  const price = it.price_kobo != null ? formatKobo(it.price_kobo) : "";
  const d = it.data;
  switch (it.kind) {
    case "menu_item": {
      const tags = Array.isArray(d.dietary)
        ? d.dietary.map((t) => label(DIETARY, t)).filter(Boolean).join(", ")
        : "";
      return { title: it.name, desc: join([price, str(d.description), tags && `(${tags})`]) };
    }
    case "timetable_slot": {
      const day = label(DAYS, d.day);
      const time = d.start ? (d.end ? `${str(d.start)}–${str(d.end)}` : str(d.start)) : "";
      return {
        title: it.name,
        desc: join([join([day, time], " "), str(d.instructor) && `with ${str(d.instructor)}`, str(d.description)]),
      };
    }
    case "programme":
      return { title: it.name, desc: join([str(d.duration), price && `Fee: ${price}`, str(d.description)]) };
    case "package":
      return { title: it.name, desc: join([price, str(d.duration), str(d.description)]) };
    default:
      return { title: it.name, desc: join([price, str(d.duration), str(d.description)]) };
  }
}

export function toTeamMember(it: BusinessItemRow) {
  const d = it.data;
  const fee = it.price_kobo != null ? `Consultation: ${formatKobo(it.price_kobo)}` : "";
  const photo = str(d.photo);
  return {
    name: it.name,
    role: str(d.specialty),
    bio: join([str(d.bio), fee], " "),
    ...(photo ? { photoUrl: photo } : {}),
  };
}

export function toUseCaseItem(it: BusinessItemRow) {
  const d = it.data;
  const price = it.price_kobo != null ? formatKobo(it.price_kobo) : "";
  return {
    title: it.name,
    description: join([str(d.location), label(PROJECT_STATUSES, d.status), price, str(d.description)]),
  };
}

function galleryUrls(it: BusinessItemRow, from: "photo" | "photos"): Array<{ url: string; alt: string }> {
  const raw = from === "photo" ? [it.data.photo] : Array.isArray(it.data.photos) ? it.data.photos : [];
  return raw.filter((u): u is string => typeof u === "string" && u !== "").map((url) => ({ url, alt: it.name }));
}

export type MergeOptions = {
  templateKey: string;
  /** The core page key being rendered ("home" etc.) or null for extra pages. */
  pageKey?: string | null;
  /** True when the site has other published pages, so the home page shows a teaser only. */
  homeTeaser?: boolean;
};

type Plan = {
  services?: Array<{ title: string; desc: string }>;
  team?: ReturnType<typeof toTeamMember>[];
  use_cases?: ReturnType<typeof toUseCaseItem>[];
  gallery: Array<{ url: string; alt: string }>;
};

/** Group usable items per target section and per gallery. Pure; also used by tests. */
export function planBusinessData(items: BusinessItemRow[], templateKey: string): Plan {
  const category = categoryForTemplate(templateKey);
  const allowed = kindsForCategory(category);
  const plan: Plan = { gallery: [] };
  const used = new Set<SectionTarget>();

  for (const kind of allowed) {
    const mine = items.filter((i) => i.kind === kind && i.active);
    if (mine.length === 0) continue;
    const def = kindDef(kind, category);
    if (used.has(def.target)) continue; // first manager (display order) owning a target wins
    used.add(def.target);
    const ordered = orderItems(mine, def);
    if (def.target === "services") plan.services = ordered.map(toServiceItem);
    else if (def.target === "team") plan.team = ordered.map(toTeamMember);
    else plan.use_cases = ordered.map(toUseCaseItem);
    if (def.galleryFrom) for (const it of ordered) plan.gallery.push(...galleryUrls(it, def.galleryFrom));
  }
  return plan;
}

/**
 * Return `page` with business data merged in. Sections of a target type whose manager has active items get
 * those items; all other sections (and sites without any items) are returned untouched.
 */
export function mergeBusinessData(page: PageData, items: BusinessItemRow[], opts: MergeOptions): PageData {
  if (!items.length) return page;
  const plan = planBusinessData(items, opts.templateKey);
  if (!plan.services && !plan.team && !plan.use_cases && plan.gallery.length === 0) return page;

  const teaser = opts.homeTeaser && opts.pageKey === "home";
  const cap = <T,>(list: T[], target: SectionTarget): T[] => (teaser ? list.slice(0, HOME_TEASER[target]) : list);

  const sections = page.sections.map((s): Section => {
    switch (s.type) {
      case "services":
        return plan.services ? { ...s, items: cap(plan.services, "services") } : s;
      case "team":
        return plan.team ? { ...s, members: cap(plan.team, "team") } : s;
      case "use_cases":
        return plan.use_cases ? { ...s, items: cap(plan.use_cases, "use_cases") } : s;
      case "gallery": {
        if (plan.gallery.length === 0) return s;
        const base = (s.images ?? []).filter((i) => i && i.url);
        const seen = new Set(base.map((i) => i.url));
        const extra = plan.gallery.filter((g) => !seen.has(g.url) && seen.add(g.url)).slice(0, GALLERY_ADD_MAX);
        return extra.length ? { ...s, images: [...base, ...extra] } : s;
      }
      default:
        return s;
    }
  });
  return { ...page, sections };
}

export type BusinessKindLike = BusinessKind;

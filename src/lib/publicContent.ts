// What visitors see of a page: blank list items are removed and list or text sections with nothing
// real in them are dropped. Templates show demo copy (sample reviews, client logos, FAQs) to guide
// owners in the editor when a list is empty; this keeps that copy off published sites, e.g. after an
// owner adds a preset page and publishes it before filling it in. Pure: relative imports only.
import type { PageData, Section } from "./pageSchema.ts";

const filled = (v: unknown) => typeof v === "string" && v.trim().length > 0;
const textOf = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();

/** The section as visitors should see it, or null when it has nothing real to show. */
export function publicSection(s: Section): Section | null {
  switch (s.type) {
    case "services":
    case "values": {
      const items = (s.items ?? []).filter((i) => filled(i.title));
      return items.length ? { ...s, items } : null;
    }
    case "use_cases": {
      const items = (s.items ?? []).filter((i) => filled(i.title));
      return items.length ? { ...s, items } : null;
    }
    case "faq": {
      const items = (s.items ?? []).filter((i) => filled(i.question) && filled(i.answer));
      return items.length ? { ...s, items } : null;
    }
    case "testimonials": {
      const items = (s.items ?? []).filter((i) => filled(i.quote));
      return items.length ? { ...s, items } : null;
    }
    case "backed_by": {
      const logos = (s.logos ?? []).filter((l) => filled(l.name) || filled(l.url));
      return logos.length ? { ...s, logos } : null;
    }
    case "team": {
      const members = (s.members ?? []).filter((m) => filled(m.name));
      return members.length ? { ...s, members } : null;
    }
    case "richtext":
      return textOf(s.body ?? "") ? s : null;
    default:
      return s;
  }
}

export function publicPage<P extends PageData | null | undefined>(page: P): P {
  if (!page || !Array.isArray(page.sections)) return page;
  return { ...page, sections: page.sections.map(publicSection).filter((s): s is Section => s !== null) };
}

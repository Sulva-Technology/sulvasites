// Relative import (not "@/") so the Node test runner can load this module.
import { defaultSection, type PageData, type Section } from "../lib/pageSchema.ts";

/**
 * Recommended extra pages per template, so each template ships as a full
 * professional site (not just Home / About / Contact). They're created as
 * drafts in `extra_pages` and served at /p/<key>.
 */
export type PagePreset = {
  key: string;
  label: string;
  sections: Section["type"][];
  /** Optional hero headline to seed, so the page isn't blank. */
  headline?: string;
};

const PRESETS: Record<string, PagePreset[]> = {
  // Corporate
  t1: [
    { key: "services", label: "Services", headline: "What we deliver", sections: ["hero", "services", "use_cases", "faq", "contact_card"] },
    { key: "case-studies", label: "Case Studies", headline: "Results that speak", sections: ["hero", "use_cases", "backed_by", "testimonials", "contact_card"] },
  ],
  // Editorial
  t2: [
    { key: "work", label: "Work", headline: "Selected stories", sections: ["hero", "use_cases", "gallery", "contact_card"] },
    { key: "journal", label: "Journal", headline: "Notes & ideas", sections: ["hero", "richtext", "richtext", "contact_card"] },
  ],
  // Portfolio / personal brand
  t3: [
    { key: "work", label: "Work", headline: "Selected work", sections: ["hero", "use_cases", "gallery", "testimonials", "contact_card"] },
    { key: "services", label: "Services", headline: "Ways we can work together", sections: ["hero", "services", "values", "faq", "contact_card"] },
  ],
  // Product / app
  t4: [
    { key: "features", label: "Features", headline: "Everything you need", sections: ["hero", "services", "use_cases", "faq", "contact_card"] },
    { key: "how-it-works", label: "How It Works", headline: "Simple from day one", sections: ["hero", "values", "testimonials", "faq", "contact_card"] },
  ],
  // Glam / booking
  t5: [
    { key: "services", label: "Services", headline: "Services & pricing", sections: ["hero", "services", "faq", "contact_card"] },
    { key: "portfolio", label: "Portfolio", headline: "Recent looks", sections: ["hero", "gallery", "testimonials", "contact_card"] },
    { key: "book", label: "Book", headline: "Book your appointment", sections: ["hero", "richtext", "faq", "contact_card"] },
  ],
  // Real estate
  t6: [
    { key: "properties", label: "Properties", headline: "Available properties", sections: ["hero", "use_cases", "gallery", "contact_card"] },
    { key: "services", label: "Services", headline: "How we help you buy", sections: ["hero", "services", "values", "faq", "contact_card"] },
  ],
  // Restaurant
  t7: [
    { key: "menu", label: "Menu", headline: "Our menu", sections: ["hero", "services", "gallery", "contact_card"] },
    { key: "reservations", label: "Reservations", headline: "Book a table", sections: ["hero", "richtext", "faq", "contact_card"] },
    { key: "events", label: "Private dining", headline: "Private dining & events", sections: ["hero", "richtext", "gallery", "contact_card"] },
  ],
  // Clinic / health
  t8: [
    { key: "services", label: "Treatments", headline: "Treatments & services", sections: ["hero", "services", "faq", "contact_card"] },
    { key: "doctors", label: "Our doctors", headline: "Meet our doctors", sections: ["hero", "team", "testimonials", "contact_card"] },
    { key: "book", label: "Book a visit", headline: "Book a visit", sections: ["hero", "richtext", "faq", "contact_card"] },
  ],
  // Fitness
  t9: [
    { key: "classes", label: "Classes", headline: "Classes", sections: ["hero", "services", "gallery", "contact_card"] },
    { key: "membership", label: "Membership", headline: "Membership", sections: ["hero", "values", "faq", "contact_card"] },
    { key: "coaches", label: "Coaches", headline: "Coaches", sections: ["hero", "team", "testimonials", "contact_card"] },
  ],
};

export function getPagePresets(templateKey: string): PagePreset[] {
  return PRESETS[templateKey] ?? [];
}

export function buildPresetPageData(preset: PagePreset): PageData {
  return {
    seo: { title: preset.label, description: "" },
    sections: preset.sections.map((type) => {
      const s = defaultSection(type);
      if (s.type === "hero" && preset.headline) return { ...s, headline: preset.headline };
      return s;
    }),
  };
}

/** Nav label for an extra page: preset label if known, else "our-work" → "Our Work". */
export function labelForPageKey(templateKey: string, key: string): string {
  const preset = getPagePresets(templateKey).find((p) => p.key === key);
  if (preset) return preset.label;
  return key
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

/** Orders extra pages: template presets first (in preset order), then the rest alphabetically. */
export function sortPageKeys(templateKey: string, keys: string[]): string[] {
  const order = getPagePresets(templateKey).map((p) => p.key);
  const rank = (k: string) => {
    const i = order.indexOf(k);
    return i === -1 ? order.length : i;
  };
  return [...keys].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

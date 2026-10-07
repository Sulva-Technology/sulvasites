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
  /** One-line, plain-English explanation shown in the "Add a page" picker. */
  description?: string;
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
  // Education
  t10: [
    { key: "programmes", label: "Programmes", headline: "Programmes", sections: ["hero", "services", "use_cases", "contact_card"] },
    { key: "admissions", label: "Admissions", headline: "Admissions", sections: ["hero", "richtext", "faq", "contact_card"] },
    { key: "campus-life", label: "Student life", headline: "Student life", sections: ["hero", "gallery", "testimonials", "contact_card"] },
  ],
  // Events
  t11: [
    { key: "packages", label: "Packages", headline: "Packages", sections: ["hero", "services", "faq", "contact_card"] },
    { key: "venues", label: "Venues", headline: "Venues", sections: ["hero", "use_cases", "gallery", "contact_card"] },
    { key: "gallery", label: "Past events", headline: "Past events", sections: ["hero", "gallery", "testimonials", "contact_card"] },
  ],
  // Trades & construction
  t12: [
    { key: "services", label: "Services", headline: "Services", sections: ["hero", "services", "values", "contact_card"] },
    { key: "projects", label: "Projects", headline: "Projects", sections: ["hero", "use_cases", "gallery", "contact_card"] },
    { key: "quote", label: "Get a quote", headline: "Get a quote", sections: ["hero", "richtext", "faq", "contact_card"] },
  ],
  // Fashion boutique shop
  t13: [
    { key: "shop", label: "Shop", headline: "Shop the collection", sections: ["hero"] },
    { key: "lookbook", label: "Lookbook", headline: "Lookbook", sections: ["hero", "gallery", "contact_card"] },
    { key: "size-guide", label: "Size guide", headline: "Size guide", sections: ["hero", "richtext", "faq"] },
  ],
  // General store
  t14: [
    { key: "shop", label: "Shop", headline: "Shop", sections: ["hero"] },
    { key: "deals", label: "Deals", headline: "Deals", sections: ["hero", "richtext", "contact_card"] },
    { key: "help", label: "Help & delivery", headline: "Help & delivery", sections: ["hero", "faq", "contact_card"] },
  ],
  // Automotive
  t15: [
    { key: "inventory", label: "Inventory", headline: "Cars for sale", sections: ["hero", "use_cases", "faq", "contact_card"] },
    { key: "services", label: "Services", headline: "Services", sections: ["hero", "services", "values", "contact_card"] },
    { key: "stories", label: "Stories", headline: "Stories behind the machines", sections: ["hero", "gallery", "richtext", "contact_card"] },
  ],
};

/**
 * General-purpose page starters any template can use. Shown in the "Add a page"
 * picker next to the template's own recommendations so owners pick a ready-made
 * layout instead of starting from a blank key.
 */
export const PAGE_STARTERS: PagePreset[] = [
  { key: "services", label: "Services", headline: "What we offer", description: "List what you offer, with answers to common questions.", sections: ["hero", "services", "faq", "contact_card"] },
  { key: "pricing", label: "Pricing", headline: "Simple, clear pricing", description: "Show your packages or prices and why people choose you.", sections: ["hero", "services", "values", "faq", "contact_card"] },
  { key: "gallery", label: "Gallery", headline: "Our work", description: "A photo gallery of your work, products or space.", sections: ["hero", "gallery", "testimonials", "contact_card"] },
  { key: "team", label: "Team", headline: "Meet the team", description: "Introduce the people behind the business.", sections: ["hero", "team", "values", "contact_card"] },
  { key: "reviews", label: "Reviews", headline: "What our customers say", description: "Customer reviews and the brands you've worked with.", sections: ["hero", "testimonials", "backed_by", "contact_card"] },
  { key: "faq", label: "FAQ", headline: "Questions & answers", description: "Answer the questions customers ask most.", sections: ["hero", "faq", "contact_card"] },
  { key: "page", label: "Blank page", description: "A simple page with a title, some text and your contact details.", sections: ["hero", "richtext", "contact_card"] },
];

/** The starter used when someone names their own page without picking a layout. */
export const BLANK_STARTER = PAGE_STARTERS[PAGE_STARTERS.length - 1]!;

/** Keys a page can never use: the built-in pages and the /p/ prefix. */
export const RESERVED_PAGE_KEYS = ["home", "about", "contact", "p"];

/** Plain-English names for each section type, shown so owners know what a page contains. */
export const SECTION_LABELS: Record<Section["type"], string> = {
  hero: "Banner",
  services: "Services",
  richtext: "Text",
  values: "Why us",
  contact_card: "Contact details",
  backed_by: "Logos",
  use_cases: "Projects",
  gallery: "Photos",
  testimonials: "Reviews",
  faq: "FAQs",
  team: "Team",
};

/** "Banner · Services · FAQs" — what a page will contain, without repeats. */
export function describeSections(sections: Section["type"][]): string {
  return [...new Set(sections)].map((t) => SECTION_LABELS[t]).join(" · ");
}

/** A free page key based on `base`: "pricing", then "pricing-2", "pricing-3"… */
export function uniquePageKey(base: string, existingKeys: string[]): string {
  const taken = new Set([...existingKeys, ...RESERVED_PAGE_KEYS]);
  if (base && !taken.has(base)) return base;
  const stem = base || "page";
  for (let i = 2; ; i++) {
    const key = `${stem}-${i}`;
    if (!taken.has(key)) return key;
  }
}

export type PageIdea = PagePreset & { recommended: boolean };

/**
 * Pages the site could add, in the order to show them: the template's own
 * recommendations first, then general starters. Pages the site already has are
 * left out, and a starter is dropped if a recommendation already covers its key.
 */
export function getPageIdeas(templateKey: string, existingKeys: string[]): PageIdea[] {
  const existing = new Set(existingKeys);
  const ideas: PageIdea[] = [];
  const seen = new Set<string>();
  for (const p of getPagePresets(templateKey)) {
    seen.add(p.key);
    if (!existing.has(p.key)) ideas.push({ ...p, recommended: true });
  }
  for (const p of PAGE_STARTERS) {
    if (seen.has(p.key)) continue;
    // The blank page can always be added again under a fresh key.
    if (p === BLANK_STARTER) ideas.push({ ...p, key: uniquePageKey(p.key, existingKeys), recommended: false });
    else if (!existing.has(p.key)) ideas.push({ ...p, recommended: false });
  }
  return ideas;
}

export function getPagePresets(templateKey: string): PagePreset[] {
  return PRESETS[templateKey] ?? [];
}

export function buildPresetPageData(preset: PagePreset): PageData {
  return {
    seo: { title: preset.label, description: "" },
    sections: preset.sections.map((type) => {
      const s = defaultSection(type);
      if (s.type === "hero" && preset.headline !== undefined) return { ...s, headline: preset.headline };
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

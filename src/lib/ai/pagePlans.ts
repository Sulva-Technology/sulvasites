// Which pages a template gets and which sections each page holds. Pure; relative imports only.
import type { SectionType } from "./prompts/industries.ts";
import { getIndustry } from "./prompts/industries.ts";
import { getPagePresets } from "../../templates/pagePresets.ts";

export type PageJob = {
  key: string;
  label: string;
  kind: "core" | "extra";
  sections: SectionType[];
  /** One line telling the model what this page is for. */
  purpose: string;
  /** Hero ctaHref: "#contact" when the page has a contact card, "" for shop pages (the template falls back). */
  heroHref: string;
  /** Preset working headline (extra pages), used by the deterministic fallback. */
  headline?: string;
};

/** Section types that need invented people or logos to look filled, so they are never auto-written. */
const SKIPPED: SectionType[] = ["testimonials", "backed_by"];

const CORE: Array<Omit<PageJob, "kind" | "heroHref">> = [
  {
    key: "home",
    label: "Home",
    sections: ["hero", "services", "values", "use_cases", "gallery", "faq", "contact_card"],
    purpose: "The home page: tell a first-time visitor what the business offers, why choose it, and the next step.",
  },
  {
    key: "about",
    label: "About",
    sections: ["hero", "richtext", "values", "gallery", "contact_card"],
    purpose: "The about page: who the business is, what it does for customers and how it works. Use only the stated facts; no history or numbers that were not given.",
  },
  {
    key: "contact",
    label: "Contact",
    sections: ["hero", "contact_card", "faq", "richtext"],
    purpose: "The contact page: make it easy to get in touch and explain what happens after someone reaches out. Do not state contact details in the copy; the contact card shows them.",
  },
];

export function getPageJobs(templateKey: string): PageJob[] {
  const shop = !!getIndustry(templateKey).shop;
  const finish = (job: Omit<PageJob, "kind" | "heroHref">, kind: PageJob["kind"]): PageJob => ({
    ...job,
    kind,
    heroHref: !shop && job.sections.includes("contact_card") ? "#contact" : "",
  });
  const jobs = CORE.map((j) => finish(j, "core"));
  for (const p of getPagePresets(templateKey)) {
    jobs.push(
      finish(
        {
          key: p.key,
          label: p.label,
          sections: p.sections.filter((s) => !SKIPPED.includes(s)),
          headline: p.headline,
          purpose: `The "${p.label}" page${p.headline ? ` (working headline: "${p.headline}")` : ""}. Make it specific to this business and different from the home page.`,
        },
        "extra",
      ),
    );
  }
  return jobs;
}

export function isShopTemplate(templateKey: string): boolean {
  return !!getIndustry(templateKey).shop;
}

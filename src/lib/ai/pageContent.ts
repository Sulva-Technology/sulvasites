// Turns raw model output into a valid PageData for one page job, and builds deterministic
// fallback sections so a page can always be produced. Pure; relative imports only.
import type { PageData, Section } from "../pageSchema.ts";
import { validatePageData } from "../pageSchema.ts";
import type { Brief } from "./brief.ts";
import type { PageJob } from "./pagePlans.ts";
import { modelSectionsOf } from "./prompts/builders.ts";
import { getIndustry } from "./prompts/industries.ts";
import { BUDGETS as B, ITEM_COUNTS } from "./prompts/rules.ts";
import { isModelSection, type ModelSectionType } from "./prompts/sections.ts";
import { fitSentence, sanitizeRichHtml, stripTags } from "./quality.ts";

type Rec = Record<string, unknown>;

function isRec(v: unknown): v is Rec {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function s(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function items(v: unknown): Rec[] {
  return Array.isArray(v) ? v.filter(isRec) : [];
}

export type SectionResult = { section: Section | null; errors: string[] };

function need(errors: string[], label: string, ok: boolean, msg: string) {
  if (!ok) errors.push(`${label}: ${msg}`);
}

/** Validates and cleans one model-written section. Returns the best usable section plus errors. */
export function normalizeSection(type: ModelSectionType, raw: unknown, label: string, defaults: { ctaText: string; heroHref: string }): SectionResult {
  const errors: string[] = [];
  if (!isRec(raw)) return { section: null, errors: [`${label}: missing. Add a "${type}" section.`] };

  switch (type) {
    case "hero": {
      const headline = s(raw.headline);
      const subtext = s(raw.subtext);
      need(errors, label, !!headline, "headline is empty.");
      need(errors, label, !!subtext, "subtext is empty.");
      if (!headline || !subtext) return { section: null, errors };
      return {
        section: { type: "hero", headline, subtext, ctaText: s(raw.ctaText) || defaults.ctaText, ctaHref: defaults.heroHref },
        errors,
      };
    }
    case "services":
    case "values": {
      const list = items(raw.items)
        .map((i) => ({ title: s(i.title), desc: s(i.desc ?? i.description) }))
        .filter((i) => i.title && i.desc);
      const [min, max] = ITEM_COUNTS[type];
      need(errors, label, list.length >= min, `needs ${min}-${max} items with title and desc, got ${list.length}.`);
      if (!list.length) return { section: null, errors };
      return { section: { type, items: list.slice(0, max) }, errors };
    }
    case "use_cases": {
      const list = items(raw.items)
        .map((i) => ({
          title: s(i.title),
          description: s(i.description ?? i.desc),
          linkText: s(i.linkText),
          linkHref: s(i.linkHref),
        }))
        .filter((i) => i.title && i.description);
      const [min, max] = ITEM_COUNTS.use_cases;
      const title = s(raw.title);
      need(errors, label, !!title, "title is empty.");
      need(errors, label, list.length >= min, `needs exactly ${max} items with title and description, got ${list.length}.`);
      if (!list.length) return { section: null, errors };
      return { section: { type, title, description: s(raw.description), items: list.slice(0, max) }, errors };
    }
    case "richtext": {
      const title = s(raw.title);
      const body = sanitizeRichHtml(typeof raw.body === "string" ? raw.body : "");
      need(errors, label, !!title, "title is empty.");
      need(errors, label, stripTags(body).length >= 40, "body needs at least two sentences of HTML text.");
      if (!stripTags(body)) return { section: null, errors };
      return { section: { type, title, body }, errors };
    }
    case "faq": {
      const list = items(raw.items)
        .map((i) => ({ question: s(i.question ?? i.q), answer: s(i.answer ?? i.a) }))
        .filter((i) => i.question && i.answer);
      const [min, max] = ITEM_COUNTS.faq;
      need(errors, label, !!s(raw.title), "title is empty.");
      need(errors, label, list.length >= min, `needs ${min}-${max} items with question and answer, got ${list.length}.`);
      if (!list.length) return { section: null, errors };
      return { section: { type, title: s(raw.title), items: list.slice(0, max) }, errors };
    }
    case "team": {
      const list = items(raw.members)
        .map((m) => ({ name: s(m.name), role: s(m.role), bio: s(m.bio), photoUrl: "", linkedinUrl: "" }))
        .filter((m) => m.name && m.bio);
      const [min, max] = ITEM_COUNTS.team;
      need(errors, label, list.length >= min, `needs ${min}-${max} members with name (job title), role and bio, got ${list.length}.`);
      if (!list.length) return { section: null, errors };
      return { section: { type, title: s(raw.title), subtitle: s(raw.subtitle), members: list.slice(0, max) }, errors };
    }
  }
}

export type PageDraft = {
  seo: PageData["seo"];
  /** One entry per job section; null where the model section failed and needs fallback. */
  slots: Array<Section | null>;
  errors: string[];
};

/** Maps the model's JSON onto the job's section list. Matches sections by type, not position. */
export function parsePageOutput(job: PageJob, raw: unknown, defaults: { ctaText: string }): PageDraft {
  const errors: string[] = [];
  const slots: Array<Section | null> = [];
  const check = validatePageData(raw);
  if (!check.ok) errors.push(check.error ?? "Invalid JSON.");
  const rec = isRec(raw) ? raw : {};
  const pool = Array.isArray(rec.sections) ? rec.sections.filter(isRec) : [];
  const used = new Set<number>();
  const wanted = modelSectionsOf(job);
  let n = 0;
  for (const type of job.sections) {
    if (type === "gallery") {
      slots.push({ type: "gallery", title: galleryTitle(job), images: [] });
    } else if (type === "contact_card") {
      slots.push({ type: "contact_card", showForm: true, mapLink: "" });
    } else if (wanted.includes(type as ModelSectionType)) {
      n++;
      const idx = pool.findIndex((p, i) => !used.has(i) && p.type === type);
      if (idx >= 0) used.add(idx);
      const res = normalizeSection(type as ModelSectionType, idx >= 0 ? pool[idx] : null, `Section ${n} (${type})`, {
        ctaText: defaults.ctaText,
        heroHref: job.heroHref,
      });
      errors.push(...res.errors);
      slots.push(res.section);
    } else {
      slots.push(null);
    }
  }
  const seo = isRec(rec.seo) ? { title: s(rec.seo.title, 200), description: s(rec.seo.description, 400) } : { title: "", description: "" };
  if (!seo.title) errors.push("seo.title is empty.");
  if (!seo.description) errors.push("seo.description is empty.");
  return { seo, slots, errors };
}

function galleryTitle(job: PageJob): string {
  if (job.key === "home") return "Gallery";
  if (job.key === "about") return "Behind the scenes";
  return job.label;
}

// ---------- deterministic fallback ----------

function cap(str: string) {
  return str ? str[0]!.toUpperCase() + str.slice(1) : str;
}

function nameOf(b: Brief) {
  return b.businessName || "Our business";
}

function offersOf(b: Brief, templateKey: string, count: number): string[] {
  const own = b.services.map((x) => cap(fitSentence(x, B.serviceTitle)));
  const generic = getIndustry(templateKey).fallbackOffers;
  const all = [...own];
  for (const g of generic) if (all.length < count && !all.some((o) => o.toLowerCase() === g.toLowerCase())) all.push(g);
  return all.slice(0, Math.max(count, Math.min(own.length, 6)));
}

function whatLine(b: Brief) {
  const w = b.whatTheyDo.replace(/[.!\s]+$/, "");
  return w ? `${cap(w)}${b.location && !w.toLowerCase().includes(b.location.toLowerCase()) ? ` in ${b.location}` : ""}.` : `${nameOf(b)} is here to help.`;
}

export function fallbackSection(type: ModelSectionType, job: PageJob, brief: Brief, templateKey: string): Section {
  const name = nameOf(brief);
  const g = getIndustry(templateKey);
  switch (type) {
    case "hero": {
      const headline =
        job.key === "home"
          ? fitSentence(brief.whatTheyDo ? cap(brief.whatTheyDo.replace(/[.!\s]+$/, "")) : `${name}: how we can help`, B.heroHeadline)
          : job.key === "about"
            ? `About ${name}`
            : job.key === "contact"
              ? `Get in touch with ${name}`
              : job.headline ?? `${job.label} at ${name}`;
      return {
        type: "hero",
        headline: fitSentence(headline, B.heroHeadline),
        subtext: fitSentence(whatLine(brief), B.heroSubtext),
        ctaText: fitSentence(g.ctas[0] ?? "Get in touch", B.heroCta),
        ctaHref: job.heroHref,
      };
    }
    case "services": {
      const list = offersOf(brief, templateKey, 3).slice(0, ITEM_COUNTS.services[1]);
      return {
        type: "services",
        items: list.map((t) => ({ title: t, desc: fitSentence(`${t} from ${name}. Message us to find out more.`, B.serviceDesc) })),
      };
    }
    case "values":
      return {
        type: "values",
        items: [
          { title: "Clear communication", desc: "We explain what to expect before we begin." },
          { title: "Easy to reach", desc: "Send a message and we reply as soon as we can." },
          { title: "Built around you", desc: "We listen first, then suggest what fits your needs." },
        ],
      };
    case "use_cases": {
      const list = offersOf(brief, templateKey, 3).slice(0, 3);
      return {
        type: "use_cases",
        title: "How we can help",
        description: fitSentence(whatLine(brief), B.useCasesIntro),
        items: list.map((t) => ({
          title: fitSentence(t, B.useCaseTitle),
          description: fitSentence(`Ask us about ${t.toLowerCase()} and what suits you.`, B.useCaseDesc),
          linkText: "Get in touch",
          linkHref: "#contact",
        })),
      };
    }
    case "richtext": {
      if (job.key === "about") {
        return {
          type: "richtext",
          title: `About ${name}`,
          body: `<p>${escapeHtml(whatLine(brief))}</p>${brief.audience ? `<p>${escapeHtml(`We work with ${brief.audience.replace(/[.!\s]+$/, "")}.`)}</p>` : ""}<p>Get in touch and we will tell you how we can help.</p>`,
        };
      }
      return {
        type: "richtext",
        title: "How to get started",
        body: "<p>Send us a message with what you need.</p><ul><li>We reply with the next steps.</li><li>You confirm the details.</li></ul>",
      };
    }
    case "faq": {
      const c = brief.contact;
      const how = c.whatsapp || c.phone || c.email;
      return {
        type: "faq",
        title: "Frequently asked questions",
        items: [
          { question: "How do I get started?", answer: "Send us a message with what you need. We reply with the next steps." },
          {
            question: "Where are you based?",
            answer: brief.location ? `We are based in ${brief.location}.` : "Message us and we will confirm where we work.",
          },
          {
            question: "How can I contact you?",
            answer: how ? `Reach us on ${how}, or use the contact form on this site.` : "Use the contact form on this site and we will reply.",
          },
          { question: "Can I ask a question first?", answer: "Yes. Message us and we will answer before you decide." },
        ],
      };
    }
    case "team":
      return {
        type: "team",
        title: "The team",
        subtitle: "Who you will deal with.",
        members: [
          { name: "Owner", role: "Leads the business", bio: "Oversees the work and is your main point of contact.", photoUrl: "", linkedinUrl: "" },
          { name: "Customer support", role: "Replies to enquiries", bio: "Answers your questions and helps you get started.", photoUrl: "", linkedinUrl: "" },
        ],
      };
  }
}

function escapeHtml(t: string) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function fallbackSeo(job: PageJob, brief: Brief): PageData["seo"] {
  const name = nameOf(brief);
  return {
    title: fitSentence(`${job.key === "home" ? brief.whatTheyDo || job.label : job.label} | ${name}`, B.seoTitle),
    description: fitSentence(whatLine(brief), B.seoDescription),
  };
}

/** Fills every empty slot with deterministic content. Returns the page and which types fell back. */
export function completeDraft(job: PageJob, draft: PageDraft, brief: Brief, templateKey: string): { data: PageData; fallbackTypes: string[] } {
  const fallbackTypes: string[] = [];
  const sections: Section[] = [];
  job.sections.forEach((type, i) => {
    const slot = draft.slots[i];
    if (slot) sections.push(slot);
    else if (isModelSection(type)) {
      fallbackTypes.push(type);
      sections.push(fallbackSection(type, job, brief, templateKey));
    }
  });
  const fb = fallbackSeo(job, brief);
  return {
    data: { seo: { title: draft.seo.title || fb.title, description: draft.seo.description || fb.description }, sections },
    fallbackTypes,
  };
}

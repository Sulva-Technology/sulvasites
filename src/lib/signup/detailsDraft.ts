// The owner's pasted details as page drafts, written without the AI: their services and prices,
// story, reasons to choose them, work, hours and questions go straight into the sections. The site
// builder uses these for any slot the AI did not fill (slow, out of quota or down), so a new site
// never falls back to another business's demo copy. Pure: relative imports only.
import type { Section } from "../pageSchema.ts";
import type { Brief } from "../ai/brief.ts";
import { fallbackSection, fallbackSeo, type PageDraft } from "../ai/pageContent.ts";
import type { PageJob } from "../ai/pagePlans.ts";
import { getIndustry } from "../ai/prompts/industries.ts";
import { BUDGETS as B, ITEM_COUNTS } from "../ai/prompts/rules.ts";
import { fitSentence } from "../ai/quality.ts";
import type { OwnerDetails } from "./ownerDetails.ts";

/** Pages whose text section is about visiting or booking, so it shows hours and areas served. */
const HOURS_PAGES = ["contact", "book", "reservations", "quote", "admissions", "help"];

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const trimEnd = (t: string) => t.replace(/[.!\s]+$/, "");
const cap = (t: string) => (t ? t[0]!.toUpperCase() + t.slice(1) : t);
const lower = (t: string) => (t ? t[0]!.toLowerCase() + t.slice(1) : t);

function sentence(t: string): string {
  const x = t.trim();
  return x && !/[.!?]$/.test(x) ? `${x}.` : x;
}

function firstSentence(t: string): string {
  return t.trim().split(/(?<=[.!?])\s+/)[0] ?? "";
}

/** Owner text as <p> paragraphs, cut at a paragraph or sentence boundary within `max` characters. */
function paragraphs(text: string, max: number): string {
  let out = "";
  let used = 0;
  for (const p of text.split(/\n+/).map((x) => x.trim()).filter(Boolean)) {
    const room = max - used;
    if (room < 60) break;
    const piece = p.length <= room ? p : fitSentence(p, room);
    out += `<p>${esc(piece)}</p>`;
    used += piece.length;
    if (piece.length < p.length) break;
  }
  return out;
}

function hoursHtml(d: OwnerDetails): string {
  const rows = [
    d.openingHours && `<p><strong>Opening hours:</strong> ${esc(d.openingHours)}</p>`,
    d.areasServed && `<p><strong>Areas we serve:</strong> ${esc(d.areasServed)}</p>`,
  ].filter(Boolean);
  return rows.length ? `${rows.join("")}<p>Send us a message and we will reply with the next steps.</p>` : "";
}

function hero(job: PageJob, d: OwnerDetails, brief: Brief, templateKey: string): Section | null {
  const name = brief.businessName || d.businessName;
  const area = d.areasServed ? `Serving ${d.areasServed}.` : "";
  let headline = "";
  let subtext = "";
  if (job.key === "home") {
    headline = d.tagline || firstSentence(d.whatWeDo);
    subtext = (d.tagline ? d.whatWeDo : "") || (d.customers ? `For ${lower(trimEnd(d.customers))}. ${area}` : area);
  } else if (job.key === "about") {
    headline = `About ${name}`;
    subtext = firstSentence(d.story) || d.whatWeDo;
  } else if (job.key === "contact") {
    headline = `Get in touch with ${name}`;
    subtext = [d.openingHours && `Open ${d.openingHours}.`, area].filter(Boolean).join(" ");
  } else {
    headline = job.headline ?? job.label;
    subtext = d.whatWeDo;
  }
  if (!headline.trim() || !subtext.trim()) return null;
  return {
    type: "hero",
    headline: fitSentence(trimEnd(headline), B.heroHeadline),
    subtext: fitSentence(subtext, B.heroSubtext),
    ctaText: fitSentence(getIndustry(templateKey).ctas[0] ?? "Get in touch", B.heroCta),
    ctaHref: job.heroHref,
  };
}

function services(job: PageJob, d: OwnerDetails): Section | null {
  if (!d.services.length) return null;
  const max = job.kind === "core" ? ITEM_COUNTS.services[1] : 12;
  return {
    type: "services",
    items: d.services.slice(0, max).map((s) => {
      const price = s.price ? sentence(cap(s.price)) : "";
      const room = B.serviceDesc - (price ? price.length + 1 : 0);
      const about = s.description ? fitSentence(sentence(s.description), room) : price ? "" : `Ask us about ${lower(s.name)}.`;
      return { title: fitSentence(s.name, B.serviceTitle), desc: [about, price].filter(Boolean).join(" ") };
    }),
  };
}

function values(d: OwnerDetails): Section | null {
  if (!d.whyChooseUs.length) return null;
  return {
    type: "values",
    items: d.whyChooseUs.slice(0, ITEM_COUNTS.values[1]).map((w) => ({
      title: fitSentence(w.title, B.valueTitle),
      desc: fitSentence(sentence(w.description), B.valueDesc),
    })),
  };
}

function useCases(job: PageJob, d: OwnerDetails): Section | null {
  if (!d.projects.length) return null;
  const max = job.kind === "core" ? ITEM_COUNTS.use_cases[1] : 6;
  return {
    type: "use_cases",
    title: fitSentence(job.key === "home" ? "Recent work" : (job.headline ?? job.label), B.sectionTitle),
    description: fitSentence(d.whatWeDo, B.useCasesIntro),
    items: d.projects.slice(0, max).map((p) => ({
      title: fitSentence(p.title, B.useCaseTitle),
      description: fitSentence(sentence(p.description) || `Ask us about ${lower(p.title)}.`, B.useCaseDesc),
      linkText: "Enquire",
      linkHref: "#contact",
    })),
  };
}

function richtext(job: PageJob, d: OwnerDetails, brief: Brief): Section | null {
  if (job.key === "about") {
    const highlights = d.highlights.length ? `<ul>${d.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : "";
    const customers = d.customers ? `<p>${esc(sentence(`We work with ${lower(trimEnd(d.customers))}`))}</p>` : "";
    const story = paragraphs(d.story, B.richtextBody - highlights.length - customers.length);
    if (!story && !highlights) return null;
    return { type: "richtext", title: d.story ? "Our story" : `About ${brief.businessName || d.businessName}`, body: story + customers + highlights };
  }
  if (HOURS_PAGES.includes(job.key)) {
    const body = hoursHtml(d);
    return body ? { type: "richtext", title: d.openingHours ? "Opening hours" : "Where we work", body } : null;
  }
  return null;
}

function faq(job: PageJob, d: OwnerDetails, brief: Brief, templateKey: string): Section | null {
  if (!d.faqs.length) return null;
  const [min, coreMax] = ITEM_COUNTS.faq;
  const mine = d.faqs
    .slice(0, job.kind === "core" ? coreMax : 10)
    .map((f) => ({ question: fitSentence(f.question, B.faqQuestion), answer: fitSentence(f.answer, B.faqAnswer) }));
  const seen = new Set(mine.map((f) => f.question.toLowerCase()));
  const generic = fallbackSection("faq", job, brief, templateKey);
  const extra = generic.type === "faq" ? generic.items.filter((f) => !seen.has(f.question.toLowerCase())) : [];
  return { type: "faq", title: "Frequently asked questions", items: [...mine, ...extra].slice(0, Math.max(min, mine.length)) };
}

function team(d: OwnerDetails): Section | null {
  if (!d.team.length) return null;
  return {
    type: "team",
    title: "Meet the team",
    subtitle: "",
    members: d.team.map((t) => ({ name: t.name, role: t.role, bio: fitSentence(t.bio, B.teamBio), photoUrl: "", linkedinUrl: "" })),
  };
}

/**
 * One draft slot per job section, filled from the owner's details where they gave enough, else null
 * (completeDraft then writes simple generic copy about this business). With no details every slot is null.
 */
export function draftFromDetails(job: PageJob, d: OwnerDetails | null, brief: Brief, templateKey: string): PageDraft {
  let textDone = false;
  const slots = job.sections.map((type): Section | null => {
    if (!d) return null;
    switch (type) {
      case "hero":
        return hero(job, d, brief, templateKey);
      case "services":
        return services(job, d);
      case "values":
        return values(d);
      case "use_cases":
        return useCases(job, d);
      case "richtext": {
        // A second text section on the same page (e.g. Journal) would only repeat the first.
        if (textDone) return null;
        textDone = true;
        return richtext(job, d, brief);
      }
      case "faq":
        return faq(job, d, brief, templateKey);
      case "team":
        return team(d);
      default:
        return null;
    }
  });
  return { seo: fallbackSeo(job, brief), slots, errors: [] };
}

// "Use your own AI" content step: the prompt owners copy into ChatGPT/Gemini/Claude, the parser for
// the answer they paste back, and how those facts reach the brief and the built pages.
// Pure: relative imports only (Node test runner).
import type { PageData, Section } from "../pageSchema.ts";
import type { Brief } from "../ai/brief.ts";
import { getPagePresets } from "../../templates/pagePresets.ts";
import { TEMPLATE_META } from "../../templates/meta.ts";

type Item = { title: string; description: string };
type Service = { name: string; description: string; price: string };
type Person = { name: string; role: string; bio: string };
type Review = { name: string; role: string; quote: string };
type Faq = { question: string; answer: string };

export type OwnerDetails = {
  businessName: string;
  tagline: string;
  whatWeDo: string;
  story: string;
  customers: string;
  tone: string;
  address: string;
  city: string;
  areasServed: string;
  openingHours: string;
  contact: { phone: string; whatsapp: string; email: string; instagram: string; facebook: string; tiktok: string; x: string };
  services: Service[];
  whyChooseUs: Item[];
  projects: Item[];
  highlights: string[];
  testimonials: Review[];
  team: Person[];
  faqs: Faq[];
  partners: string[];
  brandColors: string;
  languages: string[];
  sellOnline: boolean | null;
};

/** The longest paste we accept (a long AI answer is ~6-10k characters). */
export const MAX_DETAILS_CHARS = 20000;
/** Free text that is not our JSON still helps the writer, capped. */
const MAX_FREE_TEXT = 6000;

// ---------- the prompt ----------

/** Extra hints per preset page key, so the owner's AI asks for what that page shows. */
const PAGE_HINTS: Record<string, string> = {
  menu: "list dishes and drinks (with prices) under services",
  classes: "list classes (with times and prices) under services",
  programmes: "list programmes and courses under services",
  packages: "list packages (with prices) under services",
  treatments: "list treatments under services",
  properties: "list properties (location, size, price) under projects",
  inventory: "list cars for sale under projects",
  projects: "list past projects under projects",
  work: "list past work or clients' projects under projects",
  "case-studies": "list case studies (problem, what you did, result) under projects",
  venues: "list venues under projects",
  portfolio: "describe recent work under projects",
  doctors: "list doctors under team",
  coaches: "list coaches under team",
  leadership: "list leaders under team",
  communities: "list groups or communities under projects",
};

const SHAPE = `{
  "sulva": 1,
  "businessName": "",
  "tagline": "one short line, under 80 characters",
  "whatWeDo": "one or two plain sentences",
  "story": "how and why the business started and what makes it different (2-4 short paragraphs)",
  "customers": "who the customers are",
  "tone": "e.g. friendly, premium, formal, playful",
  "address": "full street address, or empty",
  "city": "",
  "areasServed": "areas or cities you serve or deliver to",
  "openingHours": "e.g. Mon-Fri 9am-6pm, Sat 10am-4pm",
  "contact": { "phone": "", "whatsapp": "", "email": "", "instagram": "", "facebook": "", "tiktok": "", "x": "" },
  "services": [{ "name": "", "description": "one or two sentences", "price": "e.g. from N15,000, or empty" }],
  "whyChooseUs": [{ "title": "", "description": "" }],
  "projects": [{ "title": "", "description": "" }],
  "highlights": ["facts I can prove, e.g. 8 years in business, 2,000 customers served, NAFDAC approved"],
  "testimonials": [{ "name": "", "role": "e.g. Bride, Lagos", "quote": "their real words" }],
  "team": [{ "name": "", "role": "", "bio": "one or two sentences" }],
  "faqs": [{ "question": "", "answer": "" }],
  "partners": ["clients or partners I am allowed to name"],
  "brandColors": "in words, e.g. navy and gold",
  "languages": ["English"],
  "sellOnline": false
}`;

export type PromptInput = { businessName: string; whatTheyDo: string; city: string; templateKey: string };

/** The prompt an owner pastes into their own AI. Tailored to the design they picked. */
export function buildDetailsPrompt(a: PromptInput): string {
  const meta = TEMPLATE_META.find((t) => t.key === a.templateKey);
  const presets = getPagePresets(a.templateKey);
  const pages = ["Home", "About", "Contact", ...presets.map((p) => p.label)];
  const hints = presets.map((p) => PAGE_HINTS[p.key] && `- ${p.label} page: ${PAGE_HINTS[p.key]}`).filter(Boolean) as string[];
  const known = [
    a.businessName && `- Name: ${a.businessName}`,
    a.whatTheyDo && `- What we do: ${a.whatTheyDo}`,
    a.city && `- City: ${a.city}`,
  ].filter(Boolean) as string[];

  return [
    "I am building a website for my business with Sulva Sites. Please help me gather everything the website needs, then give it back in one block I can paste.",
    "",
    "What I have told them so far:",
    ...(known.length ? known : ["- (nothing yet)"]),
    `- Design: ${meta ? `${meta.name} (${meta.category})` : "a business website"}. Pages: ${pages.join(", ")}.`,
    ...(meta?.shop ? ["- It has an online shop. Products are added later, so here just describe what I sell under services."] : []),
    "",
    "How to help me:",
    "1. If you already know things about my business from our past chats, use them and ask me to confirm.",
    "2. Then interview me, a few short questions at a time, until you can fill every field below. Ask for real customer reviews, team members, prices, opening hours and common customer questions.",
    "3. Only use facts I give you. Never make up reviews, names, prices, numbers, awards, addresses or contact details. If I don't know something, leave it empty (\"\" or []).",
    "4. Write in clear, simple English, the way my business talks to customers. Give 3-8 services, 3-4 reasons to choose us and 4-8 FAQs where I can.",
    ...(hints.length ? ["5. For my design:", ...hints] : []),
    "",
    "When we are done, reply with ONLY this JSON in one code block, filled in, with the same keys:",
    "",
    SHAPE,
  ].join("\n");
}

// ---------- parsing ----------

const CONTROL = new RegExp("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]", "g");

function str(v: unknown, max: number): string {
  if (typeof v === "number" && Number.isFinite(v)) v = String(v);
  return typeof v === "string" ? v.replace(CONTROL, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max) : "";
}

function list<T>(v: unknown, maxItems: number, map: (x: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const x of v) {
    const item = map(x && typeof x === "object" ? (x as Record<string, unknown>) : { value: x });
    if (item) out.push(item);
    if (out.length >= maxItems) break;
  }
  return out;
}

function strList(v: unknown, maxItems: number, maxLen: number): string[] {
  return list(v, maxItems, (x) => str(x.value ?? x.name ?? x.title, maxLen) || null);
}

export function emptyDetails(): OwnerDetails {
  return {
    businessName: "", tagline: "", whatWeDo: "", story: "", customers: "", tone: "", address: "", city: "", areasServed: "", openingHours: "",
    contact: { phone: "", whatsapp: "", email: "", instagram: "", facebook: "", tiktok: "", x: "" },
    services: [], whyChooseUs: [], projects: [], highlights: [], testimonials: [], team: [], faqs: [], partners: [],
    brandColors: "", languages: [], sellOnline: null,
  };
}

/** Coerces any object (the owner's AI output) into safe, capped OwnerDetails. */
export function normalizeDetails(raw: unknown): OwnerDetails {
  const d = emptyDetails();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return d;
  const r = raw as Record<string, unknown>;
  d.businessName = str(r.businessName, 80);
  d.tagline = str(r.tagline, 80);
  d.whatWeDo = str(r.whatWeDo ?? r.whatTheyDo, 300);
  d.story = str(r.story ?? r.about, 2500);
  d.customers = str(r.customers ?? r.audience, 300);
  d.tone = str(r.tone, 80);
  d.address = str(r.address, 200);
  d.city = str(r.city ?? r.location, 80);
  d.areasServed = str(r.areasServed, 200);
  d.openingHours = str(r.openingHours ?? r.hours, 200);
  const c = r.contact && typeof r.contact === "object" ? (r.contact as Record<string, unknown>) : {};
  for (const k of Object.keys(d.contact) as Array<keyof OwnerDetails["contact"]>) d.contact[k] = str(c[k] ?? (k === "x" ? c.twitter : undefined), 120);
  d.services = list(r.services, 12, (x) => {
    const name = str(x.name ?? x.title ?? x.value, 60);
    return name ? { name, description: str(x.description ?? x.desc, 300), price: str(x.price, 40) } : null;
  });
  const item = (x: Record<string, unknown>) => {
    const title = str(x.title ?? x.name ?? x.value, 60);
    return title ? { title, description: str(x.description ?? x.desc, 300) } : null;
  };
  d.whyChooseUs = list(r.whyChooseUs, 6, item);
  d.projects = list(r.projects, 6, item);
  d.highlights = strList(r.highlights, 8, 120);
  d.testimonials = list(r.testimonials ?? r.reviews, 6, (x) => {
    const quote = str(x.quote ?? x.text ?? x.review, 400).replace(/^["“]+|["”]+$/g, "");
    const name = str(x.name ?? x.author, 40);
    return quote && name ? { name, role: str(x.role, 40), quote } : null;
  });
  d.team = list(r.team, 8, (x) => {
    const name = str(x.name, 40);
    return name ? { name, role: str(x.role ?? x.title, 40), bio: str(x.bio, 200) } : null;
  });
  d.faqs = list(r.faqs ?? r.faq, 10, (x) => {
    const question = str(x.question ?? x.q, 120);
    const answer = str(x.answer ?? x.a, 400);
    return question && answer ? { question, answer } : null;
  });
  d.partners = strList(r.partners, 10, 60);
  d.brandColors = str(r.brandColors ?? r.colors, 80);
  d.languages = strList(r.languages, 4, 30);
  d.sellOnline = typeof r.sellOnline === "boolean" ? r.sellOnline : null;
  return d;
}

/** True when nothing useful was found. */
export function isEmptyDetails(d: OwnerDetails): boolean {
  return JSON.stringify(d) === JSON.stringify(emptyDetails());
}

export type ParsedDetails =
  | { kind: "empty" }
  | { kind: "json"; details: OwnerDetails }
  /** Not our JSON (or broken JSON): passed to the writer as plain notes. */
  | { kind: "text"; text: string };

/** Reads what the owner pasted: our JSON (with or without code fences / chatter around it), else free text. */
export function parseDetails(input: unknown): ParsedDetails {
  const text = typeof input === "string" ? input.slice(0, MAX_DETAILS_CHARS).trim() : "";
  if (!text) return { kind: "empty" };
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      // Smart quotes from chat apps break JSON; they never appear as JSON syntax otherwise.
      const raw = text.slice(start, end + 1).replace(/[“”]/g, '"');
      const details = normalizeDetails(JSON.parse(raw));
      if (!isEmptyDetails(details)) return { kind: "json", details };
    } catch {
      /* fall through to free text */
    }
  }
  return { kind: "text", text: text.replace(CONTROL, " ").slice(0, MAX_FREE_TEXT) };
}

/** Short "what we found" list for the wizard. */
export function detailsSummary(d: OwnerDetails): string[] {
  const n = (count: number, one: string, many: string) => (count ? `${count} ${count === 1 ? one : many}` : "");
  return [
    d.story && "your story",
    n(d.services.length, "service", "services"),
    n(d.whyChooseUs.length, "reason to choose you", "reasons to choose you"),
    n(d.projects.length, "project", "projects"),
    n(d.testimonials.length, "review", "reviews"),
    n(d.team.length, "team member", "team members"),
    n(d.faqs.length, "FAQ", "FAQs"),
    n(d.partners.length, "partner", "partners"),
    d.openingHours && "opening hours",
    Object.values(d.contact).some(Boolean) && "contact details",
  ].filter(Boolean) as string[];
}

// ---------- into the brief ----------

/** Everything the writer may use as facts, as plain text (it is delimited as owner data in prompts). */
export function detailsFactsText(d: OwnerDetails): string {
  const lines: string[] = [];
  const add = (label: string, v: string) => v && lines.push(`${label}: ${v}`);
  add("Tagline", d.tagline);
  add("Story", d.story);
  add("Areas served", d.areasServed);
  add("Opening hours", d.openingHours);
  if (d.services.length) lines.push("Services/products in detail:", ...d.services.map((s) => `- ${s.name}${s.price ? ` (${s.price})` : ""}${s.description ? `: ${s.description}` : ""}`));
  if (d.whyChooseUs.length) lines.push("Why customers choose us:", ...d.whyChooseUs.map((s) => `- ${s.title}${s.description ? `: ${s.description}` : ""}`));
  if (d.projects.length) lines.push("Projects, work or listings:", ...d.projects.map((s) => `- ${s.title}${s.description ? `: ${s.description}` : ""}`));
  if (d.highlights.length) lines.push("Proven highlights:", ...d.highlights.map((h) => `- ${h}`));
  if (d.team.length) lines.push("Team:", ...d.team.map((t) => `- ${t.name}${t.role ? `, ${t.role}` : ""}${t.bio ? `: ${t.bio}` : ""}`));
  if (d.faqs.length) lines.push("Customer questions:", ...d.faqs.map((f) => `- Q: ${f.question} A: ${f.answer}`));
  if (d.partners.length) lines.push(`Clients/partners we may name: ${d.partners.join(", ")}`);
  return lines.join("\n");
}

/** Owner facts go on top of the wizard answers; the wizard's name, city and WhatsApp win. */
export function applyDetailsToBrief(brief: Brief, parsed: ParsedDetails): Brief {
  if (parsed.kind === "empty") return brief;
  if (parsed.kind === "text") return { ...brief, facts: parsed.text };
  const d = parsed.details;
  const c = d.contact;
  return {
    ...brief,
    whatTheyDo: d.whatWeDo || brief.whatTheyDo,
    audience: d.customers || brief.audience,
    tone: d.tone || brief.tone,
    services: d.services.length ? d.services.slice(0, 8).map((s) => s.name) : brief.services,
    languages: d.languages.length ? d.languages : brief.languages,
    shopIntent: brief.shopIntent || d.sellOnline === true,
    colors: d.brandColors || brief.colors,
    contact: {
      ...brief.contact,
      phone: c.phone || brief.contact.phone,
      email: c.email || brief.contact.email,
      address: d.address || brief.contact.address,
      instagram: c.instagram || brief.contact.instagram,
      facebook: c.facebook || brief.contact.facebook,
      twitter: c.x || brief.contact.twitter,
      tiktok: c.tiktok || brief.contact.tiktok,
    },
    facts: detailsFactsText(d),
  };
}

// ---------- into the pages ----------

type Pages = Record<string, PageData>;

function insertBefore(sections: Section[], section: Section, before: Section["type"][]): Section[] {
  const i = sections.findIndex((s) => before.includes(s.type));
  const at = i === -1 ? sections.length : i;
  return [...sections.slice(0, at), section, ...sections.slice(at)];
}

const clip = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…");

/**
 * Puts the owner's real reviews, people, questions and partners into the pages. The AI never
 * writes these (it must not invent people), so without this they would be missing or generic.
 */
export function applyDetailsToPages<T extends Pages>(pages: T, d: OwnerDetails, templateKey: string): T {
  const out = { ...pages } as Pages;
  const presets = new Map(getPagePresets(templateKey).map((p) => [p.key, p.sections]));

  const reviews: Section | null = d.testimonials.length
    ? { type: "testimonials", title: "What customers say", items: d.testimonials.map((t) => ({ name: t.name, role: t.role, quote: t.quote, company: "" })) }
    : null;
  const members = d.team.map((t) => ({ name: t.name, role: t.role, bio: clip(t.bio, 160), photoUrl: "", linkedinUrl: "" }));
  const partners: Section | null = d.partners.length >= 2 ? { type: "backed_by", title: "Trusted by", logos: d.partners.map((name) => ({ name, url: null })) } : null;

  for (const [key, page] of Object.entries(out)) {
    let sections = page.sections.map((s): Section => {
      if (s.type === "team" && members.length) return { ...s, members };
      if (s.type === "testimonials" && reviews) return { ...reviews, title: s.title || "What customers say" };
      if (s.type === "backed_by" && partners) return { ...partners, title: s.title || "Trusted by" };
      return s;
    });
    const has = (t: Section["type"]) => sections.some((s) => s.type === t);
    const preset = presets.get(key) ?? [];

    if (key === "home" && d.faqs.length) {
      sections = sections.map((s) => {
        if (s.type !== "faq") return s;
        const mine = d.faqs.slice(0, 6).map((f) => ({ question: f.question, answer: f.answer }));
        const seen = new Set(mine.map((f) => f.question.toLowerCase()));
        const ai = s.items.filter((f) => !seen.has(f.question.toLowerCase()));
        return { ...s, items: [...mine, ...ai].slice(0, Math.max(6, mine.length)) };
      });
    }
    if (reviews && !has("testimonials") && (key === "home" || preset.includes("testimonials"))) {
      sections = insertBefore(sections, reviews, ["faq", "contact_card"]);
    }
    if (members.length && !has("team") && (key === "about" || preset.includes("team"))) {
      sections = insertBefore(sections, { type: "team", title: "Meet the team", subtitle: "", members }, ["values", "gallery", "contact_card"]);
    }
    if (partners && !has("backed_by") && (key === "home" || preset.includes("backed_by"))) {
      sections = insertBefore(sections, partners, ["values", "use_cases", "testimonials", "faq", "contact_card"]);
    }
    out[key] = { ...page, sections };
  }
  return out as T;
}

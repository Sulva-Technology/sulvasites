// Per-section prompt specs: shape, budgets, rules and one short few-shot example each.
// The example business is deliberately generic and marked "never reuse its wording".
import { BUDGETS as B, ITEM_COUNTS } from "./rules.ts";
import type { SectionType } from "./industries.ts";

/** Section types the model writes. gallery and contact_card are added by code. */
export const MODEL_SECTION_TYPES = ["hero", "services", "values", "use_cases", "richtext", "faq", "team"] as const;
export type ModelSectionType = (typeof MODEL_SECTION_TYPES)[number];

export function isModelSection(t: SectionType): t is ModelSectionType {
  return (MODEL_SECTION_TYPES as readonly string[]).includes(t);
}

type Spec = { shape: string; rules: string[]; example: unknown };

export const SECTION_SPECS: Record<ModelSectionType, Spec> = {
  hero: {
    shape: '{"type":"hero","headline":string,"subtext":string,"ctaText":string,"ctaHref":string}',
    rules: [
      `headline <= ${B.heroHeadline} characters, 4-9 words, names the offer or the benefit, no full stop`,
      `subtext <= ${B.heroSubtext} characters, one or two short sentences: who it is for plus what they can do next`,
      `ctaText <= ${B.heroCta} characters, starts with a verb, 2-4 words`,
      'ctaHref is exactly "#contact" (or the href the page job tells you to use)',
    ],
    example: {
      type: "hero",
      headline: "Fresh bread, baked before sunrise",
      subtext: "Order loaves, pastries and celebration cakes for pickup or delivery.",
      ctaText: "Order today",
      ctaHref: "#contact",
    },
  },
  services: {
    shape: '{"type":"services","items":[{"title":string,"desc":string}]}',
    rules: [
      `${ITEM_COUNTS.services[0]}-${ITEM_COUNTS.services[1]} items, one distinct offer each, the owner's own services first`,
      `title <= ${B.serviceTitle} characters, a noun phrase (what it is)`,
      `desc <= ${B.serviceDesc} characters, one sentence: what the customer gets. No prices unless the owner gave them`,
    ],
    example: {
      type: "services",
      items: [
        { title: "Custom celebration cakes", desc: "Tell us the occasion and flavour, and we bake and decorate to match." },
        { title: "Daily bread and pastries", desc: "Loaves and pastries baked in the morning for pickup or delivery." },
      ],
    },
  },
  values: {
    shape: '{"type":"values","items":[{"title":string,"desc":string}]}',
    rules: [
      `${ITEM_COUNTS.values[0]}-${ITEM_COUNTS.values[1]} items, each a practical promise about how the business works (not a slogan)`,
      `title <= ${B.valueTitle} characters, 2-4 words`,
      `desc <= ${B.valueDesc} characters, one sentence that shows the promise in action`,
    ],
    example: {
      type: "values",
      items: [
        { title: "Clear quotes", desc: "You see what the job involves and what it costs before we start." },
        { title: "Fast replies", desc: "Message us and we answer the same working day." },
      ],
    },
  },
  use_cases: {
    shape: '{"type":"use_cases","title":string,"description":string,"items":[{"title":string,"description":string,"linkText":string,"linkHref":string}]}',
    rules: [
      `exactly ${ITEM_COUNTS.use_cases[0]} items, each a real situation a customer is in and how the business helps`,
      `section title <= ${B.sectionTitle} characters; description <= ${B.useCasesIntro} characters`,
      `item title <= ${B.useCaseTitle} characters; description <= ${B.useCaseDesc} characters`,
      `linkText <= ${B.linkText} characters and a verb phrase; linkHref is exactly "#contact"`,
    ],
    example: {
      type: "use_cases",
      title: "Made for every occasion",
      description: "From a quiet birthday to a full wedding order.",
      items: [
        { title: "Birthday and baby showers", description: "Choose a size and flavour and we handle the decoration.", linkText: "Order a cake", linkHref: "#contact" },
      ],
    },
  },
  richtext: {
    shape: '{"type":"richtext","title":string,"body":string}',
    rules: [
      `title <= ${B.sectionTitle} characters`,
      `body is HTML, <= ${B.richtextBody} characters, 2-3 <p> paragraphs of 1-3 short sentences; add one <ul> with 3-5 <li> only when listing steps or what to expect`,
      "allowed tags only: p, ul, li, strong, em, h3. No links, no images, no inline styles",
      "state only facts from the brief; when the brief is thin write about how to start and what happens next, not history or numbers",
    ],
    example: {
      type: "richtext",
      title: "How to get started",
      body: "<p>Message us with what you need and where you are.</p><ul><li>We reply with next steps.</li><li>You confirm the details.</li></ul>",
    },
  },
  faq: {
    shape: '{"type":"faq","title":string,"items":[{"question":string,"answer":string}]}',
    rules: [
      `${ITEM_COUNTS.faq[0]}-${ITEM_COUNTS.faq[1]} items, the questions a real customer asks before contacting the business`,
      `title <= ${B.sectionTitle} characters; question <= ${B.faqQuestion} characters, written as a customer would ask it`,
      `answer <= ${B.faqAnswer} characters, 1-3 sentences, direct. If the brief does not contain the answer, say how to find out ("Message us and we will confirm"), never guess prices, hours or policies`,
    ],
    example: {
      type: "faq",
      title: "Questions we get a lot",
      items: [{ question: "How do I place an order?", answer: "Send us a message with what you need and your date. We reply with the next steps." }],
    },
  },
  team: {
    shape: '{"type":"team","title":string,"subtitle":string,"members":[{"name":string,"role":string,"bio":string,"photoUrl":"","linkedinUrl":""}]}',
    rules: [
      `${ITEM_COUNTS.team[0]}-${ITEM_COUNTS.team[1]} members. The owner has not given any person's name, so NEVER invent one`,
      `name = the job title (for example "Lead Baker"), role <= ${B.teamRole} characters = their focus, bio <= ${B.teamBio} characters = what this role does for customers, no credentials, no years`,
      "photoUrl and linkedinUrl stay empty strings",
      `title <= ${B.sectionTitle} characters, subtitle <= ${B.heroSubtext} characters`,
    ],
    example: {
      type: "team",
      title: "The people you will work with",
      subtitle: "Small team, direct contact.",
      members: [{ name: "Lead Baker", role: "Bread and pastries", bio: "Plans each day's bake and checks every order before it leaves.", photoUrl: "", linkedinUrl: "" }],
    },
  },
};

const SEO_SPEC = `"seo":{"title":string,"description":string}  (title <= ${B.seoTitle} characters, includes the business name and the page topic; description <= ${B.seoDescription} characters, benefit-led, ends with a soft call to action, no quotes or emoji)`;

export function seoShapeLine(): string {
  return SEO_SPEC;
}

/** Renders the spec block for the sections the model must write, in order. */
export function renderSectionSpecs(types: ModelSectionType[], roles: Partial<Record<SectionType, string>> = {}): string {
  const seen = new Set<string>();
  const blocks: string[] = [];
  types.forEach((t, i) => {
    const spec = SECTION_SPECS[t];
    const role = roles[t];
    blocks.push(
      [
        `SECTION ${i + 1}: ${t}${role ? ` (here: ${role})` : ""}`,
        `Shape: ${spec.shape}`,
        ...spec.rules.map((r) => `- ${r}`),
        !seen.has(t) ? `Example (different business, never reuse its wording): ${JSON.stringify(spec.example)}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    seen.add(t);
  });
  return blocks.join("\n\n");
}

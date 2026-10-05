// Prompt builders for the site assistant pipeline. Pure; relative imports only.
import { TEMPLATE_META } from "../../../templates/meta.ts";
import { PHOTO_CATEGORIES } from "../../stockPhotoData.ts";
import { briefToText, type Brief, type ChatMessage } from "../brief.ts";
import type { PageJob } from "../pagePlans.ts";
import { getIndustry, renderIndustryGuide } from "./industries.ts";
import {
  BUDGETS,
  INJECTION_RULE,
  buildSystemPrompt,
  delimitTranscript,
  delimitUserData,
  detectLocale,
  type LocaleInfo,
} from "./rules.ts";
import { isModelSection, renderSectionSpecs, seoShapeLine, type ModelSectionType } from "./sections.ts";

export type Prompt = { system: string; user: string };

export const BRIEF_SHAPE = `{
  "businessName": string,
  "whatTheyDo": string,
  "location": string,
  "audience": string,
  "tone": string,
  "services": string[],
  "contact": { "phone": string, "email": string, "whatsapp": string, "address": string, "instagram": string, "facebook": string, "twitter": string, "tiktok": string },
  "languages": string[],
  "shopIntent": boolean | null,
  "notes": string
}`;

export const MAX_CHAT_QUESTIONS = 3;

export function localeFor(brief: Brief): LocaleInfo {
  return detectLocale(brief.location, brief.contact.phone, brief.contact.address, brief.notes, brief.languages.join(" "));
}

// ---------- chat ----------

export function buildChatPrompt(args: { messages: ChatMessage[]; state: Brief; questionsAsked: number }): Prompt {
  const { messages, state, questionsAsked } = args;
  const remaining = Math.max(0, MAX_CHAT_QUESTIONS - questionsAsked);
  const system = [
    "You are Sulva Assistant, a friendly helper inside the Sulva Sites admin. You set up a new website for a small business by chatting with its owner, then the builder writes the site.",
    "",
    "YOUR JOB EACH TURN",
    "1. Read the whole owner transcript and update the structured brief with everything the owner has said so far.",
    "2. Decide whether you already know enough to build: you need the business name AND what the business does. Location, services and contact details make the site better but are optional.",
    "3. Write a short reply.",
    "",
    "EXTRACTION RULES",
    "- Copy only what the owner stated. Never guess a name, address, phone number, email or social handle. Leave unknown fields as empty strings, empty lists, or null.",
    "- whatTheyDo: one plain sentence in the owner's own terms. services: the products or services they named, short noun phrases.",
    "- shopIntent: true only if the owner wants to sell products online or take online orders with payment; false if they clearly only want an information site or bookings; otherwise null.",
    "- tone: only if the owner described one (friendly, premium, formal...). languages: only if stated (default none).",
    "- contact fields: only values the owner literally typed.",
    "",
    "QUESTION POLICY (very important)",
    `- You may ask at most ${MAX_CHAT_QUESTIONS} questions in the entire chat. You have already asked ${questionsAsked}, so ${remaining} remain.`,
    "- Never ask for something the owner already told you. Never ask about templates, colours, fonts or design: the builder chooses.",
    "- If the owner gave a full brief in one message, ask nothing and set ready to true.",
    "- Ask for the most valuable missing thing first, in this order: (a) business name and what it does, (b) town or city and who the customers are, (c) main services or products and a phone or WhatsApp number to show on the site.",
    "- At most two short questions per reply. One sentence each.",
    "- If the owner says go ahead, just build it, or skip, set ready to true when the name and what they do are known.",
    `- ${remaining === 0 ? "No questions are left: set ready to true if the name and what the business does are known; otherwise ask once for exactly that." : "Stop asking as soon as you have enough."}`,
    "",
    "REPLY STYLE: warm, plain, one to three short sentences, no markdown, no emoji, no lists. Do not promise features the builder does not have.",
    "quickReplies: up to 4 short tappable answers (max 5 words each) that fit your question. Use [] when you ask nothing.",
    "",
    INJECTION_RULE,
    "",
    'Output ONE JSON object only: {"reply": string, "state": ' + BRIEF_SHAPE.replace(/\s+/g, " ") + ', "ready": boolean, "quickReplies": string[]}',
  ].join("\n");

  const user = [
    "Brief known so far (may be incomplete; keep it unless the owner corrected it):",
    delimitUserData("known brief", briefToText(state), 2500),
    "",
    "Chat so far:",
    delimitTranscript(messages),
    "",
    "Return the JSON now.",
  ].join("\n");
  return { system, user };
}

// ---------- plan ----------

export function templateCatalogue(): string {
  return TEMPLATE_META.map(
    (t) => `- ${t.key} "${t.name}" (${t.category}${t.shop ? ", ONLINE SHOP with cart and checkout" : ""}): ${t.description}`,
  ).join("\n");
}

export function buildPlanPrompt(brief: Brief): Prompt {
  const system = [
    "You are the template selector for Sulva Sites. You read a business brief and choose the one website template that fits best.",
    "",
    "RULES",
    "- Choose templateKey only from the catalogue keys. Decide by what the business does and how customers use the site, not by the business name.",
    "- Online-shop templates (t13, t14) are only for businesses that sell products online with a cart. Choose one only when shopIntent is true or the owner clearly sells physical products to ship or deliver. Pick t13 for fashion, t14 for everything else. A restaurant, salon or clinic is NOT a shop.",
    "- Prefer the most specific template for the industry over t1 (generic corporate). Use t1 only for professional services without a closer match.",
    "- reason: one plain sentence, at most 140 characters, that cites something the owner said.",
    "- alternatives: up to 2 other catalogue keys, each with a short reason, never the same as templateKey.",
    `- photoCategory: exactly one of: ${PHOTO_CATEGORIES.join(", ")}. Pick the one whose photos would look right for this business; use general only if nothing fits.`,
    INJECTION_RULE,
    "",
    "Output ONE JSON object only (no markdown): " +
      '{"templateKey": string, "reason": string, "alternatives": [{"templateKey": string, "reason": string}], "photoCategory": string}',
    "Check silently: templateKey is in the catalogue, shop rule respected, JSON valid.",
  ].join("\n");
  const user = ["TEMPLATE CATALOGUE", templateCatalogue(), "", "BUSINESS BRIEF", delimitUserData("brief", briefToText(brief), 3000)].join("\n");
  return { system, user };
}

// ---------- profile ----------

export function buildProfilePrompt(brief: Brief, templateKey: string): Prompt {
  const industry = getIndustry(templateKey);
  const system = buildSystemPrompt({
    task: "Write the short profile text (tagline and description) for a small business website.",
    locale: localeFor(brief),
  });
  const user = [
    renderIndustryGuide(industry),
    "",
    "BUSINESS FACTS",
    delimitUserData("brief", briefToText(brief), 3000),
    "",
    "Write:",
    `- tagline: <= ${BUDGETS.tagline} characters, 4-9 words, concrete, no full stop.`,
    `- description: <= ${BUDGETS.profileDescription} characters, 2-3 short sentences saying what the business does, for whom, and where (only if stated).`,
    "Do not output contact details.",
    "",
    'Output shape: {"tagline": string, "description": string}',
  ].join("\n");
  return { system, user };
}

// ---------- page ----------

export function modelSectionsOf(job: PageJob): ModelSectionType[] {
  return job.sections.filter(isModelSection);
}

export function buildPagePrompt(args: {
  brief: Brief;
  templateKey: string;
  job: PageJob;
  /** Hero headlines of pages already written, so this page does not repeat them. */
  avoid?: string[];
}): Prompt {
  const { brief, templateKey, job } = args;
  const industry = getIndustry(templateKey);
  const types = modelSectionsOf(job);
  const extraRules: string[] = [];
  if (industry.shop) {
    extraRules.push(
      "This is an online-shop site. Never invent products, product names, prices, discounts, stock levels or reviews. Write about categories and how ordering works. The owner adds real products later in the Shop tab.",
    );
  }
  if (types.includes("team")) {
    extraRules.push("Never invent a person's name. Team entries use job titles as names.");
  }
  const system = buildSystemPrompt({
    task: `Write the "${job.key}" page of a small business website as JSON.`,
    locale: localeFor(brief),
    extraRules,
  });

  const shape =
    `{ ${seoShapeLine()}, "sections": [ ${types.map((t, i) => `<section ${i + 1}: ${t}>`).join(", ")} ] }`;

  const user = [
    `PAGE JOB: ${job.purpose}`,
    "",
    renderIndustryGuide(industry),
    "",
    "BUSINESS FACTS (use only these; leave out anything not stated)",
    delimitUserData("brief", briefToText(brief), 3000),
    "",
    ...(args.avoid && args.avoid.length
      ? [`Other pages already use these headlines, so do not reuse or paraphrase them: ${args.avoid.map((h) => `"${h}"`).join("; ")}`, ""]
      : []),
    `SECTIONS TO WRITE: exactly ${types.length}, in this exact order. ${job.heroHref ? `Hero ctaHref must be "${job.heroHref}".` : 'Hero ctaHref must be an empty string "".'}`,
    "",
    renderSectionSpecs(types, industry.roles),
    "",
    `OUTPUT SHAPE: ${shape}`,
    "Return only the JSON object.",
  ].join("\n");
  return { system, user };
}

export function buildRepairPrompt(original: Prompt, previousOutput: string, errors: string[]): Prompt {
  const user = [
    original.user,
    "",
    "YOUR PREVIOUS ANSWER (failed checks):",
    previousOutput.slice(0, 7000),
    "",
    "VALIDATION ERRORS (fix every one, keep everything else that was good):",
    ...errors.slice(0, 12).map((e) => `- ${e}`),
    "",
    "Return the complete corrected JSON object only.",
  ].join("\n");
  return { system: original.system, user };
}

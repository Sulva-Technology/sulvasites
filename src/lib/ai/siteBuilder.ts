// Multi-stage site builder: PLAN -> PROFILE -> WRITE (page by page, with repair) -> FINISH
// (images + quality gate). Every stage is its own function so the API can run them in
// separate requests (Vercel timeouts) or all at once. Relative imports only.
import type { PageData } from "../pageSchema.ts";
import { fillSiteImages, hintWords, normalizeCategory, stripAiImageUrls, type PhotoCategory } from "../stockPhotos.ts";
import { slugify } from "../slugify.ts";
import { TEMPLATE_META } from "../../templates/meta.ts";
import { runAssistantTurn, type ChatFn } from "./assistant.ts";
import {
  hasEnoughToBuild,
  mergeBrief,
  normalizeBrief,
  normalizeMessages,
  type Brief,
  type ChatMessage,
} from "./brief.ts";
import { GroqError, extractJson, groqChat } from "./groq.server.ts";
import { completeDraft, fallbackSeo, parsePageOutput } from "./pageContent.ts";
import { getPageJobs, type PageJob } from "./pagePlans.ts";
import {
  buildPagePrompt,
  buildPlanPrompt,
  buildProfilePrompt,
  buildRepairPrompt,
  type Prompt,
} from "./prompts/builders.ts";
import { getIndustry } from "./prompts/industries.ts";
import { BUDGETS as B, SAMPLING } from "./prompts/rules.ts";
import { applyQualityGate, fitSentence, lintPage } from "./quality.ts";
import { isTemplateKey, resolveTemplateChoice, type TemplateChoice } from "./templateChoice.ts";

export const MAX_REPAIR_ROUNDS = 2;

export type { ChatFn };
export type BuilderDeps = { chat?: ChatFn; onProgress?: (stage: string) => void };

export type SitePlan = {
  brief: Brief;
  templateKey: string;
  reason: string;
  alternatives: TemplateChoice["alternatives"];
  photoCategory: PhotoCategory;
  source: TemplateChoice["source"];
  /** Page keys the pipeline will write, in order. */
  pages: Array<{ key: string; label: string; kind: "core" | "extra" }>;
};

export type SiteProfile = {
  business_name: string;
  tagline: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  socials: { instagram: string | null; facebook: string | null; twitter: string | null; tiktok: string | null };
};

export type PageResult = {
  key: string;
  data: PageData;
  repairRounds: number;
  fallbackTypes: string[];
  /** True when the model never produced usable output for this page. */
  aiFailed: boolean;
};

export type BuildResult = {
  templateKey: string;
  templateName: string;
  reason: string;
  alternatives: TemplateChoice["alternatives"];
  photoCategory: PhotoCategory;
  slugSuggestion: string;
  profile: SiteProfile;
  pages: { home: PageData; about: PageData; contact: PageData };
  extraPages: Array<{ key: string; label: string; data: PageData }>;
  notes: string[];
};

const HARD_ERRORS: GroqError["code"][] = ["not_configured", "bad_key"];

function isHardError(e: unknown): e is GroqError {
  return e instanceof GroqError && HARD_ERRORS.includes(e.code);
}

// ---------- stage 1: plan ----------

export async function planSite(
  input: { messages?: unknown; state?: unknown; templateOverride?: string | null },
  deps: BuilderDeps = {},
): Promise<SitePlan> {
  const chat = deps.chat ?? groqChat;
  const messages: ChatMessage[] = normalizeMessages(input.messages);
  let brief = normalizeBrief(input.state);

  // A raw paragraph (or any transcript) with no usable state: extract the brief first.
  if (messages.length > 0 && !hasEnoughToBuild(brief)) {
    const turn = await runAssistantTurn({ messages, state: brief }, { chat });
    brief = mergeBrief(brief, turn.state);
  }
  if (!brief.businessName && !brief.whatTheyDo) {
    throw new Error("Not enough information to build a site. Tell me the business name and what it does.");
  }
  if (!brief.businessName) brief.businessName = "My Business";

  let raw: unknown = null;
  if (!isTemplateKey(input.templateOverride)) {
    try {
      const { system, user } = buildPlanPrompt(brief);
      raw = extractJson(await chat({ system, user, json: true, ...SAMPLING.plan }));
    } catch (e) {
      if (isHardError(e)) throw e;
      raw = null; // invalid JSON or transient upstream trouble: deterministic fallback below
    }
  }
  const choice = resolveTemplateChoice(raw, brief, input.templateOverride);
  return {
    brief,
    templateKey: choice.templateKey,
    reason: choice.reason,
    alternatives: choice.alternatives,
    photoCategory: choice.photoCategory,
    source: choice.source,
    pages: getPageJobs(choice.templateKey).map((j) => ({ key: j.key, label: j.label, kind: j.kind })),
  };
}

/** Rebuilds a trusted plan from client-supplied JSON (the server never trusts page lists or keys). */
export function rehydratePlan(raw: unknown): SitePlan {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const templateKey = isTemplateKey(r.templateKey) ? r.templateKey : "t1";
  const brief = normalizeBrief(r.brief);
  if (!brief.businessName) brief.businessName = "My Business";
  const category = normalizeCategory(r.photoCategory);
  return {
    brief,
    templateKey,
    reason: typeof r.reason === "string" ? r.reason.slice(0, 200) : "",
    alternatives: [],
    photoCategory: category === "general" && r.photoCategory !== "general" ? getIndustry(templateKey).photoCategory : category,
    source: "user",
    pages: getPageJobs(templateKey).map((j) => ({ key: j.key, label: j.label, kind: j.kind })),
  };
}

// ---------- stage 2: profile ----------

export function profileFromBrief(brief: Brief, tagline: string, description: string): SiteProfile {
  const c = brief.contact;
  const n = (v: string) => v.trim() || null;
  return {
    business_name: brief.businessName,
    tagline: n(fitSentence(tagline, B.tagline)),
    description: n(fitSentence(description, B.profileDescription)),
    address: n(c.address),
    phone: n(c.phone),
    email: n(c.email),
    whatsapp: n(c.whatsapp),
    socials: { instagram: n(c.instagram), facebook: n(c.facebook), twitter: n(c.twitter), tiktok: n(c.tiktok) },
  };
}

export async function writeProfile(plan: SitePlan, deps: BuilderDeps = {}): Promise<SiteProfile> {
  const chat = deps.chat ?? groqChat;
  const { brief } = plan;
  let tagline = "";
  let description = "";
  try {
    const { system, user } = buildProfilePrompt(brief, plan.templateKey);
    const parsed = extractJson(await chat({ system, user, json: true, ...SAMPLING.profile })) as Record<string, unknown>;
    tagline = typeof parsed.tagline === "string" ? parsed.tagline.replace(/\.+$/, "") : "";
    description = typeof parsed.description === "string" ? parsed.description : "";
  } catch (e) {
    if (isHardError(e)) throw e;
  }
  if (!tagline) tagline = brief.whatTheyDo;
  if (!description) description = brief.whatTheyDo ? `${brief.businessName}: ${brief.whatTheyDo}${brief.location ? ` in ${brief.location}` : ""}.` : "";
  return profileFromBrief(brief, tagline, description);
}

// ---------- stage 3: write one page, with validate + repair ----------

export async function writePage(plan: SitePlan, key: string, deps: BuilderDeps = {}, avoid: string[] = []): Promise<PageResult> {
  const chat = deps.chat ?? groqChat;
  const job = getPageJobs(plan.templateKey).find((j) => j.key === key);
  if (!job) throw new Error(`Unknown page '${key}' for this template.`);
  return generatePage(job, plan, chat, avoid);
}

async function generatePage(job: PageJob, plan: SitePlan, chat: ChatFn, avoid: string[]): Promise<PageResult> {
  const { brief, templateKey } = plan;
  const base: Prompt = buildPagePrompt({ brief, templateKey, job, avoid });
  const defaults = { ctaText: fitSentence(getIndustry(templateKey).ctas[0] ?? "Get in touch", B.heroCta) };

  let prompt = base;
  let best: { draft: ReturnType<typeof parsePageOutput>; score: number } | null = null;
  let repairRounds = 0;
  let aiFailed = true;

  for (let round = 0; round <= MAX_REPAIR_ROUNDS; round++) {
    let text: string;
    try {
      text = await chat({ ...prompt, json: true, ...(round === 0 ? SAMPLING.write : SAMPLING.repair) });
    } catch (e) {
      if (isHardError(e)) throw e;
      break; // upstream trouble after the core's own retries: use what we have, then fallback
    }

    let errors: string[] = [];
    let draft: ReturnType<typeof parsePageOutput> | null = null;
    try {
      draft = parsePageOutput(job, extractJson(text), defaults);
      errors = [...draft.errors];
      const partial: PageData = { seo: draft.seo, sections: draft.slots.filter((s): s is NonNullable<typeof s> => !!s) };
      errors.push(...lintPage(partial, brief).map((i) => i.message));
    } catch {
      errors = ["Your answer was not valid JSON. Return ONE JSON object only, with no text around it."];
    }

    if (draft) {
      aiFailed = false;
      const score = errors.length + draft.slots.filter((s) => !s).length * 3;
      if (!best || score < best.score) best = { draft, score };
    }
    if (errors.length === 0) break;
    if (round < MAX_REPAIR_ROUNDS) {
      repairRounds++;
      prompt = buildRepairPrompt(base, text, errors);
    }
  }

  const draft = best?.draft ?? {
    seo: fallbackSeo(job, brief),
    slots: job.sections.map(() => null),
    errors: [],
  };
  const { data, fallbackTypes } = completeDraft(job, draft, brief, templateKey);
  return { key: job.key, data, repairRounds, fallbackTypes, aiFailed };
}

// ---------- stage 4: finish (images, quality gate, notes) ----------

export function finishSite(plan: SitePlan, profile: SiteProfile, results: PageResult[]): BuildResult {
  const jobs = getPageJobs(plan.templateKey);
  const labels = Object.fromEntries(jobs.map((j) => [j.key, j.label]));
  const extraKeys = jobs.filter((j) => j.kind === "extra").map((j) => j.key);
  const byKey: Record<string, PageData> = {};
  for (const j of jobs) {
    const r = results.find((x) => x.key === j.key);
    byKey[j.key] = r ? r.data : completeDraft(j, { seo: fallbackSeo(j, plan.brief), slots: j.sections.map(() => null), errors: [] }, plan.brief, plan.templateKey).data;
  }

  const gated = applyQualityGate(stripAiImageUrls(byKey), { brief: plan.brief, templateKey: plan.templateKey, extraKeys, labels });
  const hints = hintWords(plan.brief.whatTheyDo, plan.brief.services.join(" "));
  const withImages = fillSiteImages(gated.pages, plan.photoCategory, plan.brief.businessName, hints);

  const notes: string[] = [];
  const meta = TEMPLATE_META.find((t) => t.key === plan.templateKey);
  const industry = getIndustry(plan.templateKey);
  if (industry.shop) {
    notes.push("This is an online shop template. No products or prices were invented: add your real products in the Shop tab.");
  }
  if (!plan.brief.contact.phone && !plan.brief.contact.whatsapp && !plan.brief.contact.email) {
    notes.push("No phone, WhatsApp or email was given, so none is shown. Add them in the site's business profile.");
  }
  if (jobs.some((j) => j.sections.includes("team"))) {
    notes.push("Team entries use job titles instead of names. Replace them with your real team and photos.");
  }
  notes.push("Testimonials and partner logos were not generated, so nothing is made up. Add real ones later.");
  notes.push("Photos are stock images matched to your business. Swap in your own when you have them.");
  const failed = results.filter((r) => r.aiFailed).map((r) => labels[r.key] ?? r.key);
  if (failed.length) notes.push(`The AI was unavailable for: ${failed.join(", ")}. Those pages use simple placeholder copy; run "AI content" on the site to improve them.`);
  const fb = results.filter((r) => !r.aiFailed && r.fallbackTypes.length);
  if (fb.length) notes.push(`Some sections (${[...new Set(fb.flatMap((r) => r.fallbackTypes))].join(", ")}) could not be validated and use simple generic copy.`);

  const core = (k: "home" | "about" | "contact") => withImages[k]!;
  return {
    templateKey: plan.templateKey,
    templateName: meta ? `${meta.name} — ${meta.category}` : plan.templateKey,
    reason: plan.reason,
    alternatives: plan.alternatives,
    photoCategory: plan.photoCategory,
    slugSuggestion: slugify(plan.brief.businessName) || "my-site",
    profile,
    pages: { home: core("home"), about: core("about"), contact: core("contact") },
    extraPages: jobs.filter((j) => j.kind === "extra").map((j) => ({ key: j.key, label: j.label, data: withImages[j.key]! })),
    notes,
  };
}

// ---------- all stages ----------

export async function buildSite(
  input: { messages?: unknown; state?: unknown; templateOverride?: string | null },
  deps: BuilderDeps = {},
): Promise<BuildResult> {
  const progress = deps.onProgress ?? (() => {});
  progress("plan");
  const plan = await planSite(input, deps);
  progress("profile");
  const profile = await writeProfile(plan, deps);

  const results: PageResult[] = [];
  const avoid: string[] = [];
  for (const p of plan.pages.filter((x) => x.kind === "core")) {
    progress(`page:${p.key}`);
    const r = await writePage(plan, p.key, deps, avoid);
    results.push(r);
    const h = r.data.sections.find((s) => s.type === "hero");
    if (h && h.type === "hero") avoid.push(h.headline);
  }
  const extras = plan.pages.filter((x) => x.kind === "extra");
  for (let i = 0; i < extras.length; i += 3) {
    const batch = extras.slice(i, i + 3);
    batch.forEach((p) => progress(`page:${p.key}`));
    results.push(...(await Promise.all(batch.map((p) => writePage(plan, p.key, deps, avoid)))));
  }
  progress("finish");
  return finishSite(plan, profile, results);
}

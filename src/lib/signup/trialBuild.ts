// Builds a new trial site from the signup answers and pasted details within a time budget. Every
// page starts from the owner's own facts (detailsDraft.ts); the AI rewrites what it can finish in
// time and a page it cannot reach keeps those facts. Never uses template demo content, so another
// business's reviews, names or numbers can't appear on a new site. Relative imports only.
import type { ChatFn } from "../ai/assistant.ts";
import type { Brief } from "../ai/brief.ts";
import { GroqError } from "../ai/groq.server.ts";
import { completeDraft } from "../ai/pageContent.ts";
import { getPageJobs, type PageJob } from "../ai/pagePlans.ts";
import {
  finishSite,
  patientChat,
  profileFromBrief,
  rehydratePlan,
  writePage,
  writeProfile,
  type BuilderDeps,
  type PageResult,
  type SitePlan,
} from "../ai/siteBuilder.ts";
import { draftFromDetails } from "./detailsDraft.ts";
import type { TrialBuild } from "./fallbackSite.ts";
import type { ParsedDetails } from "./ownerDetails.ts";

/** Provider errors that will not clear within one signup; after one, the rest of the build skips the AI. */
const FATAL: GroqError["code"][] = ["not_configured", "bad_key", "rate_limited"];

/**
 * Wraps the model so each call ends by the deadline and every failure is a plain Error, which the
 * builder stages treat as "use the fallback for this part" instead of failing the whole build.
 */
export function budgetChat(chat: ChatFn, deadline: number, now: () => number = Date.now): { chat: ChatFn; answered: () => number } {
  let dead = false;
  let answered = 0;
  const wrapped: ChatFn = async (opts) => {
    const left = deadline - now();
    if (dead || left <= 0) throw new Error("ai_unavailable");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const out = await Promise.race([
        chat(opts),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("ai_timeout")), left);
        }),
      ]);
      answered++;
      return out;
    } catch (e) {
      if (e instanceof GroqError && FATAL.includes(e.code)) dead = true;
      throw new Error("ai_unavailable");
    } finally {
      clearTimeout(timer);
    }
  };
  return { chat: wrapped, answered: () => answered };
}

export type TrialBuildInput = {
  brief: Brief;
  templateKey: string;
  details: ParsedDetails;
  chat: ChatFn;
  budgetMs: number;
  now?: () => number;
};

function offlinePage(plan: SitePlan, job: PageJob, fallbackDraft: NonNullable<BuilderDeps["fallbackDraft"]>): PageResult {
  const { data, fallbackTypes } = completeDraft(job, fallbackDraft(job), plan.brief, plan.templateKey);
  return { key: job.key, data, repairRounds: 0, fallbackTypes, aiFailed: true };
}

export async function buildTrialSite(input: TrialBuildInput): Promise<TrialBuild & { usedAi: boolean }> {
  const now = input.now ?? Date.now;
  // The owner picked the design, so no planning call: the template's own photo category is used.
  const plan = rehydratePlan({ templateKey: input.templateKey, brief: input.brief });
  const owner = input.details.kind === "json" ? input.details.details : null;
  const fallbackDraft = (job: PageJob) => draftFromDetails(job, owner, plan.brief, plan.templateKey);
  const budget = budgetChat(patientChat(input.chat), now() + input.budgetMs, now);
  const deps: BuilderDeps = { chat: budget.chat, fallbackDraft };
  const jobs = getPageJobs(plan.templateKey);
  const page = (job: PageJob, avoid: string[] = []) => writePage(plan, job.key, deps, avoid).catch(() => offlinePage(plan, job, fallbackDraft));

  const [profile, home] = await Promise.all([
    writeProfile(plan, deps).catch(() => profileFromBrief(plan.brief, plan.brief.whatTheyDo, "")),
    page(jobs.find((j) => j.key === "home")!),
  ]);
  const avoid = home.data.sections.flatMap((s) => (s.type === "hero" ? [s.headline] : []));
  const results: PageResult[] = [home];
  const rest = jobs.filter((j) => j.key !== "home");
  for (let i = 0; i < rest.length; i += 3) {
    results.push(...(await Promise.all(rest.slice(i, i + 3).map((j) => page(j, avoid)))));
  }

  const built = finishSite(plan, profile, results);
  return { templateKey: built.templateKey, profile: built.profile, pages: built.pages, extraPages: built.extraPages, usedAi: budget.answered() > 0 };
}

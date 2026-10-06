// Model routing for every AI feature (site builder, setup chat, rewrite, SEO, "Ask AI"):
// Gemini first, then OpenRouter (Inkling, with Nemotron as its own fallback), then Groq as the
// last resort; each only when its key is set. Every one is on a free tier, so when one runs out
// of quota the next answers. AI_PROVIDERS=openrouter,gemini changes the order of the first two.
// Relative imports only (Node test runner).
import { geminiChat, geminiConfigured, geminiModel, geminiTimeout } from "./gemini.server.ts";
import { GroqError, groqChat, type GroqChatOptions, type GroqDeps } from "./groq.server.ts";
import {
  DEFAULT_TIMEOUT_MS as OPENROUTER_TIMEOUT_MS,
  openRouterChat,
  openRouterConfigured,
  openRouterModel,
  openRouterVisionChat,
  openRouterVisionModel,
} from "./openrouter.server.ts";

export type AiProvider = "gemini" | "openrouter" | "groq";
export type AiChatResult = { text: string; provider: AiProvider; model: string };

type Env = Record<string, string | undefined>;
type Step = {
  provider: AiProvider;
  model: string;
  /** Longest this provider may take, given what is left of the shared time budget. */
  cap: (left: number) => number;
  run: (opts: GroqChatOptions, deps: GroqDeps) => Promise<string>;
};

// Below this, a timed call is not worth starting; the next provider gets the time instead.
const MIN_CALL_MS = 4000;

/** The timed providers in order, from AI_PROVIDERS (default gemini first) and the keys that are set. */
function timedSteps(env: Env, vision: boolean): Step[] {
  const gemini: Step = {
    provider: "gemini",
    model: geminiModel(env),
    cap: (left) => Math.min(left, geminiTimeout(env)),
    run: geminiChat,
  };
  const openrouter: Step = {
    provider: "openrouter",
    model: vision ? openRouterVisionModel(env) : openRouterModel(env),
    cap: (left) => left,
    run: vision ? openRouterVisionChat : openRouterChat,
  };
  const configured = { gemini: geminiConfigured(env), openrouter: openRouterConfigured(env) };
  const order = (env.AI_PROVIDERS ?? "gemini,openrouter")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((p): p is "gemini" | "openrouter" => p === "gemini" || p === "openrouter");
  // Anything left out of AI_PROVIDERS still runs, after the named ones.
  const names = [...new Set([...order, "gemini", "openrouter"] as const)];
  return names.filter((p) => configured[p]).map((p) => (p === "gemini" ? gemini : openrouter));
}

function describe(e: unknown) {
  return e instanceof GroqError ? `${e.code}${e.status ? ` ${e.status}` : ""}` : "error";
}

/**
 * Tries Gemini, then OpenRouter, sharing one time budget (opts.timeoutMs, else OPENROUTER_TIMEOUT_MS
 * or 25s) so a slow first answer still leaves room for the next; then Groq with whatever is left of
 * the request. Any failure (quota, outage, bad key, timeout) moves on to the next provider; the last
 * provider's error is the one the caller sees.
 */
export async function aiChatWithInfo(opts: GroqChatOptions, deps: GroqDeps = {}): Promise<AiChatResult> {
  const env = deps.env ?? process.env;
  const steps = timedSteps(env, false);
  const groq = Boolean(env.GROQ_API_KEY);
  if (!steps.length && !groq) {
    throw new GroqError(
      "not_configured",
      "AI is not configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY in the server environment variables.",
    );
  }

  const budget = opts.timeoutMs && opts.timeoutMs > 0 ? opts.timeoutMs : Number(env.OPENROUTER_TIMEOUT_MS) > 0 ? Number(env.OPENROUTER_TIMEOUT_MS) : OPENROUTER_TIMEOUT_MS;
  const deadline = Date.now() + budget;
  let lastError: unknown = null;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const isLast = i === steps.length - 1 && !groq;
    const left = deadline - Date.now();
    // A later provider is skipped when an earlier one used up the budget, unless nothing comes after it.
    if (i > 0 && left < MIN_CALL_MS && !isLast) continue;
    const timeoutMs = i === 0 ? step.cap(left) : Math.max(step.cap(left), MIN_CALL_MS);
    try {
      const text = await step.run({ ...opts, timeoutMs }, deps);
      return { text, provider: step.provider, model: step.model };
    } catch (e) {
      if (isLast) throw e;
      lastError = e;
      console.error(`${step.provider} failed (${describe(e)}); trying the next AI provider.`);
    }
  }
  if (!groq) throw lastError ?? new GroqError("upstream", "AI request failed.");
  return { text: await groqChat(opts, deps), provider: "groq", model: env.GROQ_MODEL || "groq default" };
}

/** The text of one chat completion. Drop-in replacement for groqChat. */
export async function aiChat(opts: GroqChatOptions, deps: GroqDeps = {}): Promise<string> {
  return (await aiChatWithInfo(opts, deps)).text;
}

/** Vision is on whenever Gemini or OpenRouter is, unless switched off with AI_VISION=off. */
export function visionConfigured(env: Env = process.env): boolean {
  return (geminiConfigured(env) || openRouterConfigured(env)) && env.AI_VISION !== "off";
}

/**
 * A chat completion that includes opts.images: Gemini, then OpenRouter's vision model, within
 * opts.timeoutMs together. No Groq fallback: it cannot see pictures.
 */
export async function aiVisionChat(opts: GroqChatOptions, deps: GroqDeps = {}): Promise<string> {
  const env = deps.env ?? process.env;
  const steps = timedSteps(env, true);
  if (!steps.length) throw new GroqError("not_configured", "Vision is not configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY.");
  const deadline = Date.now() + (opts.timeoutMs && opts.timeoutMs > 0 ? opts.timeoutMs : OPENROUTER_TIMEOUT_MS);
  let lastError: unknown = null;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const left = deadline - Date.now();
    if (left < 1000) break;
    try {
      return await step.run({ ...opts, timeoutMs: step.cap(left) }, deps);
    } catch (e) {
      lastError = e;
      if (i < steps.length - 1) console.error(`${step.provider} vision failed (${describe(e)}); trying the next provider.`);
    }
  }
  throw lastError ?? new GroqError("upstream", "Ran out of time for the photo check.", 408);
}

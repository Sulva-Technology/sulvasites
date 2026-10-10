// Model routing for every AI feature (site builder, setup chat, rewrite, SEO, "Ask AI"):
// Gemini first, then OpenRouter (Inkling, with Nemotron as its own fallback), then Groq as the
// last resort; each only when its key is set. Every one is on a free tier, so when one runs out
// of quota the next answers. AI_PROVIDERS=openrouter,gemini changes the order of the first two.
//
// Per-task models (paid credits): AI_MODEL_ASSISTANT is tried first for the "Ask AI" assistant and
// AI_MODEL_SMALL for small rewrites, each as "provider:model" (e.g. "openrouter:anthropic/claude-…",
// "gemini:gemini-3.8-flash"; no prefix means OpenRouter). The free chain above still answers when the
// per-task model fails or rests. An OpenRouter AI_MODEL_ASSISTANT also turns on native tool calling
// for the assistant (AI_ASSISTANT_TOOLS=off keeps the JSON-in-text path) and lets it see attached
// images (AI_ASSISTANT_VISION=off makes it rely on a vision model's notes instead).
// Relative imports only (Node test runner).
import type { ToolChatRequest } from "./agent/openaiTools.ts";
import type { ToolTurn } from "./agent/types.ts";
import { geminiChat, geminiConfigured, geminiModel, geminiTimeout } from "./gemini.server.ts";
import { GroqError, groqChat, type GroqChatOptions, type GroqDeps } from "./groq.server.ts";
import {
  DEFAULT_TIMEOUT_MS as OPENROUTER_TIMEOUT_MS,
  openRouterChat,
  openRouterChatWith,
  openRouterConfigured,
  openRouterModel,
  openRouterToolChat,
  openRouterVisionChat,
  openRouterVisionModel,
} from "./openrouter.server.ts";
import { isCooling, noteFailure, noteSuccess } from "./providerHealth.ts";

export type AiProvider = "gemini" | "openrouter" | "groq";
export type AiChatResult = { text: string; provider: AiProvider; model: string };
export type AiTask = NonNullable<GroqChatOptions["task"]>;
export type TaskModel = { provider: AiProvider; model: string };

const TASK_ENV: Record<AiTask, string> = { assistant: "AI_MODEL_ASSISTANT", small: "AI_MODEL_SMALL" };

/** The per-task model from env, or null when unset or its provider has no key. */
export function taskModel(task: AiTask, env: Env = process.env): TaskModel | null {
  const raw = (env[TASK_ENV[task]] ?? "").trim();
  if (!raw) return null;
  const m = raw.match(/^(gemini|openrouter|groq):(.+)$/i);
  const provider = (m ? m[1]!.toLowerCase() : "openrouter") as AiProvider;
  const model = (m ? m[2]! : raw).trim();
  if (!model) return null;
  const configured = provider === "gemini" ? geminiConfigured(env) : provider === "openrouter" ? openRouterConfigured(env) : Boolean(env.GROQ_API_KEY);
  return configured ? { provider, model } : null;
}

const healthKey = (t: TaskModel) => `${t.provider}:${t.model}`;

/** Runs one text completion on a specific per-task model. */
function runTaskModel(t: TaskModel, opts: GroqChatOptions, deps: GroqDeps, env: Env): Promise<string> {
  if (t.provider === "openrouter") return openRouterChatWith(t.model, null, opts, deps);
  if (t.provider === "gemini") return geminiChat(opts, { ...deps, env: { ...env, GEMINI_MODEL: t.model } });
  return groqChat(opts, { ...deps, env: { ...env, GROQ_MODEL: t.model, GROQ_FALLBACK_MODEL: t.model } });
}

/** The model the assistant's native tool-calling loop uses, or null to use the JSON-in-text path. */
export function toolCallingModel(env: Env = process.env): TaskModel | null {
  if (env.AI_ASSISTANT_TOOLS === "off") return null;
  const t = taskModel("assistant", env);
  return t?.provider === "openrouter" ? t : null;
}

/** True when the tool-calling model is shown attached images directly. */
export function assistantSeesImages(env: Env = process.env): boolean {
  return toolCallingModel(env) !== null && env.AI_ASSISTANT_VISION !== "off";
}

/**
 * One tool-calling turn on the assistant's model. Throws (not_configured, or the provider's error)
 * so the caller can fall back to the JSON-in-text path; a model that just failed rests briefly.
 */
export async function aiToolChat(req: ToolChatRequest, deps: GroqDeps = {}): Promise<ToolTurn & { provider: AiProvider; model: string }> {
  const env = deps.env ?? process.env;
  const t = toolCallingModel(env);
  if (!t) throw new GroqError("not_configured", "No tool-calling model is configured. Set AI_MODEL_ASSISTANT to an OpenRouter model.");
  if (isCooling(healthKey(t))) throw new GroqError("rate_limited", "The assistant model is resting after a failure.", 429);
  try {
    const turn = await openRouterToolChat(t.model, req, deps);
    noteSuccess(healthKey(t));
    return { ...turn, provider: t.provider, model: t.model };
  } catch (e) {
    noteFailure(healthKey(t), e);
    throw e;
  }
}

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
 * provider's error is the one the caller sees. A provider that failed in the last few seconds (quota,
 * timeout, outage) is skipped while another can answer; see providerHealth.ts.
 */
export async function aiChatWithInfo(opts: GroqChatOptions, deps: GroqDeps = {}): Promise<AiChatResult> {
  const env = deps.env ?? process.env;
  const configured = timedSteps(env, false);
  const groqKey = Boolean(env.GROQ_API_KEY);
  if (!configured.length && !groqKey) {
    throw new GroqError(
      "not_configured",
      "AI is not configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY in the server environment variables.",
    );
  }

  // A provider that just failed rests for a moment, unless every provider is resting.
  const now = Date.now();
  const names: AiProvider[] = [...configured.map((s) => s.provider), ...(groqKey ? (["groq"] as const) : [])];
  const anyReady = names.some((p) => !isCooling(p, now));
  const steps = anyReady ? configured.filter((s) => !isCooling(s.provider, now)) : configured;
  const groq = groqKey && (!anyReady || !isCooling("groq", now));

  const budget = opts.timeoutMs && opts.timeoutMs > 0 ? opts.timeoutMs : Number(env.OPENROUTER_TIMEOUT_MS) > 0 ? Number(env.OPENROUTER_TIMEOUT_MS) : OPENROUTER_TIMEOUT_MS;
  const deadline = Date.now() + budget;
  let lastError: unknown = null;

  // The task's own model goes first; the free chain below is the fallback.
  const task = opts.task ? taskModel(opts.task, env) : null;
  if (task && !isCooling(healthKey(task), now)) {
    const nextUp = steps.length > 0 || groq;
    // Leave the free chain a fair share of the budget when this one fails.
    const timeoutMs = nextUp ? Math.max(MIN_CALL_MS, Math.round(budget * 0.6)) : budget;
    try {
      const text = await runTaskModel(task, { ...opts, timeoutMs }, deps, env);
      noteSuccess(healthKey(task));
      return { text, provider: task.provider, model: task.model };
    } catch (e) {
      noteFailure(healthKey(task), e);
      if (!nextUp) throw e;
      lastError = e;
      console.error(`${task.provider}:${task.model} failed (${describe(e)}); trying the free AI providers.`);
    }
  }
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const isLast = i === steps.length - 1 && !groq;
    const left = deadline - Date.now();
    // A later provider is skipped when an earlier one used up the budget, unless nothing comes after it.
    if (i > 0 && left < MIN_CALL_MS && !isLast) continue;
    const timeoutMs = i === 0 ? step.cap(left) : Math.max(step.cap(left), MIN_CALL_MS);
    try {
      const text = await step.run({ ...opts, timeoutMs }, deps);
      noteSuccess(step.provider);
      return { text, provider: step.provider, model: step.model };
    } catch (e) {
      noteFailure(step.provider, e);
      if (isLast) throw e;
      lastError = e;
      console.error(`${step.provider} failed (${describe(e)}); trying the next AI provider.`);
    }
  }
  if (!groq) throw lastError ?? new GroqError("upstream", "AI request failed.");
  try {
    const text = await groqChat(opts, deps);
    noteSuccess("groq");
    return { text, provider: "groq", model: env.GROQ_MODEL || "groq default" };
  } catch (e) {
    noteFailure("groq", e);
    throw e;
  }
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

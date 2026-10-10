// OpenRouter client (OpenAI-compatible chat completions). Second in line after Gemini, with Groq as
// the last resort (see llm.server.ts). Relative imports only (Node test runner).
import { openAiToolBody, parseOpenAiToolTurn, type ToolChatRequest } from "./agent/openaiTools.ts";
import type { ToolTurn } from "./agent/types.ts";
import { GroqError, type GroqChatOptions, type GroqDeps } from "./groq.server.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
/**
 * Free endpoint by choice: no OpenRouter credit needed. Free providers may log prompts (which carry
 * customers' business details) and have daily request caps; set OPENROUTER_MODEL to the model id
 * without ":free" for the paid, no-data-retention endpoint.
 */
export const DEFAULT_OPENROUTER_MODEL = "thinkingmachines/inkling:free";
/** Tried by OpenRouter itself when the main model errors (down, at capacity). OPENROUTER_FALLBACK_MODEL=off disables it. */
export const DEFAULT_OPENROUTER_FALLBACK_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
const ATTEMPTS = 2;
const MAX_BACKOFF_MS = 8000;
/**
 * Per-call time limit. API routes have 60s; a slow answer is abandoned in time for the Groq
 * fallback to answer instead of the whole request being killed. Override with OPENROUTER_TIMEOUT_MS.
 */
export const DEFAULT_TIMEOUT_MS = 25000;

type Completion = { choices?: Array<{ message?: { content?: string | null } }> };

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** The request body. Exported for tests. */
export function openRouterBody(model: string, opts: GroqChatOptions, fallback: string | null = null): Record<string, unknown> {
  const messages: Array<{ role: string; content: unknown }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({
    role: "user",
    content: opts.images?.length
      ? [{ type: "text", text: opts.user }, ...opts.images.map((url) => ({ type: "image_url", image_url: { url } }))]
      : opts.user,
  });
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.65,
    // Reasoning tokens count against this budget, so it stays generous.
    max_tokens: opts.maxTokens ?? 4096,
    // Think, but keep the thinking out of the reply: the app only reads the JSON answer.
    reasoning: { effort: opts.reasoningEffort ?? "medium", exclude: true },
  };
  if (fallback && fallback !== model) body.models = [model, fallback];
  if (opts.json) body.response_format = { type: "json_object" };
  // Customer business details are in these prompts: only route to providers that don't store or
  // train on them. Free endpoints are logged by design, so this would leave them unroutable.
  if (![model, fallback].some((m) => m?.endsWith(":free"))) body.provider = { data_collection: "deny" };
  return body;
}

type Attempt<T> = { ok: true; value: T } | { ok: false; error: GroqError; retryable: boolean; retryAfterMs?: number };
/** Pulls the answer out of a successful response, or null when it is empty. */
type Extract<T> = (data: unknown) => T | null;

const textAnswer: Extract<string> = (data) => {
  const text = (data as Completion | null)?.choices?.[0]?.message?.content ?? "";
  return text.trim() ? text : null;
};

async function callOnce<T>(
  fetchImpl: typeof fetch,
  apiKey: string,
  body: Record<string, unknown>,
  extract: Extract<T>,
  timeoutOpt: number | undefined,
  env: Record<string, string | undefined>,
): Promise<Attempt<T>> {
  const timeoutMs =
    timeoutOpt && timeoutOpt > 0 ? timeoutOpt : Number(env.OPENROUTER_TIMEOUT_MS) > 0 ? Number(env.OPENROUTER_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await request(fetchImpl, apiKey, body, extract, env, controller.signal);
  } catch (e) {
    if (controller.signal.aborted) {
      // Not retried: a second slow attempt would use up the time the fallback needs.
      return { ok: false, retryable: false, error: new GroqError("upstream", `OpenRouter took longer than ${Math.round(timeoutMs / 1000)}s.`, 408) };
    }
    return { ok: false, retryable: true, error: new GroqError("upstream", e instanceof Error ? e.message : "Network error") };
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(
  fetchImpl: typeof fetch,
  apiKey: string,
  body: Record<string, unknown>,
  extract: Extract<T>,
  env: Record<string, string | undefined>,
  signal: AbortSignal,
): Promise<Attempt<T>> {
  let res: Response;
  try {
    res = await fetchImpl(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Optional attribution headers OpenRouter shows in its dashboard.
        "HTTP-Referer": env.NEXT_PUBLIC_SITE_URL || "https://sulvasites.com",
        "X-Title": "Sulva Sites",
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (signal.aborted) throw e;
    return { ok: false, retryable: true, error: new GroqError("upstream", e instanceof Error ? e.message : "Network error") };
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 2000);
    const status = res.status;
    if (status === 401 || status === 403) {
      return { ok: false, retryable: false, error: new GroqError("bad_key", "Invalid OpenRouter API key.", status, detail) };
    }
    if (status === 402) {
      return { ok: false, retryable: false, error: new GroqError("upstream", "OpenRouter account is out of credit.", status, detail) };
    }
    const retryHeader = Number(res.headers?.get?.("retry-after"));
    const retryAfterMs = Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader * 1000 : undefined;
    if (status === 429) {
      return { ok: false, retryable: true, retryAfterMs, error: new GroqError("rate_limited", "OpenRouter rate limit reached. Try again in a moment.", status, detail) };
    }
    return { ok: false, retryable: status >= 500 || status === 408, retryAfterMs, error: new GroqError("upstream", `OpenRouter request failed (${status}).`, status, detail) };
  }

  const data = (await res.json().catch(() => null)) as unknown;
  if (signal.aborted) throw new Error("aborted");
  const value = extract(data);
  if (value === null) return { ok: false, retryable: true, error: new GroqError("empty", "Empty response from OpenRouter.", 200) };
  return { ok: true, value };
}

export function openRouterConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.OPENROUTER_API_KEY);
}

export function openRouterModel(env: Record<string, string | undefined> = process.env): string {
  return env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
}

/** OpenRouter's own second choice for text, or null when switched off with OPENROUTER_FALLBACK_MODEL=off. */
export function openRouterFallbackModel(env: Record<string, string | undefined> = process.env): string | null {
  const m = env.OPENROUTER_FALLBACK_MODEL || DEFAULT_OPENROUTER_FALLBACK_MODEL;
  return m === "off" ? null : m;
}

/** OpenRouter's model for pictures, used when Gemini is not set or fails. */
export const DEFAULT_OPENROUTER_VISION_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

export function openRouterVisionModel(env: Record<string, string | undefined> = process.env): string {
  return env.OPENROUTER_VISION_MODEL || DEFAULT_OPENROUTER_VISION_MODEL;
}

async function withRetries<T>(body: Record<string, unknown>, extract: Extract<T>, timeoutMs: number | undefined, deps: GroqDeps): Promise<T> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? defaultSleep;
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new GroqError("not_configured", "OpenRouter is not configured. Set OPENROUTER_API_KEY.");

  let last: GroqError | null = null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const result = await callOnce(fetchImpl, apiKey, body, extract, timeoutMs, env);
    if (result.ok) return result.value;
    last = result.error;
    if (!result.retryable) throw result.error;
    if (attempt < ATTEMPTS - 1) await sleep(Math.min(result.retryAfterMs ?? 800, MAX_BACKOFF_MS));
  }
  throw last ?? new GroqError("upstream", "OpenRouter request failed.");
}

/** One chat completion with a given model (llm.server.ts uses it for per-task models). */
export async function openRouterChatWith(model: string, fallback: string | null, opts: GroqChatOptions, deps: GroqDeps = {}): Promise<string> {
  return withRetries(openRouterBody(model, opts, fallback), textAnswer, opts.timeoutMs, deps);
}

/** One chat completion via OpenRouter; retries once on rate limits, timeouts and server errors. */
export async function openRouterChat(opts: GroqChatOptions, deps: GroqDeps = {}): Promise<string> {
  const env = deps.env ?? process.env;
  return openRouterChatWith(openRouterModel(env), openRouterFallbackModel(env), opts, deps);
}

/** A chat completion that includes opts.images, answered by the vision model (llm.server.ts tries Gemini first). */
export async function openRouterVisionChat(opts: GroqChatOptions, deps: GroqDeps = {}): Promise<string> {
  return openRouterChatWith(openRouterVisionModel(deps.env ?? process.env), null, opts, deps);
}

/** One tool-calling turn (OpenAI format) with the given model; retries like the text calls. */
export async function openRouterToolChat(model: string, req: ToolChatRequest, deps: GroqDeps = {}): Promise<ToolTurn> {
  const extract: Extract<ToolTurn> = (data) => {
    const turn = parseOpenAiToolTurn(data);
    return turn && (turn.text || turn.calls.length) ? turn : null;
  };
  return withRetries(openAiToolBody(model, req), extract, req.timeoutMs, deps);
}

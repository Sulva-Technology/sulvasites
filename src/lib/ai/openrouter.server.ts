// OpenRouter client (OpenAI-compatible chat completions). Used by the "Ask AI" site assistant,
// with Groq as the automatic fallback (see llm.server.ts). Relative imports only (Node test runner).
import { GroqError, type GroqChatOptions, type GroqDeps } from "./groq.server.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
/** Paid endpoint on purpose: the ":free" variant may log prompts, and prompts carry customers' business details. */
export const DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";
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
export function openRouterBody(model: string, opts: GroqChatOptions): Record<string, unknown> {
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
  if (opts.json) body.response_format = { type: "json_object" };
  // Customer business details are in these prompts: only route to providers that don't store or
  // train on them. Free endpoints are logged by design, so this would leave them unroutable.
  if (!model.endsWith(":free")) body.provider = { data_collection: "deny" };
  return body;
}

type Attempt = { ok: true; text: string } | { ok: false; error: GroqError; retryable: boolean; retryAfterMs?: number };

async function callOnce(fetchImpl: typeof fetch, apiKey: string, model: string, opts: GroqChatOptions, env: Record<string, string | undefined>): Promise<Attempt> {
  const timeoutMs =
    opts.timeoutMs && opts.timeoutMs > 0 ? opts.timeoutMs : Number(env.OPENROUTER_TIMEOUT_MS) > 0 ? Number(env.OPENROUTER_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await request(fetchImpl, apiKey, model, opts, env, controller.signal);
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

async function request(
  fetchImpl: typeof fetch,
  apiKey: string,
  model: string,
  opts: GroqChatOptions,
  env: Record<string, string | undefined>,
  signal: AbortSignal,
): Promise<Attempt> {
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
      body: JSON.stringify(openRouterBody(model, opts)),
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

  const data = (await res.json().catch(() => null)) as Completion | null;
  if (signal.aborted) throw new Error("aborted");
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) return { ok: false, retryable: true, error: new GroqError("empty", "Empty response from OpenRouter.", 200) };
  return { ok: true, text };
}

export function openRouterConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.OPENROUTER_API_KEY);
}

export function openRouterModel(env: Record<string, string | undefined> = process.env): string {
  return env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
}

/** The model that can look at pictures. The main model is text-only, so image checks go to this one. */
export const DEFAULT_OPENROUTER_VISION_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

export function openRouterVisionModel(env: Record<string, string | undefined> = process.env): string {
  return env.OPENROUTER_VISION_MODEL || DEFAULT_OPENROUTER_VISION_MODEL;
}

/** Vision is on whenever OpenRouter is, unless switched off with AI_VISION=off. */
export function visionConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return openRouterConfigured(env) && env.AI_VISION !== "off";
}

async function chatWithModel(model: string, opts: GroqChatOptions, deps: GroqDeps): Promise<string> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? defaultSleep;
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new GroqError("not_configured", "OpenRouter is not configured. Set OPENROUTER_API_KEY.");

  let last: GroqError | null = null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const result = await callOnce(fetchImpl, apiKey, model, opts, env);
    if (result.ok) return result.text;
    last = result.error;
    if (!result.retryable) throw result.error;
    if (attempt < ATTEMPTS - 1) await sleep(Math.min(result.retryAfterMs ?? 800, MAX_BACKOFF_MS));
  }
  throw last ?? new GroqError("upstream", "OpenRouter request failed.");
}

/** One chat completion via OpenRouter; retries once on rate limits, timeouts and server errors. */
export async function openRouterChat(opts: GroqChatOptions, deps: GroqDeps = {}): Promise<string> {
  return chatWithModel(openRouterModel(deps.env ?? process.env), opts, deps);
}

/** A chat completion that includes opts.images, answered by the vision model. No Groq fallback: it has no vision. */
export async function openRouterVisionChat(opts: GroqChatOptions, deps: GroqDeps = {}): Promise<string> {
  return chatWithModel(openRouterVisionModel(deps.env ?? process.env), opts, deps);
}

// Google Gemini client (native generateContent API). First in line for every AI feature when
// GEMINI_API_KEY is set (see llm.server.ts); it can also see pictures, so it checks product photos.
// Relative imports only (Node test runner).
import { GroqError, type GroqChatOptions, type GroqDeps } from "./groq.server.ts";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
/** Free of charge on the Gemini API free tier (rate-limited per minute and per day). */
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
/**
 * Per-call time limit when the caller gives none. Flash answers well inside this; a slower answer is
 * abandoned so OpenRouter or Groq still have time to answer. Override with GEMINI_TIMEOUT_MS.
 */
export const DEFAULT_GEMINI_TIMEOUT_MS = 20000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

type Part = { text?: string; thought?: boolean; inlineData?: { mimeType: string; data: string } };
type Response_ = {
  candidates?: Array<{ content?: { parts?: Part[] }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
};

export function geminiConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

export function geminiModel(env: Record<string, string | undefined> = process.env): string {
  return env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

export function geminiTimeout(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.GEMINI_TIMEOUT_MS);
  return n > 0 ? n : DEFAULT_GEMINI_TIMEOUT_MS;
}

/** The request body. Exported for tests. `thinking: false` leaves the model's own thinking default. */
export function geminiBody(opts: GroqChatOptions, images: Part[] = [], thinking = true): Record<string, unknown> {
  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.65,
    // Thinking tokens count against this budget, so it stays generous.
    maxOutputTokens: opts.maxTokens ?? 4096,
  };
  if (opts.json) generationConfig.responseMimeType = "application/json";
  if (thinking && opts.reasoningEffort) generationConfig.thinkingConfig = { thinkingLevel: opts.reasoningEffort };
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: opts.user }, ...images] }],
    generationConfig,
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  return body;
}

/** A data URL as-is, an http(s) URL downloaded: Gemini only takes pictures inline. */
async function toInlineImage(url: string, fetchImpl: typeof fetch, signal: AbortSignal): Promise<Part> {
  const m = url.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  if (m) return { inlineData: { mimeType: m[1]!.toLowerCase(), data: m[2]! } };
  if (!/^https:\/\//i.test(url)) throw new GroqError("upstream", "Unsupported image address.");
  const res = await fetchImpl(url, { signal });
  if (!res.ok) throw new GroqError("upstream", `Could not load an image for Gemini (${res.status}).`);
  const type = (res.headers?.get?.("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) throw new GroqError("upstream", "An image is too large for Gemini.");
  return { inlineData: { mimeType: type.startsWith("image/") ? type : "image/jpeg", data: bytes.toString("base64") } };
}

type Attempt = { ok: true; text: string } | { ok: false; error: GroqError; retryable: boolean; noThinking?: boolean };

async function callOnce(
  fetchImpl: typeof fetch,
  apiKey: string,
  model: string,
  opts: GroqChatOptions,
  thinking: boolean,
  signal: AbortSignal,
): Promise<Attempt> {
  let res: Response;
  try {
    const images = await Promise.all((opts.images ?? []).map((u) => toInlineImage(u, fetchImpl, signal)));
    res = await fetchImpl(`${GEMINI_URL}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      // Key in a header, not the URL, so it never lands in request logs.
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(geminiBody(opts, images, thinking)),
      signal,
    });
  } catch (e) {
    if (signal.aborted) throw e;
    if (e instanceof GroqError) return { ok: false, retryable: false, error: e };
    return { ok: false, retryable: true, error: new GroqError("upstream", e instanceof Error ? e.message : "Network error") };
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 2000);
    const status = res.status;
    if (status === 401 || status === 403 || /API_KEY_INVALID|API key not valid/i.test(detail)) {
      return { ok: false, retryable: false, error: new GroqError("bad_key", "Invalid Gemini API key.", status, detail) };
    }
    // Free-tier quota (per minute or per day): hand over to the next provider at once instead of waiting.
    if (status === 429) {
      return { ok: false, retryable: false, error: new GroqError("rate_limited", "Gemini rate limit reached. Try again in a moment.", status, detail) };
    }
    // A model that does not take a thinking level: ask again without one.
    if (status === 400 && thinking && /thinking/i.test(detail)) {
      return { ok: false, retryable: true, noThinking: true, error: new GroqError("upstream", "Gemini rejected the thinking setting.", status, detail) };
    }
    return { ok: false, retryable: status >= 500, error: new GroqError("upstream", `Gemini request failed (${status}).`, status, detail) };
  }

  const data = (await res.json().catch(() => null)) as Response_ | null;
  if (signal.aborted) throw new Error("aborted");
  const blocked = data?.promptFeedback?.blockReason;
  if (blocked) return { ok: false, retryable: false, error: new GroqError("upstream", `Gemini declined the request (${blocked}).`, 200) };
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  if (!text.trim()) return { ok: false, retryable: true, error: new GroqError("empty", "Empty response from Gemini.", 200) };
  return { ok: true, text };
}

/** One chat completion via Gemini (images included when opts.images is set). Retries once on server errors. */
export async function geminiChat(opts: GroqChatOptions, deps: GroqDeps = {}): Promise<string> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetch ?? fetch;
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new GroqError("not_configured", "Gemini is not configured. Set GEMINI_API_KEY.");
  const model = geminiModel(env);
  const timeoutMs = opts.timeoutMs && opts.timeoutMs > 0 ? opts.timeoutMs : geminiTimeout(env);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let thinking = true;
  let last: GroqError | null = null;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await callOnce(fetchImpl, apiKey, model, opts, thinking, controller.signal);
      if (result.ok) return result.text;
      last = result.error;
      if (!result.retryable) throw result.error;
      if (result.noThinking) thinking = false;
    }
  } catch (e) {
    if (controller.signal.aborted) {
      throw new GroqError("upstream", `Gemini took longer than ${Math.round(timeoutMs / 1000)}s.`, 408);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
  throw last ?? new GroqError("upstream", "Gemini request failed.");
}

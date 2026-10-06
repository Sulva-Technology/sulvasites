const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_FALLBACK_MODEL = "llama-3.3-70b-versatile";
const ATTEMPTS_PER_MODEL = 2;
// Free-tier token-per-minute limits ask for waits of 10-20s; honour them.
const MAX_BACKOFF_MS = 20000;

export type GroqErrorCode = "not_configured" | "bad_key" | "rate_limited" | "upstream" | "empty";

export class GroqError extends Error {
  code: GroqErrorCode;
  status: number;
  detail?: string;

  constructor(code: GroqErrorCode, message: string, status = 0, detail?: string) {
    super(message);
    this.name = "GroqError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export type GroqChatOptions = {
  system?: string;
  user: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
  /** OpenRouter only: per-call time limit, for turns that legitimately think for longer. */
  timeoutMs?: number;
  /** OpenRouter vision calls only: image URLs or data URLs shown to the model with the user text. */
  images?: string[];
};

export type GroqDeps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  env?: Record<string, string | undefined>;
};

type Completion = {
  choices?: Array<{ message?: { content?: string } }>;
};

type Attempt =
  | { ok: true; text: string }
  | { ok: false; error: GroqError; retryable: boolean; retryAfterMs?: number };

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function callOnce(
  fetchImpl: typeof fetch,
  apiKey: string,
  model: string,
  opts: GroqChatOptions,
): Promise<Attempt> {
  const messages: Array<{ role: string; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.user });

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.65,
    // gpt-oss reasoning tokens count against this budget.
    max_tokens: opts.maxTokens ?? 4096,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  if (opts.reasoningEffort && model.startsWith("openai/gpt-oss")) {
    body.reasoning_effort = opts.reasoningEffort;
  }

  let res: Response;
  try {
    res = await fetchImpl(GROQ_URL, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return {
      ok: false,
      retryable: true,
      error: new GroqError("upstream", e instanceof Error ? e.message : "Network error"),
    };
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 2000);
    const status = res.status;
    if (status === 401) {
      return {
        ok: false,
        retryable: false,
        error: new GroqError("bad_key", "Invalid Groq API key.", status, detail),
      };
    }
    const retryHeader = Number(res.headers?.get?.("retry-after"));
    // Groq also states the wait in the body: "Please try again in 16.26s".
    const bodyWait = Number(detail.match(/try again in ([\d.]+)s/i)?.[1]);
    const retryAfterMs =
      Number.isFinite(retryHeader) && retryHeader > 0
        ? retryHeader * 1000
        : Number.isFinite(bodyWait) && bodyWait > 0
          ? Math.ceil(bodyWait * 1000) + 250
          : undefined;
    if (status === 429) {
      return {
        ok: false,
        retryable: true,
        retryAfterMs,
        error: new GroqError("rate_limited", "Groq rate limit reached. Try again in a moment.", status, detail),
      };
    }
    // 5xx and "model not available" style 400/404 are worth a retry / fallback model.
    const modelProblem = (status === 400 || status === 404) && /model/i.test(detail);
    return {
      ok: false,
      retryable: status >= 500 || modelProblem,
      retryAfterMs,
      error: new GroqError("upstream", `Groq request failed (${status}).`, status, detail),
    };
  }

  const data = (await res.json().catch(() => null)) as Completion | null;
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) {
    return { ok: false, retryable: true, error: new GroqError("empty", "Empty response from Groq.", 200) };
  }
  return { ok: true, text };
}

export async function groqChat(opts: GroqChatOptions, deps: GroqDeps = {}): Promise<string> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? defaultSleep;

  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) {
    throw new GroqError(
      "not_configured",
      "Groq is not configured. Set GROQ_API_KEY in server environment variables. Get a free key at https://console.groq.com/",
    );
  }

  const primary = env.GROQ_MODEL || DEFAULT_MODEL;
  const fallback = env.GROQ_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
  const models = fallback && fallback !== primary ? [primary, fallback] : [primary];

  let lastError: GroqError | null = null;
  let rateLimited: GroqError | null = null;
  for (const model of models) {
    for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
      const result = await callOnce(fetchImpl, apiKey, model, opts);
      if (result.ok) return result.text;
      lastError = result.error;
      if (result.error.code === "rate_limited") rateLimited = result.error;
      if (!result.retryable) throw result.error;
      if (attempt < ATTEMPTS_PER_MODEL - 1) {
        const backoff = Math.min(result.retryAfterMs ?? 500 * 2 ** attempt, MAX_BACKOFF_MS);
        await sleep(backoff);
      }
    }
  }
  // A missing fallback model (404) must not hide the real problem, e.g. a rate limit on the primary.
  if (rateLimited && lastError?.status === 404) throw rateLimited;
  throw lastError ?? new GroqError("upstream", "Groq request failed.");
}

export function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new SyntaxError("Model did not return JSON.");
  }
  return JSON.parse(cleaned.slice(first, last + 1)) as unknown;
}

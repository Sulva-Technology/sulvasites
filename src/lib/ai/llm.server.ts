// Model routing for every AI feature (site builder, setup chat, rewrite, SEO, "Ask AI"):
// OpenRouter (Nemotron 3 Ultra by default) first, Groq as the automatic fallback when it is
// configured. Relative imports only (Node test runner).
import { GroqError, groqChat, type GroqChatOptions, type GroqDeps } from "./groq.server.ts";
import { openRouterChat, openRouterConfigured, openRouterModel } from "./openrouter.server.ts";

export type AiChatResult = { text: string; provider: "openrouter" | "groq"; model: string };

/**
 * Asks OpenRouter when OPENROUTER_API_KEY is set; if that fails for any reason (outage, rate limit,
 * no credit, bad key) and GROQ_API_KEY is also set, the same request goes to Groq so the owner still
 * gets an answer. With no OpenRouter key this is plain Groq, as before.
 */
export async function aiChatWithInfo(opts: GroqChatOptions, deps: GroqDeps = {}): Promise<AiChatResult> {
  const env = deps.env ?? process.env;
  const groqModel = env.GROQ_MODEL || "groq default";
  if (!openRouterConfigured(env)) {
    if (!env.GROQ_API_KEY) {
      throw new GroqError("not_configured", "AI is not configured. Set OPENROUTER_API_KEY in the server environment variables.");
    }
    return { text: await groqChat(opts, deps), provider: "groq", model: groqModel };
  }
  try {
    return { text: await openRouterChat(opts, deps), provider: "openrouter", model: openRouterModel(env) };
  } catch (e) {
    if (!env.GROQ_API_KEY) throw e;
    const why = e instanceof GroqError ? `${e.code}${e.status ? ` ${e.status}` : ""}` : "error";
    console.error(`OpenRouter failed (${why}); falling back to Groq.`);
    return { text: await groqChat(opts, deps), provider: "groq", model: groqModel };
  }
}

/** The text of one chat completion. Drop-in replacement for groqChat. */
export async function aiChat(opts: GroqChatOptions, deps: GroqDeps = {}): Promise<string> {
  return (await aiChatWithInfo(opts, deps)).text;
}

// Chat turn logic for the site assistant. Pure helpers plus one model call. Relative imports only.
import {
  extractContactFromText,
  guessBriefFromText,
  hasEnoughToBuild,
  mergeBrief,
  normalizeBrief,
  normalizeMessages,
  ownerText,
  verifyContact,
  type Brief,
  type ChatMessage,
} from "./brief.ts";
import { extractJson, type GroqChatOptions } from "./groq.server.ts";
import { aiChat } from "./llm.server.ts";
import { MAX_CHAT_QUESTIONS, buildChatPrompt } from "./prompts/builders.ts";
import { SAMPLING } from "./prompts/rules.ts";
import { chooseTemplateFallback } from "./templateChoice.ts";

export type ChatFn = (opts: GroqChatOptions) => Promise<string>;

export type AssistantTurn = {
  reply: string;
  state: Brief;
  ready: boolean;
  quickReplies: string[];
  suggestedTemplate?: { templateKey: string; reason: string };
};

const GO_RE = /\b(go ahead|just build|build it|build now|build my site|skip|that'?s all|that is all|nothing else|you decide|surprise me|proceed)\b/i;

/** How many assistant messages asked something. */
export function countQuestions(messages: ChatMessage[]): number {
  return messages.filter((m) => m.role === "assistant" && m.content.includes("?")).length;
}

export function wantsToProceed(messages: ChatMessage[]): boolean {
  const last = [...messages].reverse().find((m) => m.role === "user");
  return !!last && GO_RE.test(last.content);
}

/**
 * Server-side readiness rule so a chatty model cannot over-ask: ready once we have a name
 * and what the business does AND (the model agrees, or one more useful fact is known,
 * or the owner has answered twice, or the question budget is spent, or they said go).
 */
export function decideReady(state: Brief, messages: ChatMessage[], modelReady: boolean): boolean {
  if (!hasEnoughToBuild(state)) return false;
  const userTurns = messages.filter((m) => m.role === "user").length;
  const questions = countQuestions(messages);
  // A long pasted brief, bio or profile is a full brief: build instead of asking more.
  const longBrief = messages.some((m) => m.role === "user" && m.content.length >= 400);
  const extra =
    longBrief ||
    !!state.location || state.services.length > 0 || !!(state.contact.phone || state.contact.whatsapp || state.contact.email);
  return modelReady || extra || userTurns >= 2 || questions >= MAX_CHAT_QUESTIONS || wantsToProceed(messages);
}

function cleanReply(text: unknown): string {
  let r = typeof text === "string" ? text : "";
  r = r.replace(/[*_`#>]+/g, "").replace(/\s+/g, " ").trim();
  // At most two questions per reply.
  let q = 0;
  for (let i = 0; i < r.length; i++) {
    if (r[i] === "?" && ++q === 2) {
      r = r.slice(0, i + 1);
      break;
    }
  }
  return r.slice(0, 420);
}

export function cleanQuickReplies(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const t = typeof x === "string" ? x.replace(/[*_`#]+/g, "").trim() : "";
    if (t && t.length <= 40 && !out.includes(t)) out.push(t);
    if (out.length >= 4) break;
  }
  return out;
}

export function readyReply(state: Brief): string {
  const where = state.location ? ` in ${state.location}` : "";
  const what = state.whatTheyDo.replace(/[.!\s]+$/, "");
  return `Got it: ${state.businessName}${what ? `, ${what}` : ""}${where}. Next, add your logo, pick your colours and choose photos below — or skip any of them and I will choose.`;
}

export function fallbackReply(state: Brief): { reply: string; quickReplies: string[] } {
  if (!hasEnoughToBuild(state)) {
    return { reply: "Tell me your business name and what it does, in a sentence or two.", quickReplies: [] };
  }
  return {
    reply: "Where are you based, and what are your main services? A phone or WhatsApp number helps too, but you can skip.",
    quickReplies: ["Skip, build it"],
  };
}

/** Merges model state with prior state and re-checks contact details against what the owner typed. */
export function mergeState(prior: Brief, fromModel: Brief, messages: ChatMessage[]): Brief {
  const text = ownerText(messages);
  const merged = mergeBrief(prior, fromModel);
  const typed = extractContactFromText(text);
  merged.contact = verifyContact({ ...merged.contact }, text);
  for (const [k, v] of Object.entries(typed) as Array<[keyof Brief["contact"], string]>) {
    if (!merged.contact[k] && v) merged.contact[k] = v;
  }
  return merged;
}

export async function runAssistantTurn(
  args: { messages: unknown; state?: unknown },
  deps: { chat?: ChatFn } = {},
): Promise<AssistantTurn> {
  const chat = deps.chat ?? aiChat;
  const messages = normalizeMessages(args.messages);
  const prior = normalizeBrief(args.state);
  const questions = countQuestions(messages);
  const { system, user } = buildChatPrompt({ messages, state: prior, questionsAsked: questions });

  let parsed: Record<string, unknown> | null = null;
  const text = await chat({ system, user, json: true, ...SAMPLING.chat });
  try {
    const j = extractJson(text);
    parsed = j && typeof j === "object" ? (j as Record<string, unknown>) : null;
  } catch {
    parsed = null;
  }

  const state = mergeState(prior, normalizeBrief(parsed?.state), messages);
  // The model returned nothing usable (bad JSON, cut-off answer, over-cautious extraction): fall
  // back to the obvious reading of a pasted profile so the owner isn't asked what they already said.
  if (!hasEnoughToBuild(state)) {
    const guess = guessBriefFromText(ownerText(messages));
    if (guess.businessName && guess.whatTheyDo) {
      state.businessName ||= guess.businessName;
      state.whatTheyDo ||= guess.whatTheyDo;
    }
  }
  const ready = decideReady(state, messages, parsed?.ready === true);
  const suggestedTemplate = state.whatTheyDo || state.services.length
    ? (() => {
        const c = chooseTemplateFallback(state);
        return { templateKey: c.templateKey, reason: c.reason };
      })()
    : undefined;

  if (ready) return { reply: readyReply(state), state, ready: true, quickReplies: [], suggestedTemplate };

  let reply = cleanReply(parsed?.reply);
  let quickReplies = cleanQuickReplies(parsed?.quickReplies);
  if (!reply || !reply.includes("?")) {
    const fb = fallbackReply(state);
    reply = fb.reply;
    quickReplies = fb.quickReplies;
  }
  return { reply, state, ready: false, quickReplies, suggestedTemplate };
}

// One "Ask AI" turn, end to end on the server: native tool calling when a tool-calling model is
// configured (llm.server.ts toolCallingModel), else — or when that fails before proposing anything —
// the JSON-in-text path on the free-tier chain. Both return the same validated proposals; nothing is
// written here. The API route and the evaluation script both call this. Relative imports only.
import { extractJson } from "../groq.server.ts";
import { aiChatWithInfo, aiToolChat, assistantSeesImages, toolCallingModel } from "../llm.server.ts";
import { describeAttachments, enrichProductImages } from "../productImages.server.ts";
import { SAMPLING } from "../prompts/rules.ts";
import { effortFor, type AssistantMessage, type AssistantResult, type SiteSnapshot } from "../siteAssistant.ts";
import { runToolLoop } from "./loop.ts";
import { buildAgentPrompt, buildAssistantPrompt, type AttachmentNote } from "./prompt.ts";
import { preloadReads, type ReadEnv } from "./readTools.ts";
import { ProposalCollector, parseAssistantOutput } from "./writeTools.ts";
import type { Attachment } from "./types.ts";

type Env = Record<string, string | undefined>;

/** The model answered, but not with anything usable (e.g. broken JSON). */
export class AssistantOutputError extends Error {}

export type TurnMeta = {
  path: "tools" | "json";
  provider?: string;
  model?: string;
  steps?: number;
  reads?: string[];
  /** The tool-calling path failed and the JSON path answered instead. */
  fellBack?: boolean;
};

export type TurnInput = {
  snapshot: SiteSnapshot;
  messages: AssistantMessage[];
  focusPage?: string;
  attachments?: Attachment[];
  readEnv: ReadEnv;
  /** Epoch ms by which the turn must be finished. */
  deadline: number;
  env?: Env;
  fetch?: typeof fetch;
  /** Skip the stock-photo search for new products (tests and evaluation). */
  skipProductPhotos?: boolean;
};

/** Leave this much of the deadline for photo search after the model answers. */
const PHOTO_RESERVE_MS = 12_000;

function ownerTextOf(messages: AssistantMessage[]): string {
  return messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
}

async function notesFor(attachments: Attachment[], describe: boolean, env: Env, fetchImpl?: typeof fetch): Promise<AttachmentNote[]> {
  if (!attachments.length) return [];
  const seen = describe ? await describeAttachments(attachments, { env, fetch: fetchImpl }) : [];
  return attachments.map((a, i) => ({
    kind: a.kind,
    note: describe ? seen[i] || "(could not be looked at; ask the owner what it shows if it matters)" : undefined,
  }));
}

async function runTools(input: TurnInput, env: Env): Promise<AssistantResult & { meta: TurnMeta }> {
  const { snapshot, messages, focusPage, attachments = [], readEnv, deadline } = input;
  const seesImages = assistantSeesImages(env);
  const notes = await notesFor(attachments, !seesImages, env, input.fetch);
  const { system, user } = buildAgentPrompt({ snapshot, messages, focusPage, attachments: notes });
  const collector = new ProposalCollector(snapshot, ownerTextOf(messages));
  const last = messages[messages.length - 1]?.content ?? "";
  let served: { provider: string; model: string } | undefined;
  const loop = await runToolLoop({
    user: { role: "user", content: user, images: seesImages && attachments.length ? attachments.map((a) => a.url) : undefined },
    collector,
    readEnv,
    deadline: deadline - (input.skipProductPhotos ? 0 : PHOTO_RESERVE_MS),
    chat: async ({ messages: msgs, tools, final, timeoutMs }) => {
      const turn = await aiToolChat(
        { system, messages: msgs, tools, final, timeoutMs, maxTokens: SAMPLING.assistant.maxTokens, reasoningEffort: effortFor(last) },
        { env, fetch: input.fetch },
      );
      served = { provider: turn.provider, model: turn.model };
      return turn;
    },
  });
  return { ...collector.result(loop.reply), meta: { path: "tools", ...served, steps: loop.steps, reads: loop.reads } };
}

async function runJson(input: TurnInput, env: Env): Promise<AssistantResult & { meta: TurnMeta }> {
  const { snapshot, messages, focusPage, attachments = [], readEnv, deadline } = input;
  const last = messages[messages.length - 1]?.content ?? "";
  const [notes, preloaded] = await Promise.all([notesFor(attachments, true, env, input.fetch), preloadReads(readEnv, last)]);
  const { system, user } = buildAssistantPrompt({ snapshot, messages, focusPage, attachments: notes, preloaded });
  const reserve = input.skipProductPhotos ? 1000 : PHOTO_RESERVE_MS;
  const reply = await aiChatWithInfo(
    {
      system,
      user,
      json: true,
      task: "assistant",
      ...SAMPLING.assistant,
      reasoningEffort: effortFor(last),
      timeoutMs: Math.max(15_000, Math.min(38_000, deadline - Date.now() - reserve)),
    },
    { env, fetch: input.fetch },
  );
  let raw: unknown;
  try {
    raw = extractJson(reply.text);
  } catch {
    throw new AssistantOutputError("The AI gave a garbled answer.");
  }
  return { ...parseAssistantOutput(raw, snapshot, ownerTextOf(messages)), meta: { path: "json", provider: reply.provider, model: reply.model } };
}

export async function runAssistantTurn(input: TurnInput): Promise<AssistantResult & { meta: TurnMeta }> {
  const env = input.env ?? process.env;
  let result: AssistantResult & { meta: TurnMeta };
  if (toolCallingModel(env)) {
    try {
      result = await runTools(input, env);
    } catch (e) {
      // Nothing was proposed yet: the free-tier JSON path answers instead, if there is time.
      if (input.deadline - Date.now() < 20_000) throw e;
      console.error("Tool-calling assistant failed; using the JSON path:", e instanceof Error ? e.message : e);
      result = await runJson(input, env);
      result.meta.fellBack = true;
    }
  } else {
    result = await runJson(input, env);
  }
  if (!input.skipProductPhotos) {
    await enrichProductImages(result.actions, input.deadline - 1500, { env, fetch: input.fetch }, input.attachments ?? []);
  } else {
    // Still bind attached photos to the products that use them.
    await enrichProductImages(result.actions, 0, { env, fetch: input.fetch }, input.attachments ?? []);
  }
  return result;
}

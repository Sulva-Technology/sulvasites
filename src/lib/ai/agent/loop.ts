// The native tool-calling loop of the "Ask AI" assistant. Read tools run at once and their results go
// back to the model as delimited data; write tools never run: each call becomes a validated proposal
// in the ProposalCollector, which the owner approves (or skips) in the panel. The loop is bounded by a
// step count and a deadline. Pure: the model call is injected. Relative imports only.
import { delimitUserData } from "../prompts/rules.ts";
import { isReadTool, readToolSpecs, runReadTool, type ReadEnv } from "./readTools.ts";
import { isWriteTool, writeToolSpecs, type ProposalCollector } from "./writeTools.ts";
import type { ToolCall, ToolMessage, ToolSpec, ToolTurn } from "./types.ts";

export type ToolChat = (req: { messages: ToolMessage[]; tools: ToolSpec[]; final: boolean; timeoutMs: number }) => Promise<ToolTurn>;

export const MAX_STEPS = 6;
/** Tool calls handled per model turn; the rest are answered with "too many at once". */
const MAX_CALLS_PER_TURN = 40;
/** Below this, no new model turn is started. */
const MIN_TURN_MS = 4000;
/** With less than this left, the next turn is the last (text only). */
const FINAL_TURN_MS = 12000;
const MAX_READ_CHARS = 12000;

export type LoopResult = {
  reply: string;
  /** Model turns taken. */
  steps: number;
  /** Read tools called, in order. */
  reads: string[];
  /** Why the loop ended early, if it did. */
  stopped?: "steps" | "time" | "error";
};

function proposalNote(collector: ProposalCollector, call: ToolCall): string {
  const r = collector.propose(call.name, call.args);
  return r.ok
    ? `Proposed as change ${r.action.id} ("${r.action.summary}"). The owner will review it in the panel; it is not applied yet. Do not propose it again.`
    : r.reason;
}

export async function runToolLoop(args: {
  user: Extract<ToolMessage, { role: "user" }>;
  collector: ProposalCollector;
  readEnv: ReadEnv;
  chat: ToolChat;
  deadline: number;
  maxSteps?: number;
  now?: () => number;
}): Promise<LoopResult> {
  const { collector, readEnv, chat, deadline } = args;
  const maxSteps = args.maxSteps ?? MAX_STEPS;
  const now = args.now ?? Date.now;
  const tools = [...readToolSpecs(), ...writeToolSpecs()];
  const messages: ToolMessage[] = [args.user];
  const reads: string[] = [];
  let steps = 0;

  for (;;) {
    const left = deadline - now();
    if (left < MIN_TURN_MS) return { reply: "", steps, reads, stopped: "time" };
    const final = steps + 1 >= maxSteps || left < FINAL_TURN_MS;

    let turn: ToolTurn;
    try {
      turn = await chat({ messages, tools, final, timeoutMs: left - 1000 });
    } catch (e) {
      // Nothing yet: let the caller fall back to the JSON path. Otherwise keep what was proposed.
      if (steps === 0) throw e;
      return { reply: "", steps, reads, stopped: "error" };
    }
    steps++;

    if (!turn.calls.length) return { reply: turn.text, steps, reads };
    if (final) return { reply: turn.text, steps, reads, stopped: steps >= maxSteps ? "steps" : "time" };

    messages.push({ role: "assistant", content: turn.text, calls: turn.calls, providerData: turn.providerData });
    const handled = turn.calls.slice(0, MAX_CALLS_PER_TURN);
    // Reads run together; proposals are validated in the order the model made them.
    const results = await Promise.all(
      turn.calls.map(async (call, i): Promise<string> => {
        if (i >= handled.length) return "Too many tool calls at once. Make fewer per turn.";
        if (isReadTool(call.name)) {
          reads.push(call.name);
          return delimitUserData(`result of ${call.name}`, await runReadTool(call.name, call.args, readEnv), MAX_READ_CHARS);
        }
        return "";
      }),
    );
    turn.calls.forEach((call, i) => {
      let content = results[i]!;
      if (!content) content = isWriteTool(call.name) ? proposalNote(collector, call) : `There is no tool called "${call.name}".`;
      messages.push({ role: "tool", callId: call.id, name: call.name, content });
    });
  }
}

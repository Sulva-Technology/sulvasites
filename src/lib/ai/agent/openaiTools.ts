// OpenAI-style tool calling (the format OpenRouter speaks for Claude, GPT and the rest): request body
// and response parsing for the agent loop. Pure; relative imports only (Node test runner).
import type { ToolCall, ToolMessage, ToolSpec, ToolTurn } from "./types.ts";

export type ToolChatRequest = {
  system: string;
  messages: ToolMessage[];
  tools: ToolSpec[];
  maxTokens?: number;
  reasoningEffort?: "low" | "medium" | "high";
  /** Sent only when set: some models (e.g. current Claude) reject a custom temperature. */
  temperature?: number;
  /** Last turn of the loop: the model must answer in text, no more tool calls. */
  final?: boolean;
  timeoutMs?: number;
};

/** Fields echoed back on an assistant turn so the provider can continue its reasoning across tool calls. */
const ECHO_FIELDS = ["reasoning_details"] as const;

export function openAiMessages(system: string, messages: ToolMessage[]): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({
        role: "user",
        content: m.images?.length
          ? [{ type: "text", text: m.content }, ...m.images.map((url) => ({ type: "image_url", image_url: { url } }))]
          : m.content,
      });
    } else if (m.role === "assistant") {
      const msg: Record<string, unknown> = { role: "assistant", content: m.content || null };
      if (m.calls.length) {
        msg.tool_calls = m.calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.args) } }));
      }
      for (const k of ECHO_FIELDS) if (m.providerData?.[k] !== undefined) msg[k] = m.providerData[k];
      out.push(msg);
    } else {
      out.push({ role: "tool", tool_call_id: m.callId, content: m.content });
    }
  }
  return out;
}

export function openAiToolBody(model: string, req: ToolChatRequest, fallback: string | null = null): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: openAiMessages(req.system, req.messages),
    tools: req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } })),
    // "auto" only: current frontier models reject forced tool choice.
    tool_choice: req.final ? "none" : "auto",
    max_tokens: req.maxTokens ?? 8192,
    // Reasoning stays on and is returned, so it can be echoed back with the tool results.
    reasoning: { effort: req.reasoningEffort ?? "medium" },
  };
  if (typeof req.temperature === "number") body.temperature = req.temperature;
  if (fallback && fallback !== model) body.models = [model, fallback];
  // Owner business data is in these prompts: only providers that don't store or train on it.
  if (![model, fallback].some((m) => m?.endsWith(":free"))) body.provider = { data_collection: "deny" };
  return body;
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (p && typeof p === "object" && (p as { type?: unknown }).type === "text" ? String((p as { text?: unknown }).text ?? "") : ""))
      .join("");
  }
  return "";
}

function parseArgs(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** One model turn from a chat-completions response, or null when it has no usable message. */
export function parseOpenAiToolTurn(data: unknown): ToolTurn | null {
  const choice = (data as { choices?: Array<Record<string, unknown>> } | null)?.choices?.[0];
  const msg = choice?.message as Record<string, unknown> | undefined;
  if (!msg) return null;
  const rawCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
  const calls: ToolCall[] = [];
  rawCalls.forEach((c, i) => {
    const fn = (c as { function?: { name?: unknown; arguments?: unknown } })?.function;
    if (!fn || typeof fn.name !== "string" || !fn.name) return;
    const id = (c as { id?: unknown }).id;
    calls.push({ id: typeof id === "string" && id ? id : `call_${i + 1}`, name: fn.name.slice(0, 64), args: parseArgs(fn.arguments) });
  });
  const providerData: Record<string, unknown> = {};
  for (const k of ECHO_FIELDS) if (msg[k] !== undefined) providerData[k] = msg[k];
  return {
    text: textOf(msg.content).trim(),
    calls,
    providerData: Object.keys(providerData).length ? providerData : undefined,
    truncated: choice?.finish_reason === "length",
  };
}

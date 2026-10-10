// Shared shapes for the "Ask AI" agent: tool specs, tool calls and the provider-neutral message
// list the native tool-calling loop works with. Pure; relative imports only (Node test runner).

/** JSON Schema for a tool's arguments (the subset providers accept for function parameters). */
type JsonType = "object" | "string" | "number" | "integer" | "boolean" | "array" | "null";
export type JsonSchema = {
  /** One type, or several (e.g. ["number", "null"]). */
  type: JsonType | JsonType[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: Array<string | number>;
  additionalProperties?: boolean | JsonSchema;
};

/** What the model is told about one tool. */
export type ToolSpec = { name: string; description: string; parameters: JsonSchema };

export type ToolCall = { id: string; name: string; args: Record<string, unknown> };

/** Provider-neutral conversation for the tool loop. */
export type ToolMessage =
  | { role: "user"; content: string; images?: string[] }
  | { role: "assistant"; content: string; calls: ToolCall[]; providerData?: Record<string, unknown> }
  | { role: "tool"; callId: string; name: string; content: string };

/** One model turn: its text and any tool calls it made. */
export type ToolTurn = {
  text: string;
  calls: ToolCall[];
  /** Provider fields that must be sent back with this turn (e.g. reasoning details for tool use). */
  providerData?: Record<string, unknown>;
  /** True when the answer was cut off by the token limit. */
  truncated?: boolean;
};

/** What the owner attached to a message. Files are already in the site's storage folder. */
export type AttachmentKind = "logo" | "photo" | "document";
export type Attachment = { kind: AttachmentKind; url: string; name?: string };

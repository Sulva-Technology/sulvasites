// Read tools of the "Ask AI" assistant: data the model may look at before answering. They run at once
// (no approval needed) and never change anything. A tool-calling model calls them inside the agent
// loop; for free-tier models without tool calling, `preload` says when the result goes straight into
// the prompt instead. Results are always handed to the model as delimited data, never as instructions.
// Pure: data comes through ReadEnv, which the API route (or a test) supplies. Relative imports only.
import type { Overview } from "../../insights/overview.ts";
import { findPage, isRecord, renderPage, renderTraffic, type SiteSnapshot } from "../siteAssistant.ts";
import type { JsonSchema, ToolSpec } from "./types.ts";

/** Where read tools get their data. Each loader returns null when that data is unavailable. */
export type ReadEnv = {
  snapshot: SiteSnapshot;
  /** Visitor, inbox and sales summary for the last `days` days. */
  traffic: (days: number) => Promise<Overview | null>;
};

export type ReadTool = {
  name: string;
  description: string;
  parameters: JsonSchema;
  /** Heading for the preloaded block in a JSON-in-text prompt. */
  label: string;
  /** JSON-in-text path: "always" preloads it, a RegExp preloads it when the owner's latest message matches, "never" skips it. */
  preload: "always" | "never" | RegExp;
  run: (args: Record<string, unknown>, env: ReadEnv) => Promise<string>;
};

const TRAFFIC_DAYS = [7, 30, 90];

const getPage: ReadTool = {
  name: "get_page",
  description: "Read one page in full: every section with its text, images and links, plus its Google title and description.",
  parameters: { type: "object", properties: { page: { type: "string", description: "Page key, as shown in PAGE \"key\"." } }, required: ["page"], additionalProperties: false },
  label: "Page",
  preload: "never",
  async run(args, env) {
    const page = findPage(env.snapshot, args.page);
    if (!page) return `No page with the key ${JSON.stringify(String(args.page ?? "").slice(0, 40))}. Pages: ${env.snapshot.pages.map((p) => p.key).join(", ")}.`;
    return renderPage(page, env.snapshot.templateKey, true);
  },
};

const getTraffic: ReadTool = {
  name: "get_traffic",
  description: "Visitors, most visited pages, where visitors came from, devices, new enquiries and bookings, paid orders, revenue and best sellers.",
  parameters: { type: "object", properties: { days: { type: "integer", enum: TRAFFIC_DAYS, description: "How many days back: 7, 30 or 90." } }, additionalProperties: false },
  label: "Site traffic",
  preload: "always",
  async run(args, env) {
    const days = TRAFFIC_DAYS.includes(Number(args.days)) ? Number(args.days) : 30;
    return renderTraffic(await env.traffic(days));
  },
};

/** Every read tool, by name. */
export const READ_TOOLS: Record<string, ReadTool> = { get_page: getPage, get_traffic: getTraffic };

export function isReadTool(name: unknown): name is string {
  return typeof name === "string" && Object.hasOwn(READ_TOOLS, name);
}

export function readToolSpecs(): ToolSpec[] {
  return Object.values(READ_TOOLS).map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }));
}

/** Runs a read tool; failures come back as a short note the model can pass on, never as an exception. */
export async function runReadTool(name: string, args: unknown, env: ReadEnv): Promise<string> {
  const tool = READ_TOOLS[name];
  if (!tool) return `There is no tool called "${name.slice(0, 40)}".`;
  try {
    return await tool.run(isRecord(args) ? args : {}, env);
  } catch (e) {
    console.error(`assistant read tool ${name} failed:`, e instanceof Error ? e.message : e);
    return "This information could not be loaded right now.";
  }
}

/** The preloaded blocks for a JSON-in-text prompt, in registry order. */
export async function preloadReads(env: ReadEnv, lastMessage: string): Promise<Array<{ name: string; label: string; text: string }>> {
  const due = Object.values(READ_TOOLS).filter((t) => t.preload === "always" || (t.preload instanceof RegExp && t.preload.test(lastMessage)));
  return Promise.all(due.map(async (t) => ({ name: t.name, label: t.label, text: await runReadTool(t.name, {}, env) })));
}

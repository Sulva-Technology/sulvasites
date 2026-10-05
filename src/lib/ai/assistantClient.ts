// Browser-side helpers for the site assistant: chat turns and the staged build protocol.
// Each build stage is its own request so every call stays inside serverless time limits.
import { ensureSession } from "@/lib/supabase/browser";
import type { Brief, ChatMessage } from "@/lib/ai/brief";
import type { BuildResult, PageResult, SitePlan, SiteProfile } from "@/lib/ai/siteBuilder";

export type { Brief, ChatMessage, BuildResult, SitePlan };

export type ChatTurn = {
  reply: string;
  state: Brief;
  ready: boolean;
  quickReplies: string[];
  suggestedTemplate?: { templateKey: string; reason: string };
};

async function post<T>(url: string, body: unknown): Promise<T> {
  const session = await ensureSession();
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    throw new Error(json && typeof json.error === "string" ? json.error : `Request failed (${res.status}).`);
  }
  return json as T;
}

export function sendChat(messages: ChatMessage[], state: Brief | null): Promise<ChatTurn> {
  return post<ChatTurn>("/api/ai/assistant/chat", { messages, state });
}

export type BuildProgress = { stage: string; label: string; step: number; total: number };

const BUILD_URL = "/api/ai/assistant/build";

/**
 * Runs plan -> profile -> every page -> finish, reporting progress between requests.
 * Pass `plan` to reuse an earlier plan (for example after the user picked another template).
 */
export async function runStagedBuild(
  input: { messages?: ChatMessage[]; state?: Brief | null; templateOverride?: string | null; plan?: SitePlan },
  onProgress: (p: BuildProgress) => void,
): Promise<{ plan: SitePlan; result: BuildResult }> {
  const steps = input.plan ? 0 : 1;
  let plan = input.plan;
  let total = steps + 3;
  let step = 0;
  const report = (stage: string, label: string) => onProgress({ stage, label, step: ++step, total });

  if (!plan) {
    report("plan", "Choosing the best template…");
    plan = (await post<{ plan: SitePlan }>(BUILD_URL, { stage: "plan", messages: input.messages, state: input.state, templateOverride: input.templateOverride })).plan;
  } else if (input.templateOverride && input.templateOverride !== plan.templateKey) {
    plan = { ...plan, templateKey: input.templateOverride, source: "user", reason: "Template chosen by you." };
    // page list depends on the template; the server recomputes it from the key
    plan = (await post<{ plan: SitePlan }>(BUILD_URL, { stage: "plan", state: plan.brief, templateOverride: input.templateOverride })).plan;
  }
  total = steps + 1 + plan.pages.length + 1;

  report("profile", "Writing your business profile…");
  const { profile } = await post<{ profile: SiteProfile }>(BUILD_URL, { stage: "profile", plan });

  const results: PageResult[] = [];
  const avoid: string[] = [];
  for (const p of plan.pages) {
    report(`page:${p.key}`, `Writing ${p.label.toLowerCase()}…`);
    const { result } = await post<{ result: PageResult }>(BUILD_URL, { stage: "page", plan, key: p.key, avoid });
    results.push(result);
    const hero = result.data.sections.find((s) => s.type === "hero");
    if (hero && hero.type === "hero" && p.kind === "core") avoid.push(hero.headline);
  }

  report("finish", "Adding photos and polishing…");
  const built = await post<BuildResult>(BUILD_URL, { stage: "finish", plan, profile, results });
  return { plan, result: built };
}

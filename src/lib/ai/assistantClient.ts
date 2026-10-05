// Browser-side helpers for the site assistant: chat turns and the staged build protocol.
// Each build stage is its own request so every call stays inside serverless time limits.
import { ensureSession } from "@/lib/supabase/browser";
import type { Brief, ChatMessage } from "@/lib/ai/brief";
import type { BuildResult, PageResult, SitePlan, SiteProfile } from "@/lib/ai/siteBuilder";
import type { ImageRef } from "@/lib/ai/setupPhotos";

export type { Brief, ChatMessage, BuildResult, SitePlan };

export type ChatTurn = {
  reply: string;
  state: Brief;
  ready: boolean;
  quickReplies: string[];
  suggestedTemplate?: { templateKey: string; reason: string };
};

const MAX_AUTO_WAIT_SECONDS = 40;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** POST with the admin session. Retries rate-limit (429) answers after the advertised wait. */
async function post<T>(url: string, body: unknown, onWait?: (seconds: number) => void): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const session = await ensureSession();
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (res.ok) return json as T;
    const wait = Number(res.headers.get("retry-after"));
    if (res.status === 429 && attempt < 5 && Number.isFinite(wait) && wait > 0 && wait <= MAX_AUTO_WAIT_SECONDS) {
      onWait?.(wait);
      await sleep(wait * 1000 + 500);
      continue;
    }
    throw new Error(json && typeof json.error === "string" ? json.error : `Request failed (${res.status}).`);
  }
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
  input: {
    messages?: ChatMessage[];
    state?: Brief | null;
    templateOverride?: string | null;
    plan?: SitePlan;
    /** Owner photo choices: uploads become "upload:N" slots, preferred stock goes next. */
    images?: { preferred: ImageRef[]; uploadSlots: number };
  },
  onProgress: (p: BuildProgress) => void,
): Promise<{ plan: SitePlan; result: BuildResult }> {
  const steps = input.plan ? 0 : 1;
  let plan = input.plan;
  let total = steps + 3;
  let step = 0;
  let current = { stage: "start", label: "Starting…" };
  const report = (stage: string, label: string) => {
    current = { stage, label };
    onProgress({ stage, label, step: ++step, total });
  };
  const onWait = (s: number) =>
    onProgress({ stage: current.stage, label: `The AI is busy, retrying in ${Math.ceil(s)}s…`, step, total });

  if (!plan) {
    report("plan", "Choosing the best template…");
    plan = (await post<{ plan: SitePlan }>(BUILD_URL, { stage: "plan", messages: input.messages, state: input.state, templateOverride: input.templateOverride }, onWait)).plan;
  } else if (input.templateOverride && input.templateOverride !== plan.templateKey) {
    plan = { ...plan, templateKey: input.templateOverride, source: "user", reason: "Template chosen by you." };
    // page list depends on the template; the server recomputes it from the key
    plan = (await post<{ plan: SitePlan }>(BUILD_URL, { stage: "plan", state: plan.brief, templateOverride: input.templateOverride }, onWait)).plan;
  }
  total = steps + 1 + plan.pages.length + 1;

  report("profile", "Writing your business profile…");
  const { profile } = await post<{ profile: SiteProfile }>(BUILD_URL, { stage: "profile", plan }, onWait);

  const results: PageResult[] = [];
  const avoid: string[] = [];
  for (const p of plan.pages) {
    report(`page:${p.key}`, `Writing ${p.label.toLowerCase()}…`);
    const { result } = await post<{ result: PageResult }>(BUILD_URL, { stage: "page", plan, key: p.key, avoid }, onWait);
    results.push(result);
    const hero = result.data.sections.find((s) => s.type === "hero");
    if (hero && hero.type === "hero" && p.kind === "core") avoid.push(hero.headline);
  }

  report("finish", "Adding photos and polishing…");
  const built = await post<BuildResult>(
    BUILD_URL,
    {
      stage: "finish",
      plan,
      profile,
      results,
      uploadSlots: input.images?.uploadSlots ?? 0,
      preferredImages: input.images?.preferred ?? [],
    },
    onWait,
  );
  return { plan, result: built };
}

// Short "cooling down" memory per AI provider. A provider that just ran out of quota or timed out is
// skipped by llm.server.ts for a little while, so requests go straight to one that can answer instead
// of paying a full timeout first. In-memory and per server instance: it only saves wasted calls.
// Relative imports only (Node test runner).
import { GroqError } from "./groq.server.ts";

export type HealthProvider = "gemini" | "openrouter" | "groq";

const RATE_LIMIT_DEFAULT_MS = 30_000;
const RATE_LIMIT_MAX_MS = 300_000;
const FAILURE_MS = 10_000;

const coolingUntil = new Map<HealthProvider, number>();

/** How long to rest a provider after this error. 0 for errors a rest will not fix (bad key, bad request). */
export function cooldownMsFor(err: unknown): number {
  if (!(err instanceof GroqError)) return FAILURE_MS;
  if (err.code === "rate_limited") {
    const wait = Number(err.detail?.match(/try again in ([\d.]+)s/i)?.[1]);
    return Number.isFinite(wait) && wait > 0 ? Math.min(Math.round(wait * 1000), RATE_LIMIT_MAX_MS) : RATE_LIMIT_DEFAULT_MS;
  }
  if (err.code === "upstream" && (err.status === 0 || err.status === 408 || err.status >= 500)) return FAILURE_MS;
  return 0;
}

export function noteFailure(p: HealthProvider, err: unknown, now: number = Date.now()): void {
  const ms = cooldownMsFor(err);
  if (ms > 0) coolingUntil.set(p, Math.max(coolingUntil.get(p) ?? 0, now + ms));
}

export function noteSuccess(p: HealthProvider): void {
  coolingUntil.delete(p);
}

export function isCooling(p: HealthProvider, now: number = Date.now()): boolean {
  return (coolingUntil.get(p) ?? 0) > now;
}

/** Tests only. */
export function resetProviderHealth(): void {
  coolingUntil.clear();
}

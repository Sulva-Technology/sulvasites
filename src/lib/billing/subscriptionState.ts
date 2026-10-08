// Subscription status rules shared by the webhook, cron, gates and UI. Pure: relative imports only.
// isLive() must match public.site_billing_state() in supabase/migrations/019_billing.sql.

export type SubStatus = "trialing" | "active" | "past_due" | "cancelling" | "paused" | "archived" | "manual";

export const SUB_STATUSES: readonly SubStatus[] = ["trialing", "active", "past_due", "cancelling", "paused", "archived", "manual"];

export type SubSnapshot = {
  status: SubStatus;
  tier: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  grace_ends_at: string | null;
  paused_at: string | null;
  blocked: boolean;
};

export const DAY_MS = 86_400_000;
export const GRACE_DAYS = 3;
export const ARCHIVE_AFTER_PAUSE_DAYS = 30;

const ALLOWED: Record<SubStatus, readonly SubStatus[]> = {
  trialing: ["active", "paused"],
  active: ["past_due", "cancelling", "paused"],
  past_due: ["active", "paused"],
  cancelling: ["active", "paused"],
  paused: ["active", "archived"],
  archived: ["active", "paused"],
  manual: [],
};

export function isSubStatus(v: unknown): v is SubStatus {
  return typeof v === "string" && (SUB_STATUSES as readonly string[]).includes(v);
}

export function canTransition(from: SubStatus, to: SubStatus): boolean {
  return ALLOWED[from].includes(to);
}

function ms(iso: string | null): number {
  return iso ? Date.parse(iso) : NaN;
}

function after(iso: string | null, now: number): boolean {
  const t = ms(iso);
  return Number.isFinite(t) && t > now;
}

export function isLive(s: SubSnapshot, now: number): boolean {
  if (s.blocked) return false;
  switch (s.status) {
    case "manual":
    case "active":
      return true;
    case "trialing":
      return after(s.trial_ends_at, now);
    case "past_due":
      return after(s.grace_ends_at, now);
    case "cancelling":
      return after(s.current_period_end, now);
    default:
      return false;
  }
}

/** The status the daily sweep moves a subscription to, or null to leave it alone. */
export function sweepStatus(s: SubSnapshot, now: number): SubStatus | null {
  switch (s.status) {
    case "trialing":
      return after(s.trial_ends_at, now) ? null : "paused";
    case "past_due":
      return after(s.grace_ends_at, now) ? null : "paused";
    case "cancelling":
      return after(s.current_period_end, now) ? null : "paused";
    case "paused": {
      const p = ms(s.paused_at);
      return Number.isFinite(p) && now - p >= ARCHIVE_AFTER_PAUSE_DAYS * DAY_MS ? "archived" : null;
    }
    default:
      return null;
  }
}

/** Statuses that block an account from starting another site. */
export function isUnpaid(status: SubStatus): boolean {
  return status === "trialing" || status === "past_due" || status === "paused";
}

export function daysLeft(iso: string | null, now: number): number {
  const t = ms(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.ceil((t - now) / DAY_MS));
}

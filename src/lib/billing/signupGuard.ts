// Free-trial abuse rules. Hard denials are rare; everything else only flags for admin review. Pure.
import { isUnpaid, type SubStatus } from "./subscriptionState.ts";

export type PriorSignals = {
  emailTrials: number;
  phoneTrials: number;
  deviceTrials: number;
  businessMatches: number;
  ipLastHour: number;
  ipLastDay: number;
};

export type GuardResult = { allow: true; flags: string[] } | { allow: false; status: number; error: string };

export const IP_HOURLY_LIMIT = 5;

export function evaluateTrialSignup(input: { email: string | null; disposable: boolean; prior: PriorSignals }): GuardResult {
  const { prior } = input;
  if (!input.email) return { allow: false, status: 400, error: "Enter a valid email address." };
  if (input.disposable) {
    return { allow: false, status: 400, error: "Please use a permanent email address, not a temporary inbox." };
  }
  if (prior.ipLastHour >= IP_HOURLY_LIMIT) {
    return { allow: false, status: 429, error: "Too many new sites from this network. Try again in an hour." };
  }
  if (prior.emailTrials > 0) {
    return { allow: false, status: 409, error: "This email has already used its free trial. Sign in to continue with your site." };
  }
  const flags: string[] = [];
  if (prior.phoneTrials > 0) flags.push("phone_reused");
  if (prior.deviceTrials > 0) flags.push("device_reused");
  if (prior.businessMatches > 0) flags.push("business_match");
  if (prior.ipLastDay > 0) flags.push("ip_repeat");
  return { allow: true, flags };
}

export type SiteStartDecision = { ok: true; trial: boolean } | { ok: false; error: string };

/** One unpaid site per account. Only an account's very first site (archived ones count) gets a trial. */
export function canStartSite(owned: Array<{ status: SubStatus; businessName?: string | null }>): SiteStartDecision {
  const blocking = owned.find((o) => isUnpaid(o.status));
  if (blocking) {
    return { ok: false, error: `Activate ${blocking.businessName || "your current site"} before adding another site.` };
  }
  return { ok: true, trial: owned.length === 0 };
}

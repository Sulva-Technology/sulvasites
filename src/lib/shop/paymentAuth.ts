/**
 * Pure authorization rules for the shop payment-settings route. Relative imports only (unit-tested).
 * Sulvatech admins may do everything. Shop owners may change payout bank / own keys (with password
 * re-confirmation) but never the platform fee. Staff never reach this route.
 */
import type { PaymentSettingsInput } from "./paymentInput.ts";

export type PaymentActor = "admin" | "owner";
export type PaymentChange = { kind: "update"; input: PaymentSettingsInput } | { kind: "remove_keys" };

export type PaymentAuthz =
  | { ok: true; needsPassword: boolean; sensitive: boolean }
  | { ok: false; status: 403; error: string };

/** Bank-account or key changes: the payout-takeover vectors. */
export function isSensitiveChange(change: PaymentChange): boolean {
  if (change.kind === "remove_keys") return true;
  return Boolean(change.input.platform || change.input.ownKeys);
}

export function authorizePaymentChange(role: PaymentActor, change: PaymentChange): PaymentAuthz {
  const sensitive = isSensitiveChange(change);
  if (role === "admin") return { ok: true, needsPassword: false, sensitive };
  if (change.kind === "update" && change.input.platformFeeBps !== undefined) {
    return { ok: false, status: 403, error: "Only Sulvatech can change the platform fee." };
  }
  return { ok: true, needsPassword: sensitive, sensitive };
}

const MAX_PASSWORD_CHARS = 256;

/** Password from a request body (`password` field); null when absent, empty or not a string. */
export function readPassword(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const p = (body as Record<string, unknown>).password;
  if (typeof p !== "string" || p.length === 0 || p.length > MAX_PASSWORD_CHARS) return null;
  return p;
}

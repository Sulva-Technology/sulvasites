// Parses Paystack webhook payloads for subscription billing. Pure: relative imports only.
// Renewals are taken from invoice.update (it names the subscription); renewal charge.success events
// carry no reference of ours and fall through to the shop handler, which ignores them.
import type { Interval } from "../marketing/pricing.ts";
import { isBillingReference } from "./reference.ts";

export type BillingEvent =
  | {
      kind: "first_charge";
      reference: string;
      amountKobo: number;
      currency: string;
      customerCode: string | null;
      authorizationCode: string | null;
      reusable: boolean;
      siteId: string | null;
      planId: string | null;
      email: string | null;
    }
  | { kind: "invoice_paid"; key: string; subscriptionCode: string; nextPaymentDate: string | null; amountKobo: number }
  | { kind: "payment_failed"; key: string; subscriptionCode: string }
  | { kind: "not_renew"; key: string; subscriptionCode: string }
  | { kind: "disabled"; key: string; subscriptionCode: string }
  | { kind: "ignore" };

type Obj = Record<string, unknown>;

function obj(v: unknown): Obj | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function metadataOf(data: Obj | null): Obj | null {
  const m = data?.metadata;
  if (typeof m === "string") {
    try {
      return obj(JSON.parse(m));
    } catch {
      return null;
    }
  }
  return obj(m);
}

/** True when the platform webhook should hand this event to billing instead of the shop. */
export function isBillingWebhook(event: unknown): boolean {
  const e = obj(event);
  const name = str(e?.event);
  if (!name) return false;
  if (name.startsWith("subscription.") || name.startsWith("invoice.")) return true;
  if (name === "charge.success") {
    const data = obj(e?.data);
    return isBillingReference(data?.reference) || metadataOf(data)?.kind === "subscription";
  }
  return false;
}

export function parseBillingEvent(event: unknown): BillingEvent {
  const e = obj(event);
  const name = str(e?.event);
  const data = obj(e?.data);
  if (!name || !data) return { kind: "ignore" };

  if (name === "charge.success") {
    const reference = data.reference;
    if (!isBillingReference(reference)) return { kind: "ignore" };
    const auth = obj(data.authorization);
    const cust = obj(data.customer);
    const meta = metadataOf(data);
    return {
      kind: "first_charge",
      reference,
      amountKobo: num(data.amount) ?? 0,
      currency: str(data.currency) ?? "",
      customerCode: str(cust?.customer_code),
      authorizationCode: str(auth?.authorization_code),
      reusable: auth?.reusable === true,
      siteId: str(meta?.siteId),
      planId: str(meta?.planId),
      email: str(cust?.email),
    };
  }

  const sub = name.startsWith("invoice.") ? obj(data.subscription) : data;
  const code = str(sub?.subscription_code);
  if (!code) return { kind: "ignore" };
  const invoice = str(data.invoice_code) ?? `${code}:${str(data.period_end) ?? ""}`;

  switch (name) {
    case "invoice.update":
      if (!(data.paid === true || data.status === "success")) return { kind: "ignore" };
      return {
        kind: "invoice_paid",
        key: `invoice:${invoice}`,
        subscriptionCode: code,
        nextPaymentDate: str(sub?.next_payment_date),
        amountKobo: num(data.amount) ?? 0,
      };
    case "invoice.payment_failed":
      return { kind: "payment_failed", key: `failed:${invoice}`, subscriptionCode: code };
    case "subscription.not_renew":
      return { kind: "not_renew", key: `not_renew:${code}`, subscriptionCode: code };
    case "subscription.disable":
      return { kind: "disabled", key: `disable:${code}`, subscriptionCode: code };
    default:
      return { kind: "ignore" };
  }
}

export function addInterval(d: Date, interval: Interval): Date {
  const r = new Date(d.getTime());
  if (interval === "annually") r.setUTCFullYear(r.getUTCFullYear() + 1);
  else r.setUTCMonth(r.getUTCMonth() + 1);
  return r;
}

/** End of the period just paid for: it starts after any trial or already-paid time, so no days are lost. */
export function subscriptionStartDate(
  now: Date,
  trialEndsAt: string | null,
  currentPeriodEnd: string | null,
  interval: Interval,
): Date {
  const candidates = [now.getTime()];
  for (const iso of [trialEndsAt, currentPeriodEnd]) {
    const t = iso ? Date.parse(iso) : NaN;
    if (Number.isFinite(t)) candidates.push(t);
  }
  return addInterval(new Date(Math.max(...candidates)), interval);
}

import type { OrderPaymentState, OrderStatus } from "./types.ts";

const STATES: OrderPaymentState[] = ["paid", "pending", "failed", "cancelled", "refund_pending"];

export type VerifyResult =
  | { ok: true; order: OrderStatus }
  | { ok: false; notFound: boolean; error: string };

/** True once the payment state can no longer change on its own (stop polling). */
export function isFinalPayment(p: OrderPaymentState): boolean {
  return p !== "pending";
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function parseOrderStatus(data: unknown): OrderStatus | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (typeof o.reference !== "string") return null;
  if (!STATES.includes(o.payment as OrderPaymentState)) return null;
  const items = Array.isArray(o.items) ? o.items : [];
  return {
    reference: o.reference,
    payment: o.payment as OrderPaymentState,
    status: typeof o.status === "string" ? o.status : "",
    firstName: typeof o.firstName === "string" ? o.firstName : "",
    deliveryMethod: o.deliveryMethod === "pickup" ? "pickup" : "delivery",
    subtotalKobo: num(o.subtotalKobo),
    deliveryKobo: num(o.deliveryKobo),
    totalKobo: num(o.totalKobo),
    items: items
      .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
      .map((i) => ({
        name: typeof i.name === "string" ? i.name : "",
        variantLabel: typeof i.variantLabel === "string" ? i.variantLabel : null,
        unitKobo: num(i.unitKobo),
        quantity: num(i.quantity),
        lineTotalKobo: num(i.lineTotalKobo),
      })),
  };
}

/** One call to GET /api/shop/[siteId]/orders/[reference]/verify. */
export async function verifyOrder(
  siteId: string,
  reference: string,
  doFetch: typeof fetch = (...a) => fetch(...a),
): Promise<VerifyResult> {
  try {
    const res = await doFetch(
      `/api/shop/${encodeURIComponent(siteId)}/orders/${encodeURIComponent(reference)}/verify`,
      { cache: "no-store" },
    );
    if (res.status === 404) return { ok: false, notFound: true, error: "We could not find this order." };
    if (!res.ok) return { ok: false, notFound: false, error: "Could not check this order. Please try again." };
    const order = parseOrderStatus(await res.json());
    if (!order) return { ok: false, notFound: false, error: "Unexpected response. Please try again." };
    return { ok: true, order };
  } catch {
    return { ok: false, notFound: false, error: "Network error. Please try again." };
  }
}

export type PollOptions = {
  fetch?: typeof fetch;
  intervalMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
  onUpdate?: (r: VerifyResult, attempt: number) => void;
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Polls verify until the payment is final (paid/failed/cancelled/refund_pending), the order is
 * not found, the attempts run out (returns the last result, still "pending") or it is aborted.
 * Transient errors keep polling; the last result is returned if attempts run out.
 */
export async function pollOrder(
  siteId: string,
  reference: string,
  opts: PollOptions = {},
): Promise<VerifyResult | null> {
  const interval = opts.intervalMs ?? 3000;
  const max = opts.maxAttempts ?? 20;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let last: VerifyResult | null = null;
  for (let attempt = 1; attempt <= max; attempt++) {
    if (opts.signal?.aborted) return last;
    last = await verifyOrder(siteId, reference, opts.fetch);
    opts.onUpdate?.(last, attempt);
    if (last.ok && isFinalPayment(last.order.payment)) return last;
    if (!last.ok && last.notFound) return last;
    if (attempt < max) await sleep(interval);
  }
  return last;
}

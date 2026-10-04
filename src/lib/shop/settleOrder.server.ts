import type { SupabaseClient } from "@supabase/supabase-js";
import { paystackRequest, PaystackError } from "./paystack.server";
import { getShopPaymentConfig, type ShopPaymentMode } from "./shopSecrets.server";

export type SettleableOrder = {
  id: string;
  site_id: string;
  reference: string;
  payment_mode: string | null;
};

export type SettleResult =
  | { kind: "paid" } // newly marked paid
  | { kind: "already_paid" }
  | { kind: "not_success"; paystackStatus: string } // abandoned / failed / ongoing
  | { kind: "not_started" } // Paystack has no such transaction yet
  | { kind: "flagged"; reason: "amount_mismatch" | "paid_after_cancel" | "reference_mismatch" | "not_pending" | "not_found" | "verify_mismatch" }
  | { kind: "unconfigured" }; // order's payment mode has no usable config

type VerifyData = {
  status?: unknown;
  reference?: unknown;
  amount?: unknown;
  currency?: unknown;
};

/**
 * Re-verifies a transaction with Paystack (using the secret for the order's snapshot payment mode,
 * not the shop's current mode) and, if it genuinely succeeded, calls `mark_order_paid`.
 *
 * Throws on infrastructure failures (Paystack 5xx/timeouts, DB errors, missing server env) so callers
 * can respond 5xx and let Paystack retry. Paystack 4xx for an unknown transaction => `not_started`.
 * Never logs secrets; logs only order id/reference and outcomes.
 */
export async function settleOrder(db: SupabaseClient, order: SettleableOrder): Promise<SettleResult> {
  const mode = order.payment_mode;
  if (mode !== "platform" && mode !== "own_keys") return { kind: "unconfigured" };

  const cfg = await getShopPaymentConfig(order.site_id, mode as ShopPaymentMode);
  if (!cfg) return { kind: "unconfigured" };
  const secret = cfg.mode === "platform" ? cfg.platformSecret : cfg.secret;

  let tx: VerifyData;
  try {
    tx = await paystackRequest<VerifyData>(`/transaction/verify/${encodeURIComponent(order.reference)}`, { secret });
  } catch (err) {
    if (err instanceof PaystackError && err.status >= 400 && err.status < 500 && err.status !== 429) {
      return { kind: "not_started" };
    }
    throw err;
  }

  const status = typeof tx?.status === "string" ? tx.status : "unknown";
  if (status !== "success") return { kind: "not_success", paystackStatus: status };

  if (tx.reference !== order.reference) {
    console.warn("[shop] verify reference differs from order", { order: order.id });
    return { kind: "flagged", reason: "verify_mismatch" };
  }

  // Wrong currency or non-integer amount => pass null so the DB flags amount_mismatch.
  const amount =
    tx.currency === "NGN" && typeof tx.amount === "number" && Number.isSafeInteger(tx.amount) && tx.amount >= 0
      ? tx.amount
      : null;

  const { data, error } = await db.rpc("mark_order_paid", {
    p_order: order.id,
    p_paystack_ref: order.reference,
    p_amount_kobo: amount,
  });
  if (error) throw new Error("Could not record payment");

  switch (data) {
    case "paid":
      return { kind: "paid" };
    case "already_paid":
      return { kind: "already_paid" };
    case "paid_after_cancel":
    case "reference_mismatch":
    case "amount_mismatch":
    case "not_pending":
    case "not_found":
      console.warn("[shop] payment needs attention", { order: order.id, reference: order.reference, result: data });
      return { kind: "flagged", reason: data };
    default:
      throw new Error("Unexpected payment result");
  }
}

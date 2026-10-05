/**
 * Paystack key identity snapshot stored on orders (orders.paystack_key_ref).
 * 'platform' for orders paid through the platform account, or the last four characters of the
 * shop's own secret key. Lets settlement detect that the shop rotated its keys after checkout,
 * instead of verifying the order against a different Paystack account. Relative imports only.
 */

export const PLATFORM_KEY_REF = "platform";

export function keyRefFor(mode: "platform" | "own_keys", ownSecret?: string | null): string {
  if (mode === "platform") return PLATFORM_KEY_REF;
  const s = typeof ownSecret === "string" ? ownSecret : "";
  return s.slice(-4);
}

/**
 * True when an order's snapshot is compatible with the key currently configured.
 * Orders without a snapshot (created before migration 010) are allowed through.
 */
export function keyRefMatches(orderRef: string | null | undefined, currentRef: string): boolean {
  if (orderRef === null || orderRef === undefined || orderRef === "") return true;
  return orderRef === currentRef;
}

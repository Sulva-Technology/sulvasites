import { decryptSecret } from "./secretBox";
import { canonicalSiteId } from "./paymentInput";
import { requireServiceClient, SHOP_NOT_CONFIGURED } from "./serviceClient.server";

export type ShopPaymentMode = "platform" | "own_keys";

/**
 * `publicKey` is null only when a specific mode was requested (e.g. `own_keys` for an order created
 * before the shop switched to platform mode, which clears the stored public key). Server-side
 * verification does not need it.
 */
export type ShopPaymentConfig =
  | { mode: "platform"; subaccountCode: string; platformSecret: string }
  | { mode: "own_keys"; secret: string; publicKey: string | null };

/** Thrown when server env (service role, PAYSTACK_SECRET_KEY, SHOP_SECRETS_KEY) is missing or broken. */
export class ShopPaymentsNotConfiguredError extends Error {
  constructor() {
    super(SHOP_NOT_CONFIGURED);
    this.name = "ShopPaymentsNotConfiguredError";
  }
}

/**
 * Server-only. Resolves how a shop takes payments, with the secret needed to talk to Paystack.
 *
 * - No `mode`: uses the shop's current `payment_mode`; null when unset or incomplete.
 * - With `mode` (verify/webhook pass `orders.payment_mode`): returns that mode's config regardless
 *   of the current mode; null when that mode's data is missing.
 *
 * Never log the returned value.
 */
export async function getShopPaymentConfig(
  siteIdInput: string,
  mode?: ShopPaymentMode,
): Promise<ShopPaymentConfig | null> {
  const siteId = canonicalSiteId(siteIdInput);
  if (!siteId) return null;

  const db = requireServiceClient();
  if (!db) throw new ShopPaymentsNotConfiguredError();

  const { data: settings, error } = await db
    .from("shop_settings")
    .select("payment_mode, paystack_public_key")
    .eq("site_id", siteId)
    .maybeSingle();
  if (error) throw new Error("Could not load shop settings");

  const effectiveMode: ShopPaymentMode | null =
    mode ?? ((settings?.payment_mode as ShopPaymentMode | null | undefined) ?? null);
  if (effectiveMode !== "platform" && effectiveMode !== "own_keys") return null;
  const publicKey = (settings?.paystack_public_key as string | null | undefined) ?? null;

  const { data: secrets, error: secretsError } = await db
    .from("shop_payment_secrets")
    .select("subaccount_code, secret_key_ciphertext")
    .eq("site_id", siteId)
    .maybeSingle();
  if (secretsError) throw new Error("Could not load shop payment secrets");
  if (!secrets) return null;

  if (effectiveMode === "platform") {
    const subaccountCode = secrets.subaccount_code as string | null;
    if (!subaccountCode) return null;
    const platformSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!platformSecret) throw new ShopPaymentsNotConfiguredError();
    return { mode: "platform", subaccountCode, platformSecret };
  }

  const ciphertext = secrets.secret_key_ciphertext as string | null;
  if (!ciphertext) return null;
  // Current-mode lookups (checkout) need the public key too; explicit-mode lookups don't.
  if (!mode && !publicKey) return null;
  const keyB64 = process.env.SHOP_SECRETS_KEY;
  if (!keyB64) throw new ShopPaymentsNotConfiguredError();
  let secret: string;
  try {
    secret = decryptSecret(ciphertext, keyB64, siteId);
  } catch {
    // Wrong/rotated SHOP_SECRETS_KEY or tampered row; details deliberately dropped.
    throw new ShopPaymentsNotConfiguredError();
  }
  return { mode: "own_keys", secret, publicKey };
}

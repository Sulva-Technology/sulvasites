import { decryptSecret } from "./secretBox";
import { requireServiceClient, SHOP_NOT_CONFIGURED } from "./serviceClient.server";

export type ShopPaymentMode = "platform" | "own_keys";

export type ShopPaymentConfig =
  | { mode: "platform"; subaccountCode: string; platformSecret: string }
  | { mode: "own_keys"; secret: string; publicKey: string };

/** Thrown when server env (service role, PAYSTACK_SECRET_KEY, SHOP_SECRETS_KEY) is missing or broken. */
export class ShopPaymentsNotConfiguredError extends Error {
  constructor() {
    super(SHOP_NOT_CONFIGURED);
    this.name = "ShopPaymentsNotConfiguredError";
  }
}

/**
 * Server-only. Resolves how a shop takes payments, with the secret needed to talk to Paystack.
 * Returns null when the shop has no (complete) payment setup for the mode.
 *
 * Never log the returned value.
 */
export async function getShopPaymentConfig(siteId: string): Promise<ShopPaymentConfig | null> {
  const db = requireServiceClient();
  if (!db) throw new ShopPaymentsNotConfiguredError();

  let mode: ShopPaymentMode | null = null;
  let publicKey: string | null = null;
  {
    const { data, error } = await db
      .from("shop_settings")
      .select("payment_mode, paystack_public_key")
      .eq("site_id", siteId)
      .maybeSingle();
    if (error) throw new Error("Could not load shop settings");
    if (!data) return null;
    mode = data.payment_mode as ShopPaymentMode | null;
    publicKey = (data.paystack_public_key as string | null) ?? null;
  }
  if (mode !== "platform" && mode !== "own_keys") return null;

  const { data: secrets, error: secretsError } = await db
    .from("shop_payment_secrets")
    .select("subaccount_code, secret_key_ciphertext")
    .eq("site_id", siteId)
    .maybeSingle();
  if (secretsError) throw new Error("Could not load shop payment secrets");
  if (!secrets) return null;

  if (mode === "platform") {
    const subaccountCode = secrets.subaccount_code as string | null;
    if (!subaccountCode) return null;
    const platformSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!platformSecret) throw new ShopPaymentsNotConfiguredError();
    return { mode: "platform", subaccountCode, platformSecret };
  }

  const ciphertext = secrets.secret_key_ciphertext as string | null;
  if (!ciphertext || !publicKey) return null;
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

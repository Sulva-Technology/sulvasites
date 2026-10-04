import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin, rateLimit } from "@/lib/supabase/requireAdmin.server";
import { paystackRequest, PaystackError } from "@/lib/shop/paystack.server";
import { requireServiceClient, SHOP_NOT_CONFIGURED } from "@/lib/shop/serviceClient.server";
import { encryptSecret } from "@/lib/shop/secretBox";
import {
  canonicalSiteId,
  last4,
  parsePaymentSettingsBody,
  percentageChargeFromBps,
  type PaymentSettingsInput,
} from "@/lib/shop/paymentInput";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Auth: Sulvatech admins only for now; shop owners get access with the owner dashboard.

type Ctx = { params: Promise<{ siteId: string }> };

const SUBACCOUNT_RE = /^ACCT_[A-Za-z0-9]+$/;
const NO_STORE = { "Cache-Control": "no-store" };

type SettingsRow = { payment_mode: string | null; paystack_public_key: string | null; platform_fee_bps: number | null };
type SecretsRow = {
  subaccount_code: string | null;
  settlement_bank: string | null;
  account_last4: string | null;
  secret_key_last4: string | null;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function notConfigured() {
  return json({ error: SHOP_NOT_CONFIGURED }, 500);
}

function dbFailure(what: string, error: { code?: string } | null) {
  // Never log row data or details (they may contain ciphertext); the code is enough to debug.
  console.error(`[shop/payment] ${what} failed`, error?.code ?? "unknown");
  return json({ error: "Could not save payment settings." }, 500);
}

type Loaded =
  | { ok: false; response: NextResponse }
  | { ok: true; db: SupabaseClient; siteId: string; settings: SettingsRow | null; secrets: SecretsRow | null };

async function loadSite(req: Request, ctx: Ctx, limit: number): Promise<Loaded> {
  const auth = await requireAdmin(req);
  if (!auth.ok) return { ok: false, response: auth.response };
  const limited = rateLimit(`shop-payment:${auth.userId}`, { limit, windowMs: 60_000 });
  if (limited) return { ok: false, response: limited };

  const requested = canonicalSiteId((await ctx.params).siteId);
  if (!requested) return { ok: false, response: json({ error: "Site not found." }, 404) };

  const db = requireServiceClient();
  if (!db) return { ok: false, response: notConfigured() };

  const site = await db.from("sites").select("id").eq("id", requested).maybeSingle<{ id: string }>();
  if (site.error) return { ok: false, response: dbFailure("site lookup", site.error) };
  if (!site.data) return { ok: false, response: json({ error: "Site not found." }, 404) };
  // The DB id (canonicalised) is used for everything below — it is the AES-GCM AAD for the secret.
  const siteId = canonicalSiteId(site.data.id);
  if (!siteId) return { ok: false, response: json({ error: "Site not found." }, 404) };

  const [settings, secrets] = await Promise.all([
    db
      .from("shop_settings")
      .select("payment_mode, paystack_public_key, platform_fee_bps")
      .eq("site_id", siteId)
      .maybeSingle<SettingsRow>(),
    db
      .from("shop_payment_secrets")
      .select("subaccount_code, settlement_bank, account_last4, secret_key_last4")
      .eq("site_id", siteId)
      .maybeSingle<SecretsRow>(),
  ]);
  if (settings.error) return { ok: false, response: dbFailure("settings lookup", settings.error) };
  if (secrets.error) return { ok: false, response: dbFailure("secrets lookup", secrets.error) };

  return { ok: true, db, siteId, settings: settings.data, secrets: secrets.data };
}

function maskedStatus(settings: SettingsRow | null, secrets: SecretsRow | null) {
  return {
    mode: settings?.payment_mode ?? null,
    platformFeeBps: settings?.platform_fee_bps ?? 0,
    platformAvailable: Boolean(process.env.PAYSTACK_SECRET_KEY),
    platform: {
      subaccount: Boolean(secrets?.subaccount_code),
      bank: secrets?.settlement_bank ?? null,
      accountLast4: secrets?.account_last4 ?? null,
    },
    ownKeys: {
      publicKey: settings?.paystack_public_key ?? null,
      secretLast4: secrets?.secret_key_last4 ?? null,
    },
  };
}

export async function GET(req: Request, ctx: Ctx) {
  const loaded = await loadSite(req, ctx, 60);
  if (!loaded.ok) return loaded.response;
  return json(maskedStatus(loaded.settings, loaded.secrets));
}

type SubaccountData = { subaccount_code?: unknown; settlement_bank?: unknown };

async function saveSubaccount(
  platformSecret: string,
  existingCode: string | null,
  input: NonNullable<PaymentSettingsInput["platform"]>,
  feeBps: number,
): Promise<{ code: string; bank: string }> {
  const body = {
    business_name: input.businessName,
    settlement_bank: input.bankCode,
    account_number: input.accountNumber,
    percentage_charge: percentageChargeFromBps(feeBps),
  };
  let data: SubaccountData | null = null;
  if (existingCode && SUBACCOUNT_RE.test(existingCode)) {
    try {
      data = await paystackRequest<SubaccountData>(`/subaccount/${encodeURIComponent(existingCode)}`, {
        method: "PUT",
        secret: platformSecret,
        body,
      });
    } catch (err) {
      // Subaccount unknown to this Paystack account (e.g. test → live switch): create a new one.
      if (!(err instanceof PaystackError && err.status === 404)) throw err;
    }
  }
  data ??= await paystackRequest<SubaccountData>("/subaccount", { method: "POST", secret: platformSecret, body });

  const code = typeof data?.subaccount_code === "string" ? data.subaccount_code : existingCode;
  if (!code || !SUBACCOUNT_RE.test(code)) throw new PaystackError(502, "Paystack did not return a subaccount code.");
  const bank = typeof data?.settlement_bank === "string" && data.settlement_bank.trim()
    ? data.settlement_bank.trim().slice(0, 120)
    : input.bankCode;
  return { code, bank };
}

function paystackFailure(err: unknown) {
  if (err instanceof PaystackError) {
    const status = err.status === 400 || err.status === 422 ? 400 : 502;
    return json({ error: err.message }, status);
  }
  return json({ error: "Could not reach Paystack." }, 502);
}

export async function POST(req: Request, ctx: Ctx) {
  const loaded = await loadSite(req, ctx, 10);
  if (!loaded.ok) return loaded.response;
  const { db, siteId } = loaded;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const parsed = parsePaymentSettingsBody(raw);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const input = parsed.value;

  const feeBps = input.platformFeeBps ?? loaded.settings?.platform_fee_bps ?? 0;
  let settingsPatch: Record<string, unknown> = {};
  let secretsPatch: Record<string, unknown> | null = null;

  if (input.platform) {
    const platformSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!platformSecret) return notConfigured();
    let result: { code: string; bank: string };
    try {
      result = await saveSubaccount(platformSecret, loaded.secrets?.subaccount_code ?? null, input.platform, feeBps);
    } catch (err) {
      return paystackFailure(err);
    }
    secretsPatch = {
      subaccount_code: result.code,
      settlement_bank: result.bank,
      account_last4: last4(input.platform.accountNumber),
    };
    settingsPatch = { payment_mode: "platform", paystack_public_key: null };
  } else if (input.ownKeys) {
    const keyB64 = process.env.SHOP_SECRETS_KEY;
    if (!keyB64) return notConfigured();
    let ciphertext: string;
    try {
      ciphertext = encryptSecret(input.ownKeys.secretKey, keyB64, siteId);
    } catch {
      return notConfigured();
    }
    try {
      await paystackRequest<unknown>("/balance", { secret: input.ownKeys.secretKey });
    } catch (err) {
      if (err instanceof PaystackError && err.status === 401) {
        return json({ error: "Paystack rejected this secret key" }, 400);
      }
      return paystackFailure(err);
    }
    secretsPatch = {
      secret_key_ciphertext: ciphertext,
      secret_key_last4: last4(input.ownKeys.secretKey),
    };
    settingsPatch = { payment_mode: "own_keys", paystack_public_key: input.ownKeys.publicKey };
  }
  if (input.platformFeeBps !== undefined) settingsPatch.platform_fee_bps = input.platformFeeBps;

  if (secretsPatch) {
    const { error } = await db
      .from("shop_payment_secrets")
      .upsert({ site_id: siteId, ...secretsPatch }, { onConflict: "site_id" });
    if (error) return dbFailure("secrets upsert", error);
  }
  const { error: settingsError } = await db
    .from("shop_settings")
    .upsert({ site_id: siteId, ...settingsPatch }, { onConflict: "site_id" });
  if (settingsError) return dbFailure("settings upsert", settingsError);

  const [settings, secrets] = await Promise.all([
    db
      .from("shop_settings")
      .select("payment_mode, paystack_public_key, platform_fee_bps")
      .eq("site_id", siteId)
      .maybeSingle<SettingsRow>(),
    db
      .from("shop_payment_secrets")
      .select("subaccount_code, settlement_bank, account_last4, secret_key_last4")
      .eq("site_id", siteId)
      .maybeSingle<SecretsRow>(),
  ]);
  if (settings.error) return dbFailure("settings re-read", settings.error);
  if (secrets.error) return dbFailure("secrets re-read", secrets.error);
  return json(maskedStatus(settings.data, secrets.data));
}

/**
 * "Remove my keys": deletes the shop's own Paystack secret key (ciphertext + last4) and, if the shop
 * was taking payments with its own keys, switches payments off (mode and public key cleared).
 * Platform subaccount data is untouched. Orders created in own_keys mode can no longer be verified.
 */
export async function DELETE(req: Request, ctx: Ctx) {
  const loaded = await loadSite(req, ctx, 10);
  if (!loaded.ok) return loaded.response;
  const { db, siteId } = loaded;

  // Stop taking own-key payments first, then drop the secret.
  const patch: Record<string, unknown> = { paystack_public_key: null };
  if (loaded.settings?.payment_mode === "own_keys") patch.payment_mode = null;
  if (loaded.settings) {
    const { error } = await db.from("shop_settings").update(patch).eq("site_id", siteId);
    if (error) return dbFailure("settings clear", error);
  }
  if (loaded.secrets) {
    const { error } = await db
      .from("shop_payment_secrets")
      .update({ secret_key_ciphertext: null, secret_key_last4: null })
      .eq("site_id", siteId);
    if (error) return dbFailure("secrets clear", error);
  }

  const [settings, secrets] = await Promise.all([
    db
      .from("shop_settings")
      .select("payment_mode, paystack_public_key, platform_fee_bps")
      .eq("site_id", siteId)
      .maybeSingle<SettingsRow>(),
    db
      .from("shop_payment_secrets")
      .select("subaccount_code, settlement_bank, account_last4, secret_key_last4")
      .eq("site_id", siteId)
      .maybeSingle<SecretsRow>(),
  ]);
  if (settings.error) return dbFailure("settings re-read", settings.error);
  if (secrets.error) return dbFailure("secrets re-read", secrets.error);
  return json(maskedStatus(settings.data, secrets.data));
}

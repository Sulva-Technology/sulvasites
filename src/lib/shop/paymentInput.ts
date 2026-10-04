/**
 * Pure validators for the shop payment-settings API. Relative imports only (unit-tested).
 * Error messages never echo key material.
 */

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export type KeyEnvironment = "test" | "live";

export type PaymentSettingsInput = {
  platform?: { bankCode: string; accountNumber: string; businessName: string };
  ownKeys?: { publicKey: string; secretKey: string; environment: KeyEnvironment };
  platformFeeBps?: number;
};

const ACCOUNT_RE = /^\d{10}$/;
const BANK_CODE_RE = /^[A-Za-z0-9]{1,10}$/;
const PUBLIC_KEY_RE = /^pk_(test|live)_[A-Za-z0-9]{20,100}$/;
const SECRET_KEY_RE = /^sk_(test|live)_[A-Za-z0-9]{20,100}$/;
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

function fail<T>(error: string): Parsed<T> {
  return { ok: false, error };
}

export function parseAccountNumber(v: unknown): Parsed<string> {
  if (typeof v !== "string") return fail("Account number must be 10 digits.");
  const s = v.trim();
  return ACCOUNT_RE.test(s) ? { ok: true, value: s } : fail("Account number must be 10 digits.");
}

export function parseBankCode(v: unknown): Parsed<string> {
  if (typeof v !== "string") return fail("Choose a bank.");
  const s = v.trim();
  return BANK_CODE_RE.test(s) ? { ok: true, value: s } : fail("Choose a bank.");
}

export function parseBusinessName(v: unknown): Parsed<string> {
  if (typeof v !== "string") return fail("Business name must be 2–100 characters.");
  const s = v.trim();
  if (CONTROL_RE.test(s)) return fail("Business name contains invalid characters.");
  return s.length >= 2 && s.length <= 100 ? { ok: true, value: s } : fail("Business name must be 2–100 characters.");
}

export function parsePublicKey(v: unknown): Parsed<string> {
  if (typeof v !== "string") return fail("Public key must start with pk_test_ or pk_live_.");
  const s = v.trim();
  return PUBLIC_KEY_RE.test(s) ? { ok: true, value: s } : fail("Public key must start with pk_test_ or pk_live_.");
}

export function parseSecretKey(v: unknown): Parsed<string> {
  if (typeof v !== "string") return fail("Secret key must start with sk_test_ or sk_live_.");
  const s = v.trim();
  return SECRET_KEY_RE.test(s) ? { ok: true, value: s } : fail("Secret key must start with sk_test_ or sk_live_.");
}

export function keyEnvironment(key: string): KeyEnvironment | null {
  const m = /^[ps]k_(test|live)_/.exec(typeof key === "string" ? key : "");
  return m ? (m[1] as KeyEnvironment) : null;
}

export function parsePlatformFeeBps(v: unknown): Parsed<number> {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 10000) {
    return fail("Platform fee must be a whole number of basis points between 0 and 10000.");
  }
  return { ok: true, value: v };
}

/** Paystack `percentage_charge` is a percent (e.g. 1.5 for 150 bps). */
export function percentageChargeFromBps(bps: number): number {
  return bps / 100;
}

export function last4(s: string): string {
  return s.slice(-4);
}

export function parsePaymentSettingsBody(body: unknown): Parsed<PaymentSettingsInput> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail("Invalid request body.");
  const b = body as Record<string, unknown>;
  const out: PaymentSettingsInput = {};

  if (b.platformFeeBps !== undefined) {
    const fee = parsePlatformFeeBps(b.platformFeeBps);
    if (!fee.ok) return fail(fee.error);
    out.platformFeeBps = fee.value;
  }

  if (b.mode === "platform") {
    const bank = parseBankCode(b.bankCode);
    if (!bank.ok) return fail(bank.error);
    const acct = parseAccountNumber(b.accountNumber);
    if (!acct.ok) return fail(acct.error);
    const name = parseBusinessName(b.businessName);
    if (!name.ok) return fail(name.error);
    out.platform = { bankCode: bank.value, accountNumber: acct.value, businessName: name.value };
  } else if (b.mode === "own_keys") {
    const pk = parsePublicKey(b.publicKey);
    if (!pk.ok) return fail(pk.error);
    const sk = parseSecretKey(b.secretKey);
    if (!sk.ok) return fail(sk.error);
    const env = keyEnvironment(pk.value);
    if (!env || env !== keyEnvironment(sk.value)) {
      return fail("Public and secret keys must both be test keys or both be live keys.");
    }
    out.ownKeys = { publicKey: pk.value, secretKey: sk.value, environment: env };
  } else if (b.mode !== undefined) {
    return fail("Mode must be 'platform' or 'own_keys'.");
  }

  if (!out.platform && !out.ownKeys && out.platformFeeBps === undefined) {
    return fail("Nothing to update.");
  }
  return { ok: true, value: out };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Canonical site id (trimmed, lowercase UUID) or null. Used as the AES-GCM AAD for shop secrets,
 * so encrypt and decrypt must always agree on the exact string.
 */
export function canonicalSiteId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return UUID_RE.test(s) ? s : null;
}

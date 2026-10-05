/** Max price accepted by the DB check: 10 billion naira, in kobo. */
export const MAX_PRICE_KOBO = 1_000_000_000_000;

/**
 * Parse a naira amount typed by a person ("3,500", "₦3500.50", "NGN 1 200") into integer kobo.
 * Empty -> null. Invalid -> { error }. No floating point: the digits are split as text.
 */
export function parseNairaToKobo(input: string): { kobo: number | null } | { error: string } {
  const cleaned = input.replace(/^\s*(?:₦|ngn|naira)\s*/i, "").replace(/[,\s]/g, "");
  if (cleaned === "") return { kobo: null };
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!m) return { error: "Enter an amount in naira, like 3500 or 3,500.50." };
  const kobo = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(kobo) || kobo > MAX_PRICE_KOBO) return { error: "That amount is too large." };
  return { kobo };
}

/** Kobo -> the text shown in an input ("3500" or "3500.5" -> "3500.50"); null -> "". */
export function koboToNairaInput(kobo: number | null | undefined): string {
  if (kobo == null || !Number.isFinite(kobo)) return "";
  const whole = Math.floor(kobo / 100);
  const rem = kobo % 100;
  return rem === 0 ? String(whole) : `${whole}.${String(rem).padStart(2, "0")}`;
}

/** Deterministic display, e.g. 350000 -> "₦3,500". (Same output as shop/money formatNaira.) */
export function formatKobo(kobo: number): string {
  const total = Math.round(kobo);
  const naira = Math.floor(total / 100);
  const rem = total % 100;
  const whole = String(naira).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `₦${whole}${rem === 0 ? "" : "." + String(rem).padStart(2, "0")}`;
}

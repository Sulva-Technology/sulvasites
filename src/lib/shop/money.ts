/** Money is integer kobo everywhere. Deterministic formatting (no Intl). */
export function formatNaira(kobo: number): string {
  if (!Number.isFinite(kobo)) return "₦0";
  const total = Math.round(kobo);
  const negative = total < 0;
  const abs = Math.abs(total);
  const naira = Math.floor(abs / 100);
  const rem = abs % 100;
  const whole = String(naira).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = rem === 0 ? "" : "." + String(rem).padStart(2, "0");
  return `${negative ? "-" : ""}₦${whole}${frac}`;
}

export function toKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function platformFeeKobo(totalKobo: number, bps: number): number {
  const safeBps = Math.min(10000, Math.max(0, Number.isFinite(bps) ? bps : 0));
  return Math.floor((totalKobo * safeBps) / 10000);
}

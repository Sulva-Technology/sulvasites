export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = 30;

/** Day buckets in the database use this zone (Nigeria, no DST). */
export const INSIGHTS_TZ = "Africa/Lagos";

export function parsePeriod(v: unknown): Period {
  const n = Number(v);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : DEFAULT_PERIOD;
}

export function periodLabel(p: Period): string {
  return `Last ${p} days`;
}

/** Percent change vs previous period; null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function formatCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatChange(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return "n/a";
  const r = Math.round(pct);
  if (r === 0) return "0%";
  return `${r > 0 ? "+" : ""}${r}%`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-05" -> "5 Oct". Unparseable input is returned unchanged. */
export function shortDay(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return day;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month}` : day;
}

/** Calendar day (yyyy-mm-dd) in Lagos for the given instant. Lagos is a fixed UTC+1. */
export function lagosDay(d: Date): string {
  return new Date(d.getTime() + 3_600_000).toISOString().slice(0, 10);
}

/**
 * Round a series maximum up to a tidy axis maximum whose 4 tick steps are 1, 2, 2.5, 5 or 10 x 10^n,
 * so tick labels are always whole, round numbers. Always at least 4 so tiny counts stay readable.
 */
export function niceMax(max: number): number {
  if (!Number.isFinite(max) || max <= 4) return 4;
  const raw = max / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 && pow >= 10 ? 2.5 : f <= 5 ? 5 : 10;
  return step * pow * 4;
}

/** Evenly spaced axis ticks from 0 to `top` (inclusive). */
export function axisTicks(top: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, i) => Math.round((top / count) * i));
}

/** Indexes of x-axis labels to show so labels never crowd: first, last and evenly spaced between. */
export function labelIndexes(n: number, maxLabels = 6): number[] {
  if (n <= 0) return [];
  if (n <= maxLabels) return Array.from({ length: n }, (_, i) => i);
  const out = new Set<number>([0, n - 1]);
  const step = (n - 1) / (maxLabels - 1);
  for (let i = 1; i < maxLabels - 1; i++) out.add(Math.round(i * step));
  return [...out].sort((a, b) => a - b);
}

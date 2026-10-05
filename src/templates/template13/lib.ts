/** Pure helpers for template 13 (no React, no "@/" imports — loaded by the Node test runner). */

export function matchesQuery(p: { name: string; description: string | null }, categoryName: string | null, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${p.name} ${p.description ?? ""} ${categoryName ?? ""}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

export type TypeState = { i: number; len: number; dir: 1 | -1; hold: number };
const HOLD_TICKS = 14; // ≈ 1.6 s at the composer's 110 ms tick while holding

/** One tick of the composer placeholder: type → hold → delete → next phrase. */
export function typewriterStep(s: TypeState, phrases: string[]): TypeState {
  if (!phrases.length) return { i: 0, len: 0, dir: 1, hold: 0 };
  const word = phrases[s.i % phrases.length] ?? "";
  if (s.dir === 1) {
    if (s.len < word.length) return { ...s, len: s.len + 1 };
    if (s.hold < HOLD_TICKS) return { ...s, hold: s.hold + 1 };
    return { ...s, dir: -1, hold: 0 };
  }
  if (s.len > 0) return { ...s, len: s.len - 1 };
  return { i: (s.i + 1) % phrases.length, len: 0, dir: 1, hold: 0 };
}

export function typewriterText(s: TypeState, phrases: string[]): string {
  if (!phrases.length) return "";
  return (phrases[s.i % phrases.length] ?? "").slice(0, s.len);
}

/** How many characters of the statement are lit for a scroll progress 0..1. */
export function litCount(progress: number, total: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return Math.round(p * total);
}

/** Featured first, then the rest; repeated until the row is long enough to loop seamlessly. */
export function pickMarquee<T extends { id: string; featured: boolean }>(items: T[], min = 8): T[] {
  if (!items.length) return [];
  const ordered = [...items.filter((p) => p.featured), ...items.filter((p) => !p.featured)];
  const out: T[] = [];
  while (out.length < min) out.push(...ordered);
  return out;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "·";
  return parts.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

export function splitChars(text: string): string[] {
  return Array.from(text);
}

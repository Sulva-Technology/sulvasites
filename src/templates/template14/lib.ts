/** Pure helpers for template 14 (no React, no "@/" imports — loaded by the Node test runner). */

/** Norma-style two-tone headline: [dimmed lead-in, strong finish]. */
export function splitTwoTone(headline: string): [string, string] {
  const h = headline.trim();
  if (!h) return ["", ""];
  const nl = h.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (nl.length > 1) return [nl[0]!, nl.slice(1).join(" ")];
  const sentence = h.match(/^(.+?[.!?])\s+(.+)$/);
  if (sentence) return [sentence[1]!, sentence[2]!];
  const words = h.split(/\s+/);
  if (words.length < 2) return ["", h];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

export type Stat = { prefix: string; value: number; decimals: number; suffix: string };

export function parseStat(title: string): Stat | null {
  const m = title.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const raw = m[2]!.replace(/,/g, "");
  const decimals = raw.includes(".") ? raw.split(".")[1]!.length : 0;
  return { prefix: m[1]!, value: Number(raw), decimals, suffix: m[3]! };
}

export function formatStat(s: Stat, value: number): string {
  const n = value.toLocaleString("en-US", { minimumFractionDigits: s.decimals, maximumFractionDigits: s.decimals });
  return `${s.prefix}${n}${s.suffix}`;
}

export function savingKobo(price: number, compareAt: number | null): number {
  return compareAt !== null && compareAt > price ? compareAt - price : 0;
}

/** Variant with the biggest saving against compare-at; null unless at least two variants exist and one saves. */
export function bestValueVariantId(
  variants: Array<{ id: string; priceKobo: number | null }>,
  basePrice: number,
  compareAt: number | null,
): string | null {
  if (variants.length < 2 || compareAt === null) return null;
  let best: { id: string; save: number } | null = null;
  for (const v of variants) {
    const save = savingKobo(v.priceKobo ?? basePrice, compareAt);
    if (save > 0 && (!best || save > best.save)) best = { id: v.id, save };
  }
  return best?.id ?? null;
}

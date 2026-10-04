/** Pure helpers for the product editor's variant generator. Relative imports only (unit-tested). */

export type VariantRow = {
  id?: string;
  options: Record<string, string>;
  price_kobo: number | null;
  stock: number | null;
  sku: string | null;
  position?: number;
};

export const MAX_VARIANTS = 100;

function clean(optionValues: Record<string, string[]>): Array<[string, string[]]> {
  const out: Array<[string, string[]]> = [];
  const seenNames = new Set<string>();
  for (const [rawName, rawValues] of Object.entries(optionValues)) {
    const name = rawName.trim();
    if (!name || seenNames.has(name)) continue;
    const values: string[] = [];
    for (const v of Array.isArray(rawValues) ? rawValues : []) {
      const t = typeof v === "string" ? v.trim() : "";
      if (t && !values.includes(t)) values.push(t);
    }
    if (values.length) {
      seenNames.add(name);
      out.push([name, values]);
    }
  }
  return out;
}

export function countCombinations(optionValues: Record<string, string[]>): number {
  const groups = clean(optionValues);
  if (!groups.length) return 0;
  return groups.reduce((n, [, v]) => n * v.length, 1);
}

function optionsKey(options: Record<string, string>): string {
  return JSON.stringify(Object.keys(options).sort().map((k) => [k, options[k]]));
}

/**
 * Cartesian product of option values. Existing variants whose options match exactly (same names and
 * values) keep their id, price, stock and sku. Capped at MAX_VARIANTS.
 */
export function buildVariantMatrix(
  optionValues: Record<string, string[]>,
  existing: VariantRow[] = [],
): VariantRow[] {
  const groups = clean(optionValues);
  if (!groups.length) return [];

  let combos: Array<Record<string, string>> = [{}];
  for (const [name, values] of groups) {
    const next: Array<Record<string, string>> = [];
    for (const base of combos) {
      for (const v of values) {
        next.push({ ...base, [name]: v });
      }
    }
    combos = next.length > 5000 ? next.slice(0, 5000) : next;
  }
  combos = combos.slice(0, MAX_VARIANTS);

  const pool = new Map<string, VariantRow>();
  for (const e of existing) {
    const k = optionsKey(e.options);
    if (!pool.has(k)) pool.set(k, e);
  }

  return combos.map((options, position) => {
    const k = optionsKey(options);
    const match = pool.get(k);
    if (match) pool.delete(k);
    return {
      ...(match?.id ? { id: match.id } : {}),
      options,
      price_kobo: match?.price_kobo ?? null,
      stock: match?.stock ?? null,
      sku: match?.sku ?? null,
      position,
    };
  });
}

/** Option names with their values, in first-seen order, from saved variants. */
export function optionsFromVariants(variants: Array<{ options: Record<string, string> }>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const v of variants) {
    for (const [name, value] of Object.entries(v.options ?? {})) {
      const list = (out[name] ??= []);
      if (!list.includes(value)) list.push(value);
    }
  }
  return out;
}

export function variantLabel(options: Record<string, string>): string {
  return Object.values(options ?? {}).join(" / ");
}

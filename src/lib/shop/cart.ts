export type CartLine = { productId: string; variantId: string | null; quantity: number };

const DEFAULT_MAX = 99;

export function addLine(lines: CartLine[], line: CartLine, max: number = DEFAULT_MAX): CartLine[] {
  const idx = lines.findIndex((l) => l.productId === line.productId && l.variantId === line.variantId);
  if (idx === -1) return [...lines, { ...line, quantity: Math.min(line.quantity, max) }];
  return lines.map((l, i) => (i === idx ? { ...l, quantity: Math.min(l.quantity + line.quantity, max) } : l));
}

export function removeLine(lines: CartLine[], index: number): CartLine[] {
  if (index < 0 || index >= lines.length) return lines;
  return lines.filter((_, i) => i !== index);
}

export function setQty(lines: CartLine[], index: number, qty: number): CartLine[] {
  if (index < 0 || index >= lines.length) return lines;
  if (qty <= 0) return removeLine(lines, index);
  return lines.map((l, i) => (i === index ? { ...l, quantity: qty } : l));
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.quantity, 0);
}

export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: CartLine[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.productId !== "string" || o.productId === "") continue;
    const variantId = o.variantId ?? null;
    if (variantId !== null && typeof variantId !== "string") continue;
    if (typeof o.quantity !== "number" || !Number.isInteger(o.quantity) || o.quantity < 1) continue;
    out.push({ productId: o.productId, variantId, quantity: Math.min(o.quantity, DEFAULT_MAX) });
  }
  return out;
}

export const cartStorageKey = (siteId: string): string => `sulva-cart-${siteId}`;

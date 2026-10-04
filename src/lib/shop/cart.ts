export type CartLine = { productId: string; variantId: string | null; quantity: number };

const DEFAULT_MAX = 99;

function safeMax(max: number): number {
  return Number.isSafeInteger(max) && max >= 1 ? max : DEFAULT_MAX;
}

function validLine(line: unknown): line is CartLine {
  if (!line || typeof line !== "object") return false;
  const o = line as Record<string, unknown>;
  return typeof o.productId === "string" && o.productId !== ""
    && (o.variantId === null || typeof o.variantId === "string")
    && typeof o.quantity === "number" && Number.isSafeInteger(o.quantity) && o.quantity >= 1;
}

export function addLine(lines: CartLine[], line: CartLine, max: number = DEFAULT_MAX): CartLine[] {
  if (!validLine(line)) return lines;
  const cap = safeMax(max);
  const idx = lines.findIndex((l) => l.productId === line.productId && l.variantId === line.variantId);
  if (idx === -1) return [...lines, { ...line, quantity: Math.min(line.quantity, cap) }];
  return lines.map((l, i) => (i === idx ? { ...l, quantity: Math.min(l.quantity + line.quantity, cap) } : l));
}

export function removeLine(lines: CartLine[], index: number): CartLine[] {
  if (index < 0 || index >= lines.length) return lines;
  return lines.filter((_, i) => i !== index);
}

export function setQty(lines: CartLine[], index: number, qty: number, max: number = DEFAULT_MAX): CartLine[] {
  if (index < 0 || index >= lines.length) return lines;
  if (typeof qty !== "number" || Number.isNaN(qty)) return lines;
  if (qty <= 0) return removeLine(lines, index);
  if (!Number.isSafeInteger(qty)) return lines;
  const cap = safeMax(max);
  return lines.map((l, i) => (i === index ? { ...l, quantity: Math.min(qty, cap) } : l));
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
    const candidate = { productId: o.productId, variantId: o.variantId ?? null, quantity: o.quantity };
    if (!validLine(candidate)) continue;
    out.push({ ...candidate, quantity: Math.min(candidate.quantity, DEFAULT_MAX) });
  }
  return out;
}

export const cartStorageKey = (siteId: string): string => `sulva-cart-${siteId}`;

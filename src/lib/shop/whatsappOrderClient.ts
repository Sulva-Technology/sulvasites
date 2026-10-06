import type { CartLine } from "./cart.ts";

export type WhatsAppOrderPayload = {
  lines: CartLine[];
  deliveryMethod?: "delivery" | "pickup" | null;
  customer?: { name?: string; email?: string; phone?: string };
  address?: string | null;
  notes?: string | null;
};

export type RegisteredWhatsAppOrder = {
  reference: string;
  /** null = delivery or pickup still to be agreed in the chat. */
  deliveryMethod: "delivery" | "pickup" | null;
  subtotalKobo: number;
  deliveryKobo: number;
  totalKobo: number;
  items: Array<{
    productId: string;
    name: string;
    variantLabel: string | null;
    unitKobo: number;
    quantity: number;
    lineTotalKobo: number;
  }>;
};

export type WhatsAppOrderEnv = {
  fetch: typeof fetch;
  storage: Pick<Storage, "getItem" | "setItem"> | null;
  now: () => number;
  timeoutMs: number;
};

/** Re-tapping with the same bag and details within this window reuses the order instead of duplicating it. */
export const REUSE_MS = 6 * 60 * 60 * 1000;

function browserEnv(): WhatsAppOrderEnv {
  let storage: WhatsAppOrderEnv["storage"] = null;
  try {
    storage = window.sessionStorage;
  } catch {
    storage = null;
  }
  return { fetch: (...a) => fetch(...a), storage, now: () => Date.now(), timeoutMs: 6000 };
}

function isOrder(v: unknown): v is RegisteredWhatsAppOrder {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.reference === "string" && Array.isArray(o.items) && o.items.length > 0
    && typeof o.subtotalKobo === "number" && typeof o.deliveryKobo === "number" && typeof o.totalKobo === "number";
}

/**
 * Records the bag as a pending WhatsApp order so it shows up in the shop's order inbox.
 * Returns null on any failure: the caller still opens WhatsApp, just without an order reference.
 */
export async function registerWhatsAppOrder(
  siteId: string,
  payload: WhatsAppOrderPayload,
  env: WhatsAppOrderEnv = browserEnv(),
): Promise<RegisteredWhatsAppOrder | null> {
  const key = `sulva-wa-order-${siteId}`;
  const sig = JSON.stringify(payload);
  try {
    const cached = JSON.parse(env.storage?.getItem(key) ?? "null") as { sig?: string; at?: number; order?: unknown } | null;
    if (cached && cached.sig === sig && typeof cached.at === "number" && env.now() - cached.at < REUSE_MS && isOrder(cached.order)) {
      return cached.order;
    }
  } catch {
    // ignore unreadable cache
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.timeoutMs);
  try {
    const res = await env.fetch(`/api/shop/${encodeURIComponent(siteId)}/whatsapp-order`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: sig,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isOrder(data)) return null;
    try {
      env.storage?.setItem(key, JSON.stringify({ sig, at: env.now(), order: data }));
    } catch {
      // storage full / blocked: fine, just no de-duplication
    }
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pure validation of the public "order on WhatsApp" request body. Relative imports only (unit-tested).
 * Unlike checkout, contact details are optional (the chat itself identifies the shopper), and a
 * half-typed or invalid field is dropped rather than blocking the hand-off to WhatsApp.
 */
import type { CartLine } from "./cart.ts";
import {
  parseCartLines,
  parseCustomerEmail,
  parseCustomerName,
  parseCustomerPhone,
  type Parsed,
} from "./checkoutInput.ts";

export type WhatsAppOrderRequest = {
  lines: CartLine[];
  /** null = not chosen yet (sent from the bag): agreed in the chat. */
  deliveryMethod: "delivery" | "pickup" | null;
  customer: { name: string; email: string; phone: string };
  address: string | null;
  notes: string | null;
};

const TEXT_CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

function optionalText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s && s.length <= max && !TEXT_CONTROL_RE.test(s) ? s : null;
}

function okOr<T>(p: Parsed<T>, fallback: T): T {
  return p.ok ? p.value : fallback;
}

export function parseWhatsAppOrderBody(body: unknown): Parsed<WhatsAppOrderRequest> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Invalid request." };
  const b = body as Record<string, unknown>;

  const lines = parseCartLines(b.lines);
  if (!lines.ok) return { ok: false, error: lines.error };

  const dm = b.deliveryMethod;
  if (dm !== undefined && dm !== null && dm !== "delivery" && dm !== "pickup") {
    return { ok: false, error: "Choose delivery or pickup." };
  }
  const deliveryMethod = dm === "delivery" || dm === "pickup" ? dm : null;

  const c = b.customer && typeof b.customer === "object" && !Array.isArray(b.customer)
    ? (b.customer as Record<string, unknown>)
    : {};
  const customer = {
    name: c.name === undefined || c.name === "" ? "" : okOr(parseCustomerName(c.name), ""),
    email: c.email === undefined || c.email === "" ? "" : okOr(parseCustomerEmail(c.email), ""),
    phone: c.phone === undefined || c.phone === "" ? "" : okOr(parseCustomerPhone(c.phone), ""),
  };

  return {
    ok: true,
    value: {
      lines: lines.value,
      deliveryMethod,
      customer,
      address: deliveryMethod === "pickup" ? null : optionalText(b.address, 300),
      notes: optionalText(b.notes, 500),
    },
  };
}

/** Note stored on the order when the shopper hasn't picked delivery or pickup yet. */
export const DELIVERY_UNDECIDED_NOTE = "Delivery or pickup not chosen yet: agree it on WhatsApp.";

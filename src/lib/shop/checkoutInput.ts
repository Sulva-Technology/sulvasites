/**
 * Pure validation of the public checkout request body. Relative imports only (unit-tested).
 * Error messages are safe to show to shoppers.
 */
import type { CartLine } from "./cart.ts";

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export type CheckoutCustomer = { name: string; email: string; phone: string };

export type CheckoutInput = {
  lines: CartLine[];
  customer: CheckoutCustomer;
  deliveryMethod: "delivery" | "pickup";
  address: string | null;
  notes: string | null;
  returnUrl: string | null;
};

export const MAX_LINES = 50;
export const MAX_QUANTITY = 99;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const PHONE_RE = /^\+?\d{7,20}$/;
const CONTROL_RE = /[\u0000-\u001f\u007f]/;
// Free text may contain tabs/newlines but no other control characters.
const TEXT_CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

function fail<T>(error: string): Parsed<T> {
  return { ok: false, error };
}

export function parseCustomerName(v: unknown): Parsed<string> {
  if (typeof v !== "string") return fail("Enter your name (2-80 characters).");
  const s = v.trim().replace(/\s+/g, " ");
  if (CONTROL_RE.test(s) || s.length < 2 || s.length > 80) return fail("Enter your name (2-80 characters).");
  return { ok: true, value: s };
}

export function parseCustomerEmail(v: unknown): Parsed<string> {
  if (typeof v !== "string") return fail("Enter a valid email address.");
  const s = v.trim();
  if (s.length > 254 || CONTROL_RE.test(s) || !EMAIL_RE.test(s)) return fail("Enter a valid email address.");
  return { ok: true, value: s };
}

export function parseCustomerPhone(v: unknown): Parsed<string> {
  if (typeof v !== "string") return fail("Enter a valid phone number.");
  const s = v.trim().replace(/[\s\-().]/g, "");
  if (!PHONE_RE.test(s)) return fail("Enter a valid phone number.");
  return { ok: true, value: s };
}

function parseOptionalText(v: unknown, max: number, label: string): Parsed<string | null> {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (typeof v !== "string") return fail(`${label} is not valid.`);
  const s = v.trim();
  if (s === "") return { ok: true, value: null };
  if (s.length > max || TEXT_CONTROL_RE.test(s)) return fail(`${label} must be at most ${max} characters.`);
  return { ok: true, value: s };
}

export function parseCartLines(v: unknown): Parsed<CartLine[]> {
  if (!Array.isArray(v) || v.length === 0) return fail("Your cart is empty.");
  if (v.length > MAX_LINES) return fail(`You can order at most ${MAX_LINES} different items at once.`);
  const out: CartLine[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail("Your cart has an invalid item.");
    const o = raw as Record<string, unknown>;
    if (typeof o.productId !== "string" || !UUID_RE.test(o.productId)) return fail("Your cart has an invalid item.");
    const variantId = o.variantId ?? null;
    if (variantId !== null && (typeof variantId !== "string" || !UUID_RE.test(variantId))) {
      return fail("Your cart has an invalid item.");
    }
    const q = o.quantity;
    if (typeof q !== "number" || !Number.isInteger(q) || q < 1 || q > MAX_QUANTITY) {
      return fail(`Quantity must be between 1 and ${MAX_QUANTITY}.`);
    }
    out.push({
      productId: o.productId.toLowerCase(),
      variantId: variantId === null ? null : (variantId as string).toLowerCase(),
      quantity: q,
    });
  }
  return { ok: true, value: out };
}

export function parseCheckoutBody(body: unknown): Parsed<CheckoutInput> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail("Invalid request.");
  const b = body as Record<string, unknown>;

  const lines = parseCartLines(b.lines);
  if (!lines.ok) return fail(lines.error);

  const c = b.customer;
  if (!c || typeof c !== "object" || Array.isArray(c)) return fail("Enter your contact details.");
  const cust = c as Record<string, unknown>;
  const name = parseCustomerName(cust.name);
  if (!name.ok) return fail(name.error);
  const email = parseCustomerEmail(cust.email);
  if (!email.ok) return fail(email.error);
  const phone = parseCustomerPhone(cust.phone);
  if (!phone.ok) return fail(phone.error);

  if (b.deliveryMethod !== "delivery" && b.deliveryMethod !== "pickup") return fail("Choose delivery or pickup.");
  const deliveryMethod = b.deliveryMethod;

  const addr = parseOptionalText(b.address, 300, "Delivery address");
  if (!addr.ok) return fail(addr.error);
  if (deliveryMethod === "delivery" && addr.value === null) return fail("Enter your delivery address.");
  const notes = parseOptionalText(b.notes, 500, "Notes");
  if (!notes.ok) return fail(notes.error);

  const returnUrl = typeof b.returnUrl === "string" && b.returnUrl.length <= 2048 ? b.returnUrl : null;

  return {
    ok: true,
    value: {
      lines: lines.value,
      customer: { name: name.value, email: email.value, phone: phone.value },
      deliveryMethod,
      address: deliveryMethod === "delivery" ? addr.value : null,
      notes: notes.value,
      returnUrl,
    },
  };
}

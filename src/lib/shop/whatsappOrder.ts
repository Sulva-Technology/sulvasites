import { formatNaira } from "./money.ts";

/**
 * "Finish on WhatsApp": turns the shopper's bag into a pre-filled WhatsApp message to the business.
 * Display-only prices (the seller confirms the final amount in the chat); nothing is saved as an order.
 */

export type WhatsAppOrderItem = {
  name: string;
  variantLabel: string | null;
  quantity: number;
  unitKobo: number;
  lineTotalKobo: number;
  /** Absolute product link, so the seller can tap straight to what was picked. */
  url?: string | null;
};

export type WhatsAppOrderDetails = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export type WhatsAppOrderInput = {
  businessName?: string | null;
  items: WhatsAppOrderItem[];
  subtotalKobo: number;
  /** Omitted on the bag (delivery is chosen at checkout); "agree" = to be settled in the chat. */
  deliveryMethod?: "delivery" | "pickup" | "agree" | null;
  deliveryKobo?: number | null;
  customer?: WhatsAppOrderDetails | null;
  /** Order reference when the bag was registered, so the seller can find it under Orders. */
  reference?: string | null;
};

/** Long bags are summarised so the wa.me link stays well inside browser/WhatsApp URL limits. */
export const WHATSAPP_MAX_ITEMS = 25;
const FIELD_MAX = 300;

function clean(value: string | null | undefined, max: number = FIELD_MAX): string {
  if (typeof value !== "string") return "";
  const v = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v;
}

export function buildWhatsAppOrderMessage(input: WhatsAppOrderInput): string {
  const business = clean(input.businessName, 80);
  const lines: string[] = [business ? `Hello ${business}, I'd like to place this order:` : "Hello, I'd like to place this order:"];
  const reference = clean(input.reference, 40);
  if (reference) lines.push(`Order ref: ${reference}`);
  lines.push("");

  const items = input.items.filter((i) => Number.isSafeInteger(i.quantity) && i.quantity > 0);
  items.slice(0, WHATSAPP_MAX_ITEMS).forEach((item, n) => {
    const variant = clean(item.variantLabel, 80);
    lines.push(`${n + 1}. ${clean(item.name, 120)}${variant ? ` (${variant})` : ""}`);
    lines.push(`   ${item.quantity} × ${formatNaira(item.unitKobo)} = ${formatNaira(item.lineTotalKobo)}`);
    const url = clean(item.url, 500);
    if (/^https?:\/\//i.test(url)) lines.push(`   ${url}`);
  });
  const extra = items.length - WHATSAPP_MAX_ITEMS;
  if (extra > 0) lines.push(`…and ${extra} more ${extra === 1 ? "item" : "items"}`);

  lines.push("", `Subtotal: ${formatNaira(input.subtotalKobo)}`);
  if (input.deliveryMethod === "pickup") {
    lines.push("Pickup: Free");
    lines.push(`Total: ${formatNaira(input.subtotalKobo)}`);
  } else if (input.deliveryMethod === "agree") {
    lines.push("Delivery or pickup: to be agreed");
  } else if (input.deliveryMethod === "delivery") {
    const fee = Number.isSafeInteger(input.deliveryKobo) && (input.deliveryKobo as number) > 0 ? (input.deliveryKobo as number) : 0;
    lines.push(`Delivery: ${fee > 0 ? formatNaira(fee) : "Free"}`);
    lines.push(`Total: ${formatNaira(input.subtotalKobo + fee)}`);
  }

  const c = input.customer ?? {};
  const details: Array<[string, string]> = [
    ["Name", clean(c.name, 120)],
    ["Phone", clean(c.phone, 40)],
    ["Email", clean(c.email, 254)],
    [input.deliveryMethod === "pickup" ? "" : "Address", input.deliveryMethod === "pickup" ? "" : clean(c.address)],
    ["Notes", clean(c.notes, 500)],
  ];
  const filled = details.filter(([label, value]) => label && value);
  if (filled.length) {
    lines.push("", "My details:");
    for (const [label, value] of filled) lines.push(`${label}: ${value}`);
  }

  lines.push("", "Please confirm availability and how to pay. Thank you!");
  return lines.join("\n");
}

/** Digits only, as wa.me expects. Null when the number can't be a real WhatsApp number. */
export function whatsAppNumber(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

/** wa.me link that opens a chat with the business, message already typed. Null without a usable number. */
export function buildWhatsAppOrderLink(whatsapp: string | null | undefined, message: string): string | null {
  const number = whatsAppNumber(whatsapp);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** One-product "Buy on WhatsApp" message: the item, any options picked so far, and the quantity. */
export function buildWhatsAppProductMessage(input: {
  businessName?: string | null;
  productName: string;
  options?: Record<string, string>;
  quantity?: number;
  unitKobo: number;
  url?: string | null;
}): string {
  const business = clean(input.businessName, 80);
  const qty = Number.isSafeInteger(input.quantity) && (input.quantity as number) > 0 ? (input.quantity as number) : 1;
  const picked = Object.entries(input.options ?? {})
    .map(([k, v]) => [clean(k, 40), clean(v, 80)])
    .filter(([k, v]) => k && v)
    .map(([k, v]) => `${k}: ${v}`);
  const lines = [
    business ? `Hello ${business}, I'd like to buy:` : "Hello, I'd like to buy:",
    "",
    `${clean(input.productName, 120)}${picked.length ? ` (${picked.join(", ")})` : ""}`,
    `Quantity: ${qty} × ${formatNaira(input.unitKobo)} = ${formatNaira(input.unitKobo * qty)}`,
  ];
  const url = clean(input.url, 500);
  if (/^https?:\/\//i.test(url)) lines.push(url);
  lines.push("", "Is it available?");
  return lines.join("\n");
}

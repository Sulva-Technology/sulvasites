/** How a shop takes orders (migration 018). Relative imports only (unit-tested). */
import { whatsAppNumber } from "./whatsappOrder.ts";

export type CheckoutMode = "card" | "card_and_whatsapp" | "whatsapp";

export const CHECKOUT_MODES: readonly CheckoutMode[] = ["card", "card_and_whatsapp", "whatsapp"];

/** Shops created before migration 018 behave as they always did: Paystack plus WhatsApp. */
export const DEFAULT_CHECKOUT_MODE: CheckoutMode = "card_and_whatsapp";

export function parseCheckoutMode(v: unknown): CheckoutMode {
  return CHECKOUT_MODES.includes(v as CheckoutMode) ? (v as CheckoutMode) : DEFAULT_CHECKOUT_MODE;
}

export function cardCheckoutOpen(mode: CheckoutMode): boolean {
  return mode !== "whatsapp";
}

export function whatsAppOrdersOpen(mode: CheckoutMode): boolean {
  return mode !== "card";
}

/**
 * The WhatsApp number shoppers send orders to, or null when WhatsApp ordering is off or no usable
 * number is set. The shop's own orders number wins; otherwise the site's contact WhatsApp.
 */
export function orderWhatsApp(
  settings: { checkoutMode: CheckoutMode; whatsappNumber: string | null } | null | undefined,
  profileWhatsApp: string | null | undefined,
): string | null {
  const mode = settings?.checkoutMode ?? DEFAULT_CHECKOUT_MODE;
  if (!whatsAppOrdersOpen(mode)) return null;
  return whatsAppNumber(settings?.whatsappNumber) ?? whatsAppNumber(profileWhatsApp);
}

/** Admin input → stored value: "+234 803 000 0000" → "+2348030000000"; "" → null; invalid → error. */
export function parseOrdersNumber(raw: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: "Enter a valid WhatsApp number." };
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return { ok: false, error: "Use digits only, with the country code (e.g. +234 803 000 0000)." };
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return { ok: false, error: "Use digits only, with the country code (e.g. +234 803 000 0000)." };
  }
  return { ok: true, value: `${trimmed.startsWith("+") ? "+" : ""}${digits}` };
}

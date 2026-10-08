// Done-for-you brief validation. Pure: relative imports only.
import { normalizePhoneNg } from "../billing/identity.ts";
import { isTier, type Tier } from "./pricing.ts";

export type LeadInput = {
  name: string;
  email: string;
  phone: string;
  business: string;
  category: string | null;
  templateKey: string | null;
  tier: Tier | null;
  domain: string | null;
  notes: string | null;
  honeypot: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function parseLeadInput(body: unknown, templateKeys: readonly string[]): { ok: true; value: LeadInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };
  const b = body as Record<string, unknown>;
  const name = text(b.name, 80);
  const business = text(b.business, 120);
  const email = text(b.email, 254).toLowerCase();
  const rawPhone = text(b.phone, 30);
  if (name.length < 2) return { ok: false, error: "Enter your name." };
  if (business.length < 2) return { ok: false, error: "Enter your business name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  const intl = rawPhone.replace(/[^\d+]/g, "");
  const phone = normalizePhoneNg(rawPhone) ?? (/^\+\d{8,15}$/.test(intl) ? intl : null);
  if (!phone) return { ok: false, error: "Enter a valid phone or WhatsApp number." };
  const domainRaw = text(b.domain, 100).toLowerCase();
  if (domainRaw && !DOMAIN_RE.test(domainRaw)) return { ok: false, error: "Enter a domain like yourbusiness.com.ng." };
  const templateKey = typeof b.templateKey === "string" && templateKeys.includes(b.templateKey) ? b.templateKey : null;
  const notes = typeof b.notes === "string" ? b.notes.trim().slice(0, 2000) : "";
  return {
    ok: true,
    value: {
      name,
      email,
      phone,
      business,
      category: text(b.category, 60) || null,
      templateKey,
      tier: isTier(b.tier) ? b.tier : null,
      domain: domainRaw || null,
      notes: notes || null,
      honeypot: typeof b.website === "string" && b.website.trim() !== "",
    },
  };
}

// Normalises the identity signals used to stop repeat free trials. Pure: no Node APIs (also used in the browser).
import { DISPOSABLE_DOMAINS } from "./disposableDomains.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GMAIL = new Set(["gmail.com", "googlemail.com"]);

/** Lowercase, strip "+tag"; for Gmail also strip dots. Null when not an email. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  if (e.length > 254 || !EMAIL_RE.test(e)) return null;
  const at = e.lastIndexOf("@");
  let local = e.slice(0, at);
  let domain = e.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  if (GMAIL.has(domain)) {
    local = local.split(".").join("");
    domain = "gmail.com";
  }
  return local ? `${local}@${domain}` : null;
}

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

export function isDisposableEmail(email: string, list: ReadonlySet<string> = DISPOSABLE_DOMAINS): boolean {
  const d = emailDomain(email);
  if (list.has(d)) return true;
  for (const x of list) if (d.endsWith(`.${x}`)) return true;
  return false;
}

/** Nigerian mobile number → "+234XXXXXXXXXX", else null. */
export function normalizePhoneNg(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("234")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return /^[789]\d{9}$/.test(d) ? `+234${d}` : null;
}

function clean(s: string): string {
  return s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function businessKey(name: string, city: string): string {
  return `${clean(name)}|${clean(city)}`;
}

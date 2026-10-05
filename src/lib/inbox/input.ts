/**
 * Pure, strict validators for the public inbox API. Relative imports only (unit-tested).
 * Error messages are static strings: they never echo visitor input.
 */

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
export type InboxKind = "enquiry" | "booking";

export type InboxInput = {
  kind: InboxKind;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  extra: Record<string, string>;
  sourcePage: string | null;
  /** True when the hidden honeypot field was filled (bot). */
  honeypot: boolean;
};

const TOP_KEYS = new Set(["kind", "fields", "website", "sourcePage"]);
const FIELD_KEY_RE = /^[a-z][a-z0-9_]{0,23}$/;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const MESSAGE_KEYS = ["message", "notes", "details"];
const IGNORED_KEYS = new Set(["consent", "website"]);

export const MAX = {
  name: 120,
  email: 254,
  phone: 20,
  message: 4000,
  extraValue: 200,
  fieldValue: 4000,
  fields: 24,
  extraKeys: 12,
  sourcePage: 200,
} as const;

function fail<T>(error: string): Parsed<T> {
  return { ok: false, error };
}

function clean(v: string, multiline: boolean): string {
  let s = v.replace(CONTROL_RE, "");
  if (!multiline) s = s.replace(/[\r\n\t]+/g, " ");
  else s = s.replace(/\r\n?/g, "\n");
  return s.replace(/[  ]{2,}/g, " ").trim();
}

export function isValidEmail(v: string): boolean {
  return v.length <= MAX.email && EMAIL_RE.test(v);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function parseInboxBody(body: unknown): Parsed<InboxInput> {
  const INVALID = "Please check your details and try again.";
  if (!isRecord(body)) return fail("Invalid request.");
  for (const k of Object.keys(body)) if (!TOP_KEYS.has(k)) return fail("Invalid request.");

  let kind: InboxKind = "enquiry";
  if (body.kind !== undefined) {
    if (body.kind !== "enquiry" && body.kind !== "booking") return fail("Invalid request.");
    kind = body.kind;
  }

  if (body.website !== undefined && typeof body.website !== "string") return fail("Invalid request.");
  const honeypot = typeof body.website === "string" && body.website.trim().length > 0;

  let sourcePage: string | null = null;
  if (body.sourcePage !== undefined && body.sourcePage !== null) {
    if (typeof body.sourcePage !== "string" || body.sourcePage.length > MAX.sourcePage) return fail("Invalid request.");
    sourcePage = clean(body.sourcePage, false) || null;
  }

  const fields = body.fields;
  if (!isRecord(fields)) return fail("Invalid request.");
  const keys = Object.keys(fields);
  if (keys.length > MAX.fields) return fail("Invalid request.");

  const raw: Record<string, string> = {};
  for (const k of keys) {
    if (!FIELD_KEY_RE.test(k)) return fail("Invalid request.");
    const v = fields[k];
    if (typeof v !== "string" || v.length > MAX.fieldValue + 100) return fail(INVALID);
    raw[k] = v;
  }

  const name = clean(raw.name ?? "", false);
  if (!name) return fail("Please enter your name.");
  if (name.length > MAX.name) return fail("Your name is too long.");

  const emailRaw = clean(raw.email ?? "", false).toLowerCase();
  let email: string | null = null;
  if (emailRaw) {
    if (/[\r\n]/.test(raw.email ?? "") && emailRaw.includes(" ")) return fail("Please enter a valid email address.");
    if (!isValidEmail(emailRaw)) return fail("Please enter a valid email address.");
    email = emailRaw;
  }

  const phoneRaw = clean(raw.phone ?? "", false);
  let phone: string | null = null;
  if (phoneRaw) {
    const digits = phoneRaw.replace(/\D/g, "");
    if (phoneRaw.length > MAX.phone || !/^[+\d][\d\s\-().]*$/.test(phoneRaw) || digits.length < 7 || digits.length > 15) {
      return fail("Please enter a valid phone number.");
    }
    phone = phoneRaw;
  }
  if (!email && !phone) return fail("Please give an email address or phone number so we can reply.");

  let message = "";
  for (const k of MESSAGE_KEYS) {
    const v = clean(raw[k] ?? "", true);
    if (v) {
      message = v;
      break;
    }
  }
  if (message.length > MAX.message) return fail("Your message is too long.");
  if (kind === "enquiry" && message.length < 2) return fail("Please write a message.");

  const extra: Record<string, string> = {};
  for (const k of keys) {
    if (k === "name" || k === "email" || k === "phone" || MESSAGE_KEYS.includes(k) || IGNORED_KEYS.has(k)) continue;
    const v = clean(raw[k]!, false);
    if (!v) continue;
    if (v.length > MAX.extraValue) return fail(INVALID);
    extra[k] = v;
  }
  if (Object.keys(extra).length > MAX.extraKeys) return fail("Invalid request.");

  return { ok: true, value: { kind, name, email, phone, message, extra, sourcePage, honeypot } };
}

/** Cheap heuristic spam score (0-10). >= SPAM_THRESHOLD is stored as spam and does not trigger an email. */
export function spamScore(i: { name: string; message: string }): number {
  const msgUrls = (i.message.match(/(https?:\/\/|www\.)\S+/gi) ?? []).length;
  let score = msgUrls >= 2 ? 4 + (msgUrls - 2) : msgUrls;
  if (/(https?:\/\/|www\.)\S+/i.test(i.name)) score += 3;
  if (/<\/?[a-z][^>]*>/i.test(i.message)) score += 2;
  return Math.min(10, score);
}

export const SPAM_THRESHOLD = 4;

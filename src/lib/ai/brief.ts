// Structured business brief: what the assistant extracts from the chat. Pure helpers, relative imports only.

export type BriefContact = {
  phone: string;
  email: string;
  whatsapp: string;
  address: string;
  instagram: string;
  facebook: string;
  twitter: string;
  tiktok: string;
};

export type Brief = {
  businessName: string;
  whatTheyDo: string;
  location: string;
  audience: string;
  tone: string;
  services: string[];
  contact: BriefContact;
  languages: string[];
  /** true = wants to sell online, false = explicitly not, null = unknown. */
  shopIntent: boolean | null;
  notes: string;
  /** Brand colours in the owner's own words (e.g. "navy and gold"); "" when not stated. */
  colors: string;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

const CONTACT_KEYS = ["phone", "email", "whatsapp", "address", "instagram", "facebook", "twitter", "tiktok"] as const;

export function emptyBrief(): Brief {
  return {
    businessName: "",
    whatTheyDo: "",
    location: "",
    audience: "",
    tone: "",
    services: [],
    contact: { phone: "", email: "", whatsapp: "", address: "", instagram: "", facebook: "", twitter: "", tiktok: "" },
    languages: [],
    shopIntent: null,
    notes: "",
    colors: "",
  };
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function strList(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const s = str(x, maxLen);
    if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

/** Coerces unknown (model or client) input into a safe Brief. */
export function normalizeBrief(raw: unknown): Brief {
  const b = emptyBrief();
  if (!raw || typeof raw !== "object") return b;
  const r = raw as Record<string, unknown>;
  b.businessName = str(r.businessName, 80);
  b.whatTheyDo = str(r.whatTheyDo, 300);
  b.location = str(r.location, 120);
  b.audience = str(r.audience, 200);
  b.tone = str(r.tone, 80);
  b.services = strList(r.services, 8, 80);
  b.languages = strList(r.languages, 4, 30);
  b.notes = str(r.notes, 400);
  b.colors = str(r.colors, 80);
  b.shopIntent = typeof r.shopIntent === "boolean" ? r.shopIntent : null;
  const c = r.contact && typeof r.contact === "object" ? (r.contact as Record<string, unknown>) : {};
  for (const k of CONTACT_KEYS) b.contact[k] = str(c[k], k === "address" ? 200 : 120);
  return b;
}

/** Newer non-empty values win; lists are unioned. */
export function mergeBrief(prev: Brief, next: Brief): Brief {
  const out = emptyBrief();
  for (const k of ["businessName", "whatTheyDo", "location", "audience", "tone", "notes", "colors"] as const) {
    out[k] = next[k] || prev[k];
  }
  out.services = strList([...next.services, ...prev.services], 8, 80);
  out.languages = strList([...next.languages, ...prev.languages], 4, 30);
  out.shopIntent = next.shopIntent ?? prev.shopIntent;
  for (const k of CONTACT_KEYS) out.contact[k] = next.contact[k] || prev.contact[k];
  return out;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?234|0)[\s-]?[789][01]\d[\s-]?\d{3}[\s-]?\d{4}|\+\d[\d\s-]{8,14}\d/;

/** Regex extraction of contact details the owner typed. Never guesses. */
export function extractContactFromText(text: string): Partial<BriefContact> {
  const out: Partial<BriefContact> = {};
  const email = text.match(EMAIL_RE)?.[0];
  if (email) out.email = email;
  const wa = text.match(/whats\s?app[^\d+]{0,25}(\+?\d[\d\s-]{7,16}\d)/i)?.[1];
  const phoneAll = text.match(PHONE_RE)?.[0];
  if (wa) out.whatsapp = wa.trim();
  if (phoneAll && phoneAll.replace(/\D/g, "") !== (wa ?? "").replace(/\D/g, "")) out.phone = phoneAll.trim();
  else if (phoneAll && !wa) out.phone = phoneAll.trim();
  const ig = text.match(/instagram\.com\/([a-z0-9._]+)/i)?.[0] ?? text.match(/\b(?:instagram|insta|ig)\b[^@\w]{0,8}(@[a-z0-9._]+)/i)?.[1];
  if (ig) out.instagram = ig;
  const fb = text.match(/facebook\.com\/[a-z0-9._\-/]+/i)?.[0];
  if (fb) out.facebook = fb;
  const tw = text.match(/(?:twitter|x)\.com\/[a-z0-9_]+/i)?.[0];
  if (tw) out.twitter = tw;
  const tt = text.match(/tiktok\.com\/@?[a-z0-9._]+/i)?.[0];
  if (tt) out.tiktok = tt;
  return out;
}

function digits(s: string) {
  return s.replace(/\D/g, "");
}

function tokens(s: string) {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
}

/**
 * Keeps only contact details the owner really typed. Models invent phones, emails and
 * addresses; anything that cannot be found in the owner's own words is dropped.
 */
export function verifyContact(contact: BriefContact, ownerText: string): BriefContact {
  const text = ownerText.toLowerCase();
  const textDigits = digits(ownerText);
  const textTokens = new Set(tokens(ownerText));
  const out = { ...contact };
  for (const k of ["phone", "whatsapp"] as const) {
    const d = digits(contact[k]);
    if (!d || d.length < 7 || !textDigits.includes(d.replace(/^234/, "0").replace(/^0/, ""))) out[k] = "";
  }
  if (out.email && !text.includes(out.email.toLowerCase())) out.email = "";
  for (const k of ["instagram", "facebook", "twitter", "tiktok"] as const) {
    const handle = contact[k].toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/^@/, "");
    if (!handle || !text.includes(handle.split("/").pop() || handle)) out[k] = "";
  }
  if (out.address) {
    const t = tokens(out.address);
    const hit = t.filter((x) => textTokens.has(x)).length;
    if (t.length === 0 || hit / t.length < 0.7) out.address = "";
  }
  return out;
}

/** Plain-text rendering used inside prompts (callers must delimit it as owner data). */
export function briefToText(b: Brief): string {
  const lines = [
    b.businessName && `Business name: ${b.businessName}`,
    b.whatTheyDo && `What they do: ${b.whatTheyDo}`,
    b.location && `Location: ${b.location}`,
    b.audience && `Customers: ${b.audience}`,
    b.tone && `Tone: ${b.tone}`,
    b.colors && `Colours: ${b.colors}`,
    b.services.length && `Services/products: ${b.services.join("; ")}`,
    b.languages.length && `Languages: ${b.languages.join(", ")}`,
    b.shopIntent !== null && `Wants to sell online: ${b.shopIntent ? "yes" : "no"}`,
    b.notes && `Notes: ${b.notes}`,
  ].filter(Boolean) as string[];
  const c = b.contact;
  const contactBits = CONTACT_KEYS.filter((k) => c[k]).map((k) => `${k}: ${c[k]}`);
  lines.push(contactBits.length ? `Contact the owner gave: ${contactBits.join("; ")}` : "Contact details: none given (do not invent any)");
  return lines.join("\n");
}

/** Everything the facts-check needs: the brief rendered as one lowercase string. */
export function briefFactText(b: Brief): string {
  return `${briefToText(b)} ${Object.values(b.contact).join(" ")}`.toLowerCase();
}

/** Minimum needed to build: a name and what they do. */
export function hasEnoughToBuild(b: Brief): boolean {
  return !!b.businessName && !!b.whatTheyDo;
}

export function isChatMessage(m: unknown): m is ChatMessage {
  if (!m || typeof m !== "object") return false;
  const r = m as Record<string, unknown>;
  return (r.role === "user" || r.role === "assistant") && typeof r.content === "string";
}

/** Cleans a client transcript: valid roles, trimmed, capped. */
/** Long enough for a pasted brief, bio or company profile (~1,200 words). */
export const MAX_MESSAGE_CHARS = 8000;

export function normalizeMessages(raw: unknown, maxMessages = 24, maxChars = MAX_MESSAGE_CHARS): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isChatMessage)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, maxChars) }))
    .filter((m) => m.content)
    .slice(-maxMessages);
}

const NOT_A_NAME = /^(hi|hello|hey|good|please|pls|can|could|i|i'm|im|we|we're|my|our|this|the|a|an|help|build|make|create|need|want)\b/i;

function looksLikeTitle(line: string, maxWords: number): boolean {
  const words = line.split(/\s+/).filter(Boolean);
  return line.length >= 2 && line.length <= 80 && words.length <= maxWords && !/[.?!:;]$/.test(line) && !NOT_A_NAME.test(line);
}

/**
 * Last-resort reading of a pasted profile or brief when the model returned nothing usable:
 * a short first line is the name and the short line under it (or the first sentence) says what
 * they do — e.g. "Iyiola Ogunjobi" / "Builder, founder, problem solver". Returns {} unless both
 * are found, so a chat greeting or a single word never becomes a business name.
 */
export function guessBriefFromText(text: string): Partial<Pick<Brief, "businessName" | "whatTheyDo">> {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/^[#*\s>-]+|[*\s]+$/g, "").trim()).filter(Boolean);
  const first = lines[0];
  if (!first || !looksLikeTitle(first, 8)) return {};
  const second = lines[1] ?? "";
  let whatTheyDo = "";
  if (second && second.length <= 160 && !/[?]$/.test(second)) whatTheyDo = second.split(/(?<=[.!?])\s+/)[0]!.replace(/[.!]$/, "");
  else {
    const sentence = lines.slice(1).join(" ").match(/^[^.!?]{10,200}[.!?]/)?.[0];
    if (sentence) whatTheyDo = sentence.trim();
  }
  if (!whatTheyDo) return {};
  return { businessName: first.slice(0, 80), whatTheyDo: whatTheyDo.slice(0, 300) };
}

export function ownerText(messages: ChatMessage[]): string {
  return messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
}

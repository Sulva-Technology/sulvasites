// Pure input validation for the business data managers. Mirrors the SQL checks in migration 009
// (business_item_data_ok) so people get friendly messages before the database says no.
import { kindDefForTemplate, type FieldDef, type KindDef } from "./kinds.ts";
import { koboToNairaInput, parseNairaToKobo } from "./price.ts";
import type { BusinessItemInput, BusinessKind } from "./types.ts";

export const NAME_MAX = 120;
export const HTTPS_URL_RE = /^https:\/\/[^\s<>"]+$/;
const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export type RawItemForm = {
  name: string;
  /** Naira text as typed; ignored for kinds without a price. */
  price: string;
  /** Raw field values keyed by FieldDef.key: string, string[] (tags / images). */
  fields: Record<string, string | string[] | undefined>;
  active: boolean;
};

export type ParseResult =
  | { ok: true; value: BusinessItemInput }
  | { ok: false; errors: Record<string, string> };

const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

function clean(v: string, multiline: boolean): string {
  let s = v.replace(/\r\n?/g, "\n").replace(CONTROL_RE, "");
  s = multiline ? s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n") : s.replace(/\s+/g, " ");
  return s.trim();
}

function checkField(def: FieldDef, raw: string | string[] | undefined, errors: Record<string, string>): unknown {
  const key = def.key;
  const empty = (msg?: string) => {
    if (def.required) errors[key] = msg ?? `${def.label} is required.`;
    return undefined;
  };

  switch (def.type) {
    case "text":
    case "textarea": {
      const s = typeof raw === "string" ? clean(raw, def.type === "textarea") : "";
      if (!s) return empty();
      if (def.max && s.length > def.max) {
        errors[key] = `${def.label} must be at most ${def.max} characters.`;
        return undefined;
      }
      return s;
    }
    case "select": {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (!s) return empty(`Choose a ${def.label.toLowerCase()}.`);
      if (!def.options?.some((o) => o.value === s)) {
        errors[key] = `Choose a valid ${def.label.toLowerCase()}.`;
        return undefined;
      }
      return s;
    }
    case "time": {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (!s) return empty(`Set a ${def.label.toLowerCase()} time.`);
      if (!TIME_RE.test(s)) {
        errors[key] = "Use a time like 06:30.";
        return undefined;
      }
      return s;
    }
    case "image": {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (!s) return empty();
      if (s.length > 600 || !HTTPS_URL_RE.test(s)) {
        errors[key] = "Image link must start with https:// (upload a photo or pick a suggestion).";
        return undefined;
      }
      return s;
    }
    case "images": {
      const list = (Array.isArray(raw) ? raw : []).map((u) => u.trim()).filter(Boolean);
      const max = def.maxItems ?? 6;
      if (list.length === 0) return empty();
      if (list.length > max) {
        errors[key] = `At most ${max} photos.`;
        return undefined;
      }
      if (list.some((u) => u.length > 600 || !HTTPS_URL_RE.test(u))) {
        errors[key] = "Every photo link must start with https://.";
        return undefined;
      }
      return Array.from(new Set(list));
    }
    case "tags": {
      const list = Array.isArray(raw) ? raw : [];
      const allowed = new Set((def.options ?? []).map((o) => o.value));
      if (list.some((t) => !allowed.has(t))) {
        errors[key] = `Invalid ${def.label.toLowerCase()}.`;
        return undefined;
      }
      const uniq = Array.from(new Set(list));
      return uniq.length ? uniq : empty();
    }
  }
}

/** Validate + normalise the form for one kind. Empty optional fields are omitted from `data`. */
export function parseItemForm(
  kind: BusinessKind,
  templateKey: string | null | undefined,
  form: RawItemForm,
  defOverride?: KindDef,
): ParseResult {
  const def = defOverride ?? kindDefForTemplate(kind, templateKey);
  const errors: Record<string, string> = {};

  const name = clean(form.name ?? "", false);
  if (!name) errors.name = `${def.nameLabel} is required.`;
  else if (name.length > NAME_MAX) errors.name = `${def.nameLabel} must be at most ${NAME_MAX} characters.`;

  let price_kobo: number | null = null;
  if (def.priceLabel) {
    const p = parseNairaToKobo(form.price ?? "");
    if ("error" in p) errors.price = p.error;
    else price_kobo = p.kobo;
  }

  const data: Record<string, unknown> = {};
  for (const f of def.fields) {
    const v = checkField(f, form.fields[f.key], errors);
    if (v !== undefined) data[f.key] = v;
  }

  if (typeof data.start === "string" && typeof data.end === "string" && data.end <= data.start) {
    errors.end = "End time must be after the start time.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, price_kobo, data, active: Boolean(form.active) } };
}

/** The inverse of parseItemForm: row -> editable form values. */
export function itemToForm(
  def: KindDef,
  item: { name: string; price_kobo: number | null; data: Record<string, unknown>; active: boolean },
): RawItemForm {
  const fields: RawItemForm["fields"] = {};
  for (const f of def.fields) {
    const v = item.data[f.key];
    if (f.type === "tags" || f.type === "images") {
      fields[f.key] = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } else {
      fields[f.key] = typeof v === "string" ? v : "";
    }
  }
  return { name: item.name, price: koboToNairaInput(item.price_kobo), fields, active: item.active };
}

export function emptyForm(def: KindDef): RawItemForm {
  return itemToForm(def, { name: "", price_kobo: null, data: {}, active: true });
}

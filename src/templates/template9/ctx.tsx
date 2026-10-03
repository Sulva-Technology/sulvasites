"use client";

import { createContext, useContext } from "react";

import type { PageData } from "@/lib/pageSchema";
import type { NavPage, TemplateProps } from "@/templates/registry";
import type { ColorMode } from "@/templates/shared/colorMode";

export type T9Ctx = {
  baseUrl: string;
  navPages: NavPage[];
  /** Every real photo from the site's galleries — reused for heroes, plan and programme panels. */
  photos: Array<{ url: string; alt: string }>;
  /** Opening hours lines (profile `socials.hours`, else day/time lines found in rich text). */
  hours: string[];
  /** Class (service) titles across pages — feed the marquee and the trial form's class select. */
  classNames: string[];
  /** Whether the current page has its own trial / sign-up form to jump to. */
  pageHasForm: boolean;
  profile: TemplateProps["profile"];
  pageKind: "home" | "about" | "contact" | "extra";
  pageLabel: string;
  mode: ColorMode;
  toggleMode: () => void;
};

const Ctx = createContext<T9Ctx | null>(null);

export const T9Provider = Ctx.Provider;

export function useT9(): T9Ctx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT9 must be used inside Template9");
  return v;
}

/**
 * "Start free trial" / "Book class": the form on this page if there is one, else the contact
 * page's form. A class or plan title is passed as `?service=` and preselected in the form.
 */
export function joinHref(ctx: Pick<T9Ctx, "baseUrl" | "pageHasForm">, service?: string) {
  const q = service ? `?service=${encodeURIComponent(service)}` : "";
  if (ctx.pageHasForm) return `${q}#join`;
  return `${ctx.baseUrl}/contact${q}#join`;
}

export function directionsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Last comma-separated part of the address ("12 Admiralty Way, Lekki, Lagos" → "Lagos"). */
export function cityOf(address: string | null | undefined) {
  return address?.split(",").map((s) => s.trim()).filter(Boolean).slice(-1)[0] ?? "";
}

/** Unique, non-empty service titles across pages, in order. */
export function collectClassNames(pages: Array<PageData | undefined>): string[] {
  const out: string[] = [];
  for (const page of pages) {
    for (const s of page?.sections ?? []) {
      if (s?.type !== "services") continue;
      for (const it of s.items ?? []) {
        const t = it.title?.trim();
        if (t && !out.includes(t)) out.push(t);
      }
    }
  }
  return out.slice(0, 24);
}

const DAY = /\b(mon|tue|wed|thu|fri|sat|sun|daily|every ?day|weekdays?|weekends?)/i;
const TIME = /\b\d{1,2}([:.]\d{2})?\s*(am|pm)?\b|\b(noon|midnight|late|closed)\b/i;

/** Opening hours: `socials.hours` (one line per row) or day/time lines found in rich text. */
export function collectHours(profile: TemplateProps["profile"], pages: Array<PageData | undefined>): string[] {
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const saved = typeof socials.hours === "string" ? socials.hours : "";
  const fromProfile = saved
    .split(/\r?\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromProfile.length) return fromProfile.slice(0, 8);

  const out: string[] = [];
  for (const page of pages) {
    for (const s of page?.sections ?? []) {
      if (s?.type !== "richtext" || typeof s.body !== "string") continue;
      const lines = s.body
        .split(/<\/(?:li|p|h\d|div)>|<br\s*\/?>/i)
        .map((chunk) => chunk.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim())
        .filter((line) => line.length > 0 && line.length <= 60 && DAY.test(line) && TIME.test(line));
      for (const line of lines) if (!out.includes(line)) out.push(line);
    }
  }
  return out.slice(0, 8);
}

/** Splits "Mon–Fri · 06:00–22:00" into ["Mon–Fri", "06:00–22:00"] for two-column rows. */
export function splitHoursLine(line: string): [string, string] | null {
  const m = line.match(/^([^\d]+?)\s*[·|:—–-]?\s*(\d.*|closed.*)$/i);
  return m && m[1].trim() ? [m[1].trim(), m[2].trim()] : null;
}

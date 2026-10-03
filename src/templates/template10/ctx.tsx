"use client";

import { createContext, useContext } from "react";

import type { PageData } from "@/lib/pageSchema";
import type { NavPage, TemplateProps } from "@/templates/registry";
import type { ColorMode } from "@/templates/shared/colorMode";

export type T10Ctx = {
  baseUrl: string;
  navPages: NavPage[];
  /** Every real photo from the site's galleries — reused for the hero collage and page heroes. */
  photos: Array<{ url: string; alt: string }>;
  /** Office hours lines (profile `socials.hours`, else day/time lines found in rich text). */
  hours: string[];
  /** Programme (service) titles across pages — feed the enquiry form's programme select. */
  programmes: string[];
  /** Value titles across pages — the labelled highlights row under the home hero. */
  highlights: string[];
  /** Whether the current page has its own enquiry form to jump to. */
  pageHasForm: boolean;
  profile: TemplateProps["profile"];
  pageKind: "home" | "about" | "contact" | "extra";
  pageLabel: string;
  mode: ColorMode;
  toggleMode: () => void;
};

const Ctx = createContext<T10Ctx | null>(null);

export const T10Provider = Ctx.Provider;

export function useT10(): T10Ctx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT10 must be used inside Template10");
  return v;
}

export type Intent = "apply" | "visit" | "question";

/**
 * "Apply now" / "Book a visit" / "Enquire": the enquiry form on this page if there is one, else
 * the contact page's. `?intent=` preselects what the visitor wants to do and `?service=` the
 * programme, so the form arrives already filled in.
 */
export function applyHref(
  ctx: Pick<T10Ctx, "baseUrl" | "pageHasForm">,
  opts: { intent?: Intent; service?: string } = {},
) {
  const params = new URLSearchParams();
  if (opts.intent && opts.intent !== "apply") params.set("intent", opts.intent);
  if (opts.service) params.set("service", opts.service);
  const q = params.toString() ? `?${params.toString()}` : "";
  if (ctx.pageHasForm) return `${q}#apply`;
  return `${ctx.baseUrl}/contact${q}#apply`;
}

export function directionsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Last comma-separated part of the address ("12 Admiralty Way, Lekki, Lagos" → "Lagos"). */
export function cityOf(address: string | null | undefined) {
  return address?.split(",").map((s) => s.trim()).filter(Boolean).slice(-1)[0] ?? "";
}

/** Unique, non-empty item titles of one section type across pages, in order. */
export function collectTitles(pages: Array<PageData | undefined>, type: "services" | "values", max: number): string[] {
  const out: string[] = [];
  for (const page of pages) {
    for (const s of page?.sections ?? []) {
      if (s?.type !== type) continue;
      for (const it of s.items ?? []) {
        const t = it.title?.trim();
        if (t && !out.includes(t)) out.push(t);
      }
    }
  }
  return out.slice(0, max);
}

const DAY = /\b(mon|tue|wed|thu|fri|sat|sun|daily|every ?day|weekdays?|weekends?)/i;
const TIME = /\b\d{1,2}([:.]\d{2})?\s*(am|pm)?\b|\b(noon|midnight|late|closed)\b/i;

/** Office hours: `socials.hours` (one line per row) or day/time lines found in rich text. */
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

/** Splits "Mon–Fri · 07:30–16:00" into ["Mon–Fri", "07:30–16:00"] for two-column rows. */
export function splitHoursLine(line: string): [string, string] | null {
  const m = line.match(/^([^\d]+?)\s*[·|:—–-]?\s*(\d.*|closed.*)$/i);
  return m && m[1].trim() ? [m[1].trim(), m[2].trim()] : null;
}

/**
 * Splits a headline so its last word can carry the sunflower scribble:
 * "Where curious minds grow." → ["Where curious minds ", "grow."].
 */
export function splitHighlight(text: string): [string, string] {
  const t = text.trim();
  const i = t.lastIndexOf(" ");
  if (i < 0) return ["", t];
  return [t.slice(0, i + 1), t.slice(i + 1)];
}

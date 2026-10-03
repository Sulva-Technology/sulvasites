"use client";

import { createContext, useContext } from "react";

import type { PageData } from "@/lib/pageSchema";
import type { NavPage, TemplateProps } from "@/templates/registry";
import type { ColorMode } from "@/templates/shared/colorMode";

export type T11Ctx = {
  baseUrl: string;
  navPages: NavPage[];
  /** Every real photo from the site's galleries — reused for the hero ticket and page heroes. */
  photos: Array<{ url: string; alt: string }>;
  /** Opening hours lines (profile `socials.hours`, else day/time lines found in rich text). */
  hours: string[];
  /** Package (service) titles across pages — hero stickers and the enquiry form's event select. */
  packages: string[];
  /** Whether the current page shows a packages (services) section to jump to. */
  pageHasPackages: boolean;
  /** Whether the current page has its own enquiry form to jump to. */
  pageHasForm: boolean;
  profile: TemplateProps["profile"];
  pageKind: "home" | "about" | "contact" | "extra";
  pageLabel: string;
  mode: ColorMode;
  toggleMode: () => void;
};

const Ctx = createContext<T11Ctx | null>(null);

export const T11Provider = Ctx.Provider;

export function useT11(): T11Ctx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT11 must be used inside Template11");
  return v;
}

/**
 * "Plan your event": the enquiry form on this page if there is one, else the contact page's.
 * `?service=` preselects the package / event type, so the form arrives already filled in.
 */
export function planHref(ctx: Pick<T11Ctx, "baseUrl" | "pageHasForm">, opts: { service?: string } = {}) {
  const q = opts.service ? `?${new URLSearchParams({ service: opts.service }).toString()}` : "";
  if (ctx.pageHasForm) return `${q}#plan`;
  return `${ctx.baseUrl}/contact${q}#plan`;
}

/** Where "See packages" goes: this page's packages, else a published packages page, else nowhere. */
export function packagesHref(ctx: Pick<T11Ctx, "baseUrl" | "navPages" | "pageHasPackages">): string | null {
  if (ctx.pageHasPackages) return "#packages";
  const page = ctx.navPages.find((p) => p.key === "packages");
  return page ? `${ctx.baseUrl}/p/${page.key}` : null;
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

/** Splits "Mon–Fri · 09:00–18:00" into ["Mon–Fri", "09:00–18:00"] for two-column rows. */
export function splitHoursLine(line: string): [string, string] | null {
  const m = line.match(/^([^\d]+?)\s*[·|:—–-]?\s*(\d.*|closed.*|by appointment.*)$/i);
  return m && m[1].trim() ? [m[1].trim(), m[2].trim()] : null;
}

/**
 * Splits a headline so its last word can carry the violet→peach gradient:
 * "Celebrations people talk about." → ["Celebrations people talk ", "about."].
 */
export function splitHighlight(text: string): [string, string] {
  const t = text.trim();
  const i = t.lastIndexOf(" ");
  if (i < 0) return ["", t];
  return [t.slice(0, i + 1), t.slice(i + 1)];
}

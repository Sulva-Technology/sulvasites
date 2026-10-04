"use client";

import { createContext, useContext } from "react";

import type { PageData } from "@/lib/pageSchema";
import type { NavPage, TemplateProps } from "@/templates/registry";
import type { ColorMode } from "@/templates/shared/colorMode";

export type T12Ctx = {
  baseUrl: string;
  navPages: NavPage[];
  /** Every real photo from the site's galleries — reused for heroes and project covers. */
  photos: Array<{ url: string; alt: string }>;
  /** Opening hours lines (profile `socials.hours`, else day/time lines found in rich text). */
  hours: string[];
  /** Service titles across pages — the quote forms' service select. */
  services: string[];
  /** Licence / certification names from backed_by sections across pages — hero trust badges. */
  credentials: string[];
  /** Whether the current page shows a services section to jump to. */
  pageHasServices: boolean;
  /** Whether the current page has its own quote form to jump to. */
  pageHasForm: boolean;
  /** Whether the current page shows a backed_by band (the home hero then skips its badge row). */
  pageHasCredentials: boolean;
  profile: TemplateProps["profile"];
  pageKind: "home" | "about" | "contact" | "extra";
  pageLabel: string;
  mode: ColorMode;
  toggleMode: () => void;
};

const Ctx = createContext<T12Ctx | null>(null);

export const T12Provider = Ctx.Provider;

export function useT12(): T12Ctx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT12 must be used inside Template12");
  return v;
}

export type QuoteParams = { service?: string; name?: string; phone?: string };

/** `?service=…&name=…&phone=…` with only the non-empty values (encodeURIComponent). */
export function quoteQuery(params: QuoteParams) {
  const parts = (Object.entries(params) as Array<[string, string | undefined]>)
    .map(([k, v]) => [k, v?.trim() ?? ""] as const)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/**
 * "Get a quote": the quote form on this page if there is one, else the contact page's.
 * The query prefills the form (service, name, phone).
 */
export function quoteHref(ctx: Pick<T12Ctx, "baseUrl" | "pageHasForm">, params: QuoteParams = {}) {
  const q = quoteQuery(params);
  if (ctx.pageHasForm) return `${q}#quote`;
  return `${ctx.baseUrl}/contact${q}#quote`;
}

/** Where "Our services" goes: this page's services, else a published services page, else nowhere. */
export function servicesHref(ctx: Pick<T12Ctx, "baseUrl" | "navPages" | "pageHasServices">): string | null {
  if (ctx.pageHasServices) return "#services";
  const page = ctx.navPages.find((p) => p.key === "services");
  return page ? `${ctx.baseUrl}/p/${page.key}` : null;
}

export function directionsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Last comma-separated part of the address ("4 Old Mill Road, Ojodu, Lagos" → "Lagos"). */
export function cityOf(address: string | null | undefined) {
  return address?.split(",").map((s) => s.trim()).filter(Boolean).slice(-1)[0] ?? "";
}

/** Unique, non-empty service titles across pages, in order. */
export function collectServices(pages: Array<PageData | undefined>, max: number): string[] {
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
  return out.slice(0, max);
}

/** Unique, named backed_by entries across pages (licences, certifications, memberships). */
export function collectCredentials(pages: Array<PageData | undefined>, max: number): string[] {
  const out: string[] = [];
  for (const page of pages) {
    for (const s of page?.sections ?? []) {
      if (s?.type !== "backed_by") continue;
      for (const l of s.logos ?? []) {
        const n = l.name?.trim();
        if (n && !out.includes(n)) out.push(n);
      }
    }
  }
  return out.slice(0, max);
}

const DAY = /\b(mon|tue|wed|thu|fri|sat|sun|daily|every ?day|weekdays?|weekends?)/i;
const TIME = /\b\d{1,2}[:.]\d{2}\b|\b\d{1,2}\s*(am|pm)\b|\b(noon|midnight|closed)\b/i;

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

/** Splits "Mon–Fri · 07:30–17:30" into ["Mon–Fri", "07:30–17:30"] for two-column rows. */
export function splitHoursLine(line: string): [string, string] | null {
  const m = line.match(/^([^\d]+?)\s*[·|:—–-]?\s*(\d.*|closed.*|by appointment.*|emergency.*)$/i);
  return m && m[1].trim() ? [m[1].trim(), m[2].trim()] : null;
}

/** The business's own trust line (e.g. "Licensed & insured"), saved in `socials.licence`. */
export function licenceOf(profile: TemplateProps["profile"]) {
  const socials = (profile.socials || {}) as Record<string, unknown>;
  return typeof socials.licence === "string" ? socials.licence.trim() : "";
}

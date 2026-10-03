"use client";

import { createContext, useContext } from "react";

import type { PageData } from "@/lib/pageSchema";
import type { NavPage, TemplateProps } from "@/templates/registry";
import type { ColorMode } from "@/templates/shared/colorMode";

export type T7Ctx = {
  baseUrl: string;
  navPages: NavPage[];
  /** Every real photo from the site's galleries — reused for heroes, plates and cards. */
  photos: Array<{ url: string; alt: string }>;
  /** Opening hours lines (profile `socials.hours`, else lines found in rich text). */
  hours: string[];
  /** Whether the home page has a services ("menu") section to jump to. */
  homeHasMenu: boolean;
  profile: TemplateProps["profile"];
  pageKind: "home" | "about" | "contact" | "extra";
  pageLabel: string;
  mode: ColorMode;
  toggleMode: () => void;
};

const Ctx = createContext<T7Ctx | null>(null);

export const T7Provider = Ctx.Provider;

export function useT7(): T7Ctx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT7 must be used inside Template7");
  return v;
}

function pageHref(ctx: T7Ctx, key: string) {
  return ctx.navPages.some((p) => p.key === key) ? `${ctx.baseUrl}/p/${key}` : null;
}

/** "Reserve a table": the Reservations page if published, else the contact form. */
export function reserveHref(ctx: T7Ctx, occasion?: string) {
  const base = pageHref(ctx, "reservations") ?? `${ctx.baseUrl}/contact`;
  const q = occasion ? `?occasion=${encodeURIComponent(occasion)}` : "";
  return `${base}${q}#reserve`;
}

/** "View menu": the Menu page if published, else the menu section on the home page. */
export function menuHref(ctx: T7Ctx) {
  return pageHref(ctx, "menu") ?? (ctx.homeHasMenu ? `${ctx.baseUrl}/#menu` : `${ctx.baseUrl}/contact`);
}

export function directionsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Last comma-separated part of the address ("12 Admiralty Way, Lekki, Lagos" → "Lagos"). */
export function cityOf(address: string | null | undefined) {
  return address?.split(",").map((s) => s.trim()).filter(Boolean).slice(-1)[0] ?? "";
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

/** Splits "Tue–Thu · 12:00–22:00" into ["Tue–Thu", "12:00–22:00"] for leader rows. */
export function splitHoursLine(line: string): [string, string] | null {
  const m = line.match(/^([^\d]+?)\s*[·|:—–-]?\s*(\d.*|closed.*)$/i);
  return m && m[1].trim() ? [m[1].trim(), m[2].trim()] : null;
}

const PRICE = /^(?:[₦$£€]|NGN|USD|GBP|EUR)?\s?\d[\d.,]*\s?[kK]?(?:\s?(?:[₦$£€]|NGN|USD|GBP|EUR))?$/;

/** "Suya lamb chops · ₦14,500" → ["Suya lamb chops", "₦14,500"]; titles without a price stay whole. */
export function splitPrice(title: string): [string, string | null] {
  const m = title.match(/^(.+?)\s*(?:\s[·|—–-]\s|\.{2,}|…)\s*(.+)$/);
  if (m && PRICE.test(m[2].trim())) return [m[1].trim(), m[2].trim()];
  return [title, null];
}

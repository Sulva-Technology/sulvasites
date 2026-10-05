"use client";

import { createContext, useContext } from "react";

import type { PageData } from "@/lib/pageSchema";
import type { useCart } from "@/lib/shop/useCart";
import type { ShopData, ShopView } from "@/lib/shop/types";
import type { NavPage, TemplateProps } from "@/templates/registry";
import type { ColorMode } from "@/templates/shared/colorMode";

export type T14Ctx = {
  baseUrl: string;
  navPages: NavPage[];
  /** Every real photo from the site's galleries, reused for heroes and covers. */
  photos: Array<{ url: string; alt: string }>;
  /** Opening hours lines (profile `socials.hours`, else day/time lines found in rich text). */
  hours: string[];
  profile: TemplateProps["profile"];
  pageKind: "home" | "about" | "contact" | "extra" | "shop";
  pageLabel: string;
  mode: ColorMode;
  toggleMode: () => void;
  /** Storefront data, when the shop is live for this site. Without it the cart/shop UI is hidden. */
  shop: ShopData | null;
  siteId: string;
  cart: ReturnType<typeof useCart>;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** Politely announces a message to screen readers (e.g. "Added to your cart"). */
  announce: (message: string) => void;
  /** Store search text, shared by the header search box and the product list filter. */
  query: string;
  setQuery: (q: string) => void;
  /** Which storefront view is showing, or null on ordinary pages. */
  shopViewKind: ShopView["kind"] | null;
};

const Ctx = createContext<T14Ctx | null>(null);

export const T14Provider = Ctx.Provider;

export function useT14(): T14Ctx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT14 must be used inside Template14");
  return v;
}

export const shopHref = (baseUrl: string) => `${baseUrl}/shop`;

export function directionsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Last comma-separated part of the address ("7 Akin Adesola Street, Victoria Island, Lagos" -> "Lagos"). */
export function cityOf(address: string | null | undefined) {
  return address?.split(",").map((s) => s.trim()).filter(Boolean).slice(-1)[0] ?? "";
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

/** Splits "Mon-Fri · 07:30-17:30" into two columns for hours rows. */
export function splitHoursLine(line: string): [string, string] | null {
  const m = line.match(/^([^\d]+?)\s*[·|:—–-]?\s*(\d.*|closed.*|by appointment.*)$/i);
  return m && m[1].trim() ? [m[1].trim(), m[2].trim()] : null;
}

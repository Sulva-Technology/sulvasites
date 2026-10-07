"use client";

import { createContext, useContext } from "react";

import type { PageData } from "@/lib/pageSchema";
import type { NavPage, TemplateProps } from "@/templates/registry";
import type { ColorMode } from "@/templates/shared/colorMode";

export type Media = { url: string; alt: string };

export type T16Ctx = {
  baseUrl: string;
  navPages: NavPage[];
  /** Every real photo from the site's galleries — reused for heroes and community covers. */
  photos: Media[];
  /** Community / circle titles across pages — the join form's "Circle" select. */
  circles: string[];
  /** Short figures from the page's first values section ("30+ members") — the home hero's pills. */
  heroStats: string[];
  /** Whether the current page lists the communities (use_cases) to jump to. */
  pageHasCircles: boolean;
  /** Whether the current page has its own join form to jump to. */
  pageHasForm: boolean;
  profile: TemplateProps["profile"];
  pageKind: "home" | "about" | "contact" | "extra";
  pageLabel: string;
  mode: ColorMode;
  toggleMode: () => void;
};

const Ctx = createContext<T16Ctx | null>(null);

export const T16Provider = Ctx.Provider;

export function useT16(): T16Ctx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT16 must be used inside Template16");
  return v;
}

/** Gallery photos across pages, de-duplicated (videos skipped). */
export function collectPhotos(pages: Array<PageData | undefined>): Media[] {
  const seen = new Set<string>();
  const out: Media[] = [];
  for (const page of pages) {
    for (const s of page?.sections ?? []) {
      if (s?.type !== "gallery") continue;
      for (const img of s.images ?? []) {
        const url = img.url?.trim();
        if (!url || seen.has(url) || /\.(mp4|webm|mov)(\?.*)?$/i.test(url)) continue;
        seen.add(url);
        out.push({ url, alt: img.alt || "" });
      }
    }
  }
  return out;
}

/** Unique, non-empty use_cases titles (the communities) across pages, in order. */
export function collectCircles(pages: Array<PageData | undefined>, max: number): string[] {
  const out: string[] = [];
  for (const page of pages) {
    for (const s of page?.sections ?? []) {
      if (s?.type !== "use_cases") continue;
      for (const it of s.items ?? []) {
        const t = it.title?.trim();
        if (t && !out.includes(t)) out.push(t);
      }
    }
  }
  return out.slice(0, max);
}

/** "30+" + "Members" → "30+ Members" pills from the page's first values section (short ones only). */
export function collectHeroStats(page: PageData | undefined, max: number): string[] {
  const values = page?.sections?.find((s) => s?.type === "values");
  if (values?.type !== "values") return [];
  return (values.items ?? [])
    .map((it) => [it.title?.trim(), it.desc?.trim()].filter(Boolean).join(" "))
    .filter((s) => s && s.length <= 28)
    .slice(0, max);
}

const PRICE =/^(?:[₦$£€]|NGN|USD|GHS|KES|Free$)/i;

/**
 * Splits a community description into a price, short detail chips and the remaining sentence.
 * Items from the Communities manager are saved as "Online · Ongoing · ₦25,000 · Weekly calls…".
 */
export function circleMeta(description: string | undefined): { price: string; chips: string[]; text: string } {
  const parts = (description ?? "")
    .split(" · ")
    .map((p) => p.trim())
    .filter(Boolean);
  // A single description is a sentence, not a detail list.
  if (parts.length <= 1) return { price: "", chips: [], text: parts[0] ?? "" };
  let price = "";
  const chips: string[] = [];
  const rest: string[] = [];
  for (const p of parts) {
    if (!price && rest.length === 0 && p.length <= 24 && PRICE.test(p)) price = p;
    else if (p.length <= 26 && chips.length < 3 && rest.length === 0) chips.push(p);
    else rest.push(p);
  }
  return { price, chips, text: rest.join(" · ") };
}

/**
 * "Circlers don't blend in, they stand out" → lines with the phrase before the first comma
 * set in serif italic: [["Circlers don't ", "blend in,"], ["they stand out", ""]].
 * Explicit line breaks win; with no comma the last word is the italic one.
 */
export function splitHeadline(headline: string): Array<[plain: string, accent: string]> {
  const text = headline.trim();
  if (!text) return [];
  let lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 1) {
    const comma = text.indexOf(",");
    lines = comma > 0 && comma < text.length - 1 ? [text.slice(0, comma + 1), text.slice(comma + 1).trim()] : [text];
  }
  const first = lines[0]!.split(/\s+/);
  const take = lines.length > 1 && first.length > 2 ? 2 : 1;
  const plain = first.slice(0, first.length - take).join(" ");
  const out: Array<[string, string]> = [[plain ? `${plain} ` : "", first.slice(-take).join(" ")]];
  for (const l of lines.slice(1)) out.push([l, ""]);
  return out;
}

/** `?circle=…` for the join form, empty when no circle. */
export function circleQuery(circle?: string) {
  const v = circle?.trim();
  return v ? `?circle=${encodeURIComponent(v)}` : "";
}

/** "Join": the join form on this page if there is one, else the contact page's. */
export function joinHref(ctx: Pick<T16Ctx, "baseUrl" | "pageHasForm">, circle?: string) {
  const q = circleQuery(circle);
  if (ctx.pageHasForm) return `${q}#join`;
  return `${ctx.baseUrl}/contact${q}#join`;
}

export function directionsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Last comma-separated part of the address ("4 Admiralty Way, Lekki, Lagos" → "Lagos"). */
export function cityOf(address: string | null | undefined) {
  return address?.split(",").map((s) => s.trim()).filter(Boolean).slice(-1)[0] ?? "";
}

/** Meeting times saved in `socials.hours` (one per row). */
export function hoursOf(profile: TemplateProps["profile"]): string[] {
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const saved = typeof socials.hours === "string" ? socials.hours : "";
  return saved
    .split(/\r?\n|;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

"use client";

import { createContext, useContext } from "react";

import type { PageData } from "@/lib/pageSchema";
import type { NavPage, TemplateProps } from "@/templates/registry";
import type { ColorMode } from "@/templates/shared/colorMode";

export type Media = { url: string; alt: string };

export type T15Ctx = {
  baseUrl: string;
  navPages: NavPage[];
  /** Every real photo from the site's galleries — reused for heroes and vehicle covers. */
  photos: Media[];
  /** First video found in a gallery (.mp4 / .webm / .mov) — plays behind the home hero. */
  video: Media | null;
  /** Vehicle / collection titles across pages — the enquiry form's "Vehicle" select. */
  vehicles: string[];
  /** First collection / inventory item across pages — the home hero's "Featured" glass card. */
  featured: { title: string; description: string } | null;
  /** Whether the current page shows the collection (use_cases) to jump to. */
  pageHasCollection: boolean;
  /** Whether the current page has its own enquiry form to jump to. */
  pageHasForm: boolean;
  profile: TemplateProps["profile"];
  pageKind: "home" | "about" | "contact" | "extra";
  pageLabel: string;
  mode: ColorMode;
  toggleMode: () => void;
};

const Ctx = createContext<T15Ctx | null>(null);

export const T15Provider = Ctx.Provider;

export function useT15(): T15Ctx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT15 must be used inside Template15");
  return v;
}

const VIDEO = /\.(mp4|webm|mov)(\?.*)?$/i;

export function isVideoUrl(url: string | null | undefined): boolean {
  return !!url && VIDEO.test(url);
}

/** Gallery media across pages, de-duplicated, split into photos and videos. */
export function collectMedia(pages: Array<PageData | undefined>): { photos: Media[]; videos: Media[] } {
  const seen = new Set<string>();
  const photos: Media[] = [];
  const videos: Media[] = [];
  for (const page of pages) {
    for (const s of page?.sections ?? []) {
      if (s?.type !== "gallery") continue;
      for (const img of s.images ?? []) {
        const url = img.url?.trim();
        if (!url || seen.has(url)) continue;
        seen.add(url);
        (isVideoUrl(url) ? videos : photos).push({ url, alt: img.alt || "" });
      }
    }
  }
  return { photos, videos };
}

/** Unique, non-empty use_cases titles (the collection / inventory) across pages, in order. */
export function collectVehicles(pages: Array<PageData | undefined>, max: number): string[] {
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

/** First titled use_cases item across pages. */
export function firstVehicle(pages: Array<PageData | undefined>): { title: string; description: string } | null {
  for (const page of pages) {
    for (const s of page?.sections ?? []) {
      if (s?.type !== "use_cases") continue;
      const it = (s.items ?? []).find((i) => i.title?.trim());
      if (it) return { title: it.title.trim(), description: it.description?.trim() ?? "" };
    }
  }
  return null;
}

/**
 * Splits a vehicle description into short spec chips and the remaining sentence.
 * Inventory items are saved as "Lagos · Available · ₦45,000,000 · Fully restored…".
 */
export function specChips(description: string | undefined): { chips: string[]; text: string } {
  const parts = (description ?? "")
    .split(" · ")
    .map((p) => p.trim())
    .filter(Boolean);
  const chips: string[] = [];
  const rest: string[] = [];
  for (const p of parts) (p.length <= 26 && chips.length < 4 && rest.length === 0 ? chips : rest).push(p);
  // A single short description is a sentence, not a spec list.
  if (parts.length === 1) return { chips: [], text: parts[0] ?? "" };
  return { chips, text: rest.join(" · ") };
}

/** "Sold" / "Under offer" chips get their own look. */
export function chipTone(chip: string): "sold" | "held" | undefined {
  if (/^sold$/i.test(chip)) return "sold";
  if (/^(under offer|reserved)$/i.test(chip)) return "held";
  return undefined;
}

/** `?vehicle=…` for the enquiry form (encodeURIComponent), empty when no vehicle. */
export function vehicleQuery(vehicle?: string) {
  const v = vehicle?.trim();
  return v ? `?vehicle=${encodeURIComponent(v)}` : "";
}

/** "Enquire": the enquiry form on this page if there is one, else the contact page's. */
export function enquireHref(ctx: Pick<T15Ctx, "baseUrl" | "pageHasForm">, vehicle?: string) {
  const q = vehicleQuery(vehicle);
  if (ctx.pageHasForm) return `${q}#enquire`;
  return `${ctx.baseUrl}/contact${q}#enquire`;
}

export function directionsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Last comma-separated part of the address ("4 Admiralty Way, Lekki, Lagos" → "Lagos"). */
export function cityOf(address: string | null | undefined) {
  return address?.split(",").map((s) => s.trim()).filter(Boolean).slice(-1)[0] ?? "";
}

/** Opening hours lines saved in `socials.hours` (one per row). */
export function hoursOf(profile: TemplateProps["profile"]): string[] {
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const saved = typeof socials.hours === "string" ? socials.hours : "";
  return saved
    .split(/\r?\n|;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

"use client";

import { createContext, useContext } from "react";

import type { PageData } from "@/lib/pageSchema";
import type { NavPage, TemplateProps } from "@/templates/registry";

export type T5Ctx = {
  baseUrl: string;
  navPages: NavPage[];
  /** Real photos from any gallery on the site (hero arches, story, team fallbacks). */
  photos: Array<{ url: string; alt: string }>;
  /** Service names from any services section — used as booking-form options. */
  serviceNames: string[];
  profile: TemplateProps["profile"];
};

const Ctx = createContext<T5Ctx | null>(null);
export const T5Provider = Ctx.Provider;

export function useT5(): T5Ctx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT5 must be used inside Template5");
  return v;
}

export function collectSiteMedia(pages: PageData[]) {
  const photos: Array<{ url: string; alt: string }> = [];
  const serviceNames: string[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const s of page?.sections ?? []) {
      if (s?.type === "gallery") {
        for (const img of s.images ?? []) {
          const url = img.url?.trim();
          if (url && !seen.has(url)) {
            seen.add(url);
            photos.push({ url, alt: img.alt || "" });
          }
        }
      }
      if (s?.type === "services") {
        for (const it of s.items ?? []) {
          const t = it.title?.trim();
          if (t && !serviceNames.includes(t)) serviceNames.push(t);
        }
      }
    }
  }
  return { photos, serviceNames };
}

/** Where "Book" actions go: the Book page if published, else the contact page. */
export function bookHref(ctx: Pick<T5Ctx, "baseUrl" | "navPages">, service?: string) {
  const book = ctx.navPages.find((p) => p.key === "book");
  const base = book ? `${ctx.baseUrl}/p/book` : `${ctx.baseUrl}/contact`;
  return service ? `${base}?service=${encodeURIComponent(service)}#book` : `${base}#book`;
}

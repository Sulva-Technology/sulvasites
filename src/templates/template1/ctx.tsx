"use client";

import { createContext, useContext } from "react";

import type { PageData } from "@/lib/pageSchema";
import type { NavPage, TemplateProps } from "@/templates/registry";

export type T1Ctx = {
  baseUrl: string;
  navPages: NavPage[];
  photos: Array<{ url: string; alt: string }>;
  /** Service names from any services section — used in the contact form. */
  serviceNames: string[];
  /** Value titles from any values section — used as hero trust points. */
  valueTitles: string[];
  profile: TemplateProps["profile"];
  /** Which page is rendering — each kind gets its own hero layout. */
  pageKind: "home" | "about" | "contact" | "extra";
  /** Label of the current extra page (for breadcrumbs). */
  pageLabel: string;
};

const Ctx = createContext<T1Ctx | null>(null);
export const T1Provider = Ctx.Provider;

export function useT1(): T1Ctx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT1 must be used inside Template1");
  return v;
}

export function collectCorporateMedia(pages: PageData[]) {
  const photos: Array<{ url: string; alt: string }> = [];
  const serviceNames: string[] = [];
  const valueTitles: string[] = [];
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
      } else if (s?.type === "services") {
        for (const it of s.items ?? []) {
          const t = it.title?.trim();
          if (t && !serviceNames.includes(t)) serviceNames.push(t);
        }
      } else if (s?.type === "values") {
        for (const it of s.items ?? []) {
          const t = it.title?.trim();
          if (t && !valueTitles.includes(t)) valueTitles.push(t);
        }
      }
    }
  }
  return { photos, serviceNames, valueTitles };
}

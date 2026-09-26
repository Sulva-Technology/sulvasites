"use client";

import { createContext, useContext } from "react";

import type { PageData } from "@/lib/pageSchema";
import type { NavPage, TemplateProps } from "@/templates/registry";

export type T4Ctx = {
  baseUrl: string;
  navPages: NavPage[];
  photos: Array<{ url: string; alt: string }>;
  /** Feature names from any services section — shown inside the hero phone mockup. */
  featureNames: string[];
  profile: TemplateProps["profile"];
};

const Ctx = createContext<T4Ctx | null>(null);
export const T4Provider = Ctx.Provider;

export function useT4(): T4Ctx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT4 must be used inside Template4");
  return v;
}

export function collectProductMedia(pages: PageData[]) {
  const photos: Array<{ url: string; alt: string }> = [];
  const featureNames: string[] = [];
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
          if (t && !featureNames.includes(t)) featureNames.push(t);
        }
      }
    }
  }
  return { photos, featureNames };
}

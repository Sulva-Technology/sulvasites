"use client";

import { createContext, useContext } from "react";

import type { PageData } from "@/lib/pageSchema";
import type { NavPage, TemplateProps } from "@/templates/registry";

export type T2Ctx = {
  baseUrl: string;
  navPages: NavPage[];
  photos: Array<{ url: string; alt: string }>;
  /** Service / story titles — listed as the cover's "In this issue" contents. */
  contents: string[];
  profile: TemplateProps["profile"];
  pageKind: "home" | "about" | "contact" | "extra";
  pageLabel: string;
};

const Ctx = createContext<T2Ctx | null>(null);
export const T2Provider = Ctx.Provider;

export function useT2(): T2Ctx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT2 must be used inside Template2");
  return v;
}

export function collectPhotos(pages: PageData[]) {
  const photos: Array<{ url: string; alt: string }> = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const s of page?.sections ?? []) {
      if (s?.type !== "gallery") continue;
      for (const img of s.images ?? []) {
        const url = img.url?.trim();
        if (url && !seen.has(url)) {
          seen.add(url);
          photos.push({ url, alt: img.alt || "" });
        }
      }
    }
  }
  return photos;
}

export function collectContents(pages: PageData[]) {
  const out: string[] = [];
  for (const page of pages) {
    for (const s of page?.sections ?? []) {
      if (s?.type !== "services" && s?.type !== "use_cases") continue;
      for (const it of s.items ?? []) {
        const t = it.title?.trim();
        if (t && !out.includes(t)) out.push(t);
      }
    }
  }
  return out;
}

"use client";

import { createContext, useContext } from "react";

import type { BlogData } from "@/lib/blog/types";
import type { PageData } from "@/lib/pageSchema";
import type { ColorMode } from "@/templates/shared/colorMode";
import type { NavPage, TemplateProps } from "@/templates/registry";

export type T17Ctx = {
  baseUrl: string;
  navPages: NavPage[];
  profile: TemplateProps["profile"];
  /** Which page is rendering — each kind gets its own hero. */
  pageKind: "home" | "about" | "contact" | "extra";
  /** Label of the current extra page (breadcrumb), e.g. "Journal". */
  pageLabel: string;
  photos: Array<{ url: string; alt: string }>;
  /** Published posts (home feed); undefined when the site has none yet. */
  blog?: BlogData;
  /** The page already has a contact form (skip the footer subscribe band's duplicate ask). */
  pageHasForm: boolean;
  mode: ColorMode;
  toggleMode: () => void;
};

const Ctx = createContext<T17Ctx | null>(null);
export const T17Provider = Ctx.Provider;

export function useT17(): T17Ctx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT17 must be used inside Template17");
  return v;
}

export function collectPhotos(pages: PageData[]) {
  const out: Array<{ url: string; alt: string }> = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const s of page?.sections ?? []) {
      if (s?.type !== "gallery") continue;
      for (const img of s.images ?? []) {
        const url = img.url?.trim();
        if (url && !seen.has(url)) {
          seen.add(url);
          out.push({ url, alt: img.alt || "" });
        }
      }
    }
  }
  return out;
}

/** "/blog" under the site's base. */
export function blogHref(ctx: Pick<T17Ctx, "baseUrl">) {
  return `${ctx.baseUrl}/blog`;
}

/** Where "Subscribe" buttons go: the footer band on this page. */
export const SUBSCRIBE_ID = "subscribe";

/** First name of the business (writers are usually a person): "Amara Nwosu" -> "Amara". */
export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

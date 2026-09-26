"use client";

import { createContext, useContext } from "react";

import type { NavPage, TemplateProps } from "@/templates/registry";

export type T6Ctx = {
  baseUrl: string;
  navPages: NavPage[];
  /** Every real photo from the site's galleries — reused for hero and listing covers. */
  photos: Array<{ url: string; alt: string }>;
  profile: TemplateProps["profile"];
};

const Ctx = createContext<T6Ctx | null>(null);

export const T6Provider = Ctx.Provider;

export function useT6(): T6Ctx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT6 must be used inside Template6");
  return v;
}

/** Where "browse properties" actions should go: the Properties page if published, else contact. */
export function propertiesHref(ctx: T6Ctx) {
  const page = ctx.navPages.find((p) => p.key === "properties");
  return page ? `${ctx.baseUrl}/p/${page.key}` : `${ctx.baseUrl}/contact`;
}

import type { ComponentType } from "react";

import type { PageData, PageKey } from "@/lib/pageSchema";
import type { ShopData, ShopView } from "@/lib/shop/types";
import type { SiteData } from "@/lib/siteResolver.server";
import Template1 from "@/templates/template1/Template1";
import Template2 from "@/templates/template2/Template2";
import Template3 from "@/templates/template3/Template3";
import Template4 from "@/templates/template4/Template4";
import Template5 from "@/templates/template5/Template5";
import Template6 from "@/templates/template6/Template6";
import Template7 from "@/templates/template7/Template7";
import Template8 from "@/templates/template8/Template8";
import Template9 from "@/templates/template9/Template9";
import Template10 from "@/templates/template10/Template10";
import Template11 from "@/templates/template11/Template11";
import Template12 from "@/templates/template12/Template12";
import Template13 from "@/templates/template13/Template13";
import Template14 from "@/templates/template14/Template14";
import Template15 from "@/templates/template15/Template15";

/** A published extra page shown in navigation, served at `${baseUrl}/p/${key}`. */
export type NavPage = { key: string; label: string };

export type TemplateProps = {
  site: Pick<SiteData["site"], "id" | "slug" | "template_key">;
  profile: SiteData["profile"];
  pages: SiteData["pages"];
  currentPage?: PageKey | null;
  baseUrl?: string;
  pageOverride?: PageData;
  /** Published extra pages to include in header/footer navigation. */
  navPages?: NavPage[];
  /** Key of the extra page being rendered (to highlight it in the nav). */
  currentExtraKey?: string | null;
  /** Storefront data; only set (with `shopView`) on /shop/... routes of shop-capable templates. */
  shop?: ShopData;
  shopView?: ShopView;
};

/** Single source of truth for which template_key renders which component. */
export const TEMPLATES: Record<string, ComponentType<TemplateProps>> = {
  t1: Template1,
  t2: Template2,
  t3: Template3,
  t4: Template4,
  t5: Template5,
  t6: Template6,
  t7: Template7,
  t8: Template8,
  t9: Template9,
  t10: Template10,
  t11: Template11,
  t12: Template12,
  t13: Template13,
  t14: Template14,
  t15: Template15,
};

export const TEMPLATE_KEYS = Object.keys(TEMPLATES);

export function getTemplate(key: string): ComponentType<TemplateProps> | null {
  return TEMPLATES[key] ?? null;
}

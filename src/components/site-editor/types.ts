export type SiteEditorMode = "admin" | "owner";

export type SiteEditorProps = {
  siteId: string;
  /** Page key (core page key or extra page key); unused by ProfileEditor. */
  pageKey?: string;
  /** "owner" hides Sulvatech-only settings (template, slug, status, domains, colours). */
  mode: SiteEditorMode;
  /** Route prefix of the host area, e.g. `/admin/sites/<id>` or `/dashboard/<id>/content`; used for back links. */
  basePath: string;
};

export const BUSINESS_KINDS = [
  "menu_item",
  "timetable_slot",
  "doctor",
  "service",
  "programme",
  "package",
  "project",
] as const;
export type BusinessKind = (typeof BUSINESS_KINDS)[number];

export function isBusinessKind(v: unknown): v is BusinessKind {
  return typeof v === "string" && (BUSINESS_KINDS as readonly string[]).includes(v);
}

/** A row of public.business_items (price is integer kobo). */
export type BusinessItemRow = {
  id: string;
  site_id: string;
  kind: BusinessKind;
  position: number;
  name: string;
  price_kobo: number | null;
  data: Record<string, unknown>;
  active: boolean;
  created_at?: string;
};

/** What the dashboard writes (site_id is added by the caller). */
export type BusinessItemInput = {
  name: string;
  price_kobo: number | null;
  data: Record<string, unknown>;
  active: boolean;
};

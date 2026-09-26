import { getAuthenticatedClient } from "@/lib/supabase/browser";
import type { PageData } from "@/lib/pageSchema";
import { validatePageData } from "@/lib/pageSchema";
import { buildPresetPageData, getPagePresets } from "@/templates/pagePresets";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export type ExtraPageRow = {
  id: string;
  site_id: string;
  key: string;
  status: "draft" | "published";
  data: PageData;
  updated_at: string;
  published_at: string | null;
};

export async function listExtraPages(siteId: string): Promise<ExtraPageRow[]> {
  const supabase = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("extra_pages")
    .select("id, site_id, key, status, data, updated_at, published_at")
    .eq("site_id", siteId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ExtraPageRow[];
}

export async function getExtraPageByKey(
  siteId: string,
  key: string,
): Promise<ExtraPageRow | null> {
  const supabase = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("extra_pages")
    .select("id, site_id, key, status, data, updated_at, published_at")
    .eq("site_id", siteId)
    .eq("key", key)
    .single();
  if (error) {
    // PostgREST "No rows found"
    const errObj: Record<string, unknown> = isRecord(error) ? error : {};
    const msg = typeof errObj["message"] === "string" ? (errObj["message"] as string) : "";
    const code = typeof errObj["code"] === "string" ? (errObj["code"] as string) : "";
    if (code === "PGRST116" || msg.toLowerCase().includes("0 rows")) return null;
    throw error;
  }
  return data as unknown as ExtraPageRow;
}

export async function createExtraPage(siteId: string, key: string, data: PageData) {
  const valid = validatePageData(data);
  if (!valid.ok) throw new Error(valid.error ?? "Invalid page data.");

  const supabase = await getAuthenticatedClient();
  const { data: created, error } = await supabase
    .from("extra_pages")
    .insert({ site_id: siteId, key, data, status: "draft" })
    .select("id, site_id, key, status, data, updated_at, published_at")
    .single();
  if (error) throw error;
  return created as unknown as ExtraPageRow;
}

/**
 * Creates the template's recommended pages (as drafts) that the site doesn't have yet.
 * Returns the newly created rows.
 */
export async function createPresetPages(
  siteId: string,
  templateKey: string,
  existingKeys: string[],
): Promise<ExtraPageRow[]> {
  const missing = getPagePresets(templateKey).filter((p) => !existingKeys.includes(p.key));
  if (missing.length === 0) return [];

  const supabase = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("extra_pages")
    .insert(
      missing.map((p) => ({ site_id: siteId, key: p.key, data: buildPresetPageData(p), status: "draft" })),
    )
    .select("id, site_id, key, status, data, updated_at, published_at");
  if (error) throw error;
  return (data ?? []) as unknown as ExtraPageRow[];
}

export async function saveExtraPageDraft(pageId: string, data: PageData) {
  const valid = validatePageData(data);
  if (!valid.ok) throw new Error(valid.error ?? "Invalid page data.");

  const supabase = await getAuthenticatedClient();
  const { error } = await supabase
    .from("extra_pages")
    .update({ data, status: "draft" })
    .eq("id", pageId);
  if (error) throw error;
}

export async function publishExtraPage(pageId: string, data: PageData) {
  const valid = validatePageData(data);
  if (!valid.ok) throw new Error(valid.error ?? "Invalid page data.");

  const supabase = await getAuthenticatedClient();
  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("extra_pages")
    .update({ data, status: "published", published_at: now })
    .eq("id", pageId)
    .select("id, site_id, key, status, data, updated_at, published_at")
    .single();
  if (error) throw error;
  return updated as unknown as ExtraPageRow;
}

export async function unpublishExtraPage(pageId: string) {
  const supabase = await getAuthenticatedClient();
  const { data: updated, error } = await supabase
    .from("extra_pages")
    .update({ status: "draft", published_at: null })
    .eq("id", pageId)
    .select("id, site_id, key, status, data, updated_at, published_at")
    .single();
  if (error) throw error;
  return updated as unknown as ExtraPageRow;
}



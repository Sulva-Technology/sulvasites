// Applies (and undoes) an approved "Ask AI" proposal from the browser, under the signed-in user's
// own permissions (RLS). Only content changes: a live page stays live, a draft stays a draft.
import { createExtraPage, listExtraPages } from "@/lib/extraPages";
import { uploadSiteImage } from "@/lib/assets";
import { validatePageData, type PageData, type Section } from "@/lib/pageSchema";
import { slugify } from "@/lib/slugify";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import { uniquePageKey } from "@/templates/pagePresets";

import {
  PROFILE_COLUMNS,
  profileFromRow,
  profileUpdatePayload,
  type AssistantAction,
  type ProfileFields,
} from "./siteAssistant";
import {
  STANDARD_VARIANT,
  fieldsToColumns,
  isAllowedProductImageUrl,
  productMatches,
  productRow,
  uniqueProductSlug,
  variantRows,
  type ProductFields,
} from "./shopAssistant";

/** What to put back if the owner taps Undo. */
export type UndoRecord =
  | { kind: "page"; table: "pages" | "extra_pages"; id: string; prev: PageData; written: PageData }
  | { kind: "new_page"; id: string; written: PageData }
  | { kind: "profile"; before: ProfileFields; after: ProfileFields }
  | { kind: "product"; id: string; categoryId: string | null }
  | { kind: "product_update"; id: string; prev: Record<string, unknown>; next: Record<string, unknown>; categoryId: string | null }
  | { kind: "stock"; changes: Array<{ variantId: string; created: boolean; before: number | null; after: number | null }> };

/** Choices made in the panel that are not part of the proposal itself. */
export type ApplyOptions = {
  /** Which suggested photo to use for a new product; null = none. Defaults to the first. */
  imageIndex?: number | null;
  /** Photos the owner attached, by 1-based number, for products that use "upload:N". */
  photoFiles?: Record<number, File>;
};

export type ApplyResult = { ok: true; key: string; undo: UndoRecord } | { ok: false; error: string };
export type UndoResult = { ok: true } | { ok: false; error: string };

const STALE =
  "This part of the page changed after I suggested the edit, so I didn't overwrite it. Ask me again to get a fresh suggestion.";
const UNDO_STALE = "This was edited again after it was applied, so I left it alone. Change it in the editor instead.";

/** JSON with sorted keys: the database does not keep key order, so compare structure, not text. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

function same(a: unknown, b: unknown) {
  return stable(a) === stable(b);
}

/** Where `before` is now: its original slot, else its only exact match (earlier edits may have shifted it). */
function locate(sections: Section[], before: Section, hint: number): number {
  if (same(sections[hint], before)) return hint;
  const hits = sections.map((s, i) => (same(s, before) ? i : -1)).filter((i) => i >= 0);
  return hits.length === 1 ? hits[0]! : -1;
}

function tableFor(kind: "core" | "extra") {
  return kind === "core" ? "pages" : "extra_pages";
}

async function applyProfile(siteId: string, action: Extract<AssistantAction, { type: "update_profile" }>): Promise<ApplyResult> {
  const supabase = await getAuthenticatedClient();
  const { data: row, error } = await supabase.from("business_profiles").select(PROFILE_COLUMNS).eq("site_id", siteId).maybeSingle();
  if (error) return { ok: false, error: error.message };
  const current = profileFromRow(row as Record<string, unknown> | null);
  for (const [f, v] of Object.entries(action.before)) {
    if ((current[f as keyof ProfileFields] ?? "") !== v) {
      return { ok: false, error: "Your business details changed after I suggested this. Ask me again for a fresh suggestion." };
    }
  }
  const { error: updateError } = await supabase
    .from("business_profiles")
    .update(profileUpdatePayload(row as Record<string, unknown> | null, action.after))
    .eq("site_id", siteId);
  if (updateError) return { ok: false, error: updateError.message };
  return { ok: true, key: "profile", undo: { kind: "profile", before: action.before, after: action.after } };
}

const PRODUCT_STALE = "This product changed after I suggested the edit, so I didn't overwrite it. Ask me again for a fresh suggestion.";

type Db = Awaited<ReturnType<typeof getAuthenticatedClient>>;

/** Finds a category by name (any case) or creates it. Returns its id and whether it was created. */
async function resolveCategory(db: Db, siteId: string, name: string): Promise<{ id: string; created: boolean }> {
  const { data, error } = await db.from("product_categories").select("id, name, slug").eq("site_id", siteId);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ id: string; name: string; slug: string }>;
  const hit = rows.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (hit) return { id: hit.id, created: false };
  const base = slugify(name) || "category";
  const taken = new Set(rows.map((c) => c.slug));
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  const ins = await db.from("product_categories").insert({ site_id: siteId, name, slug, position: rows.length }).select("id").single();
  if (ins.error) throw ins.error;
  return { id: ins.data.id as string, created: true };
}

async function productImage(siteId: string, action: Extract<AssistantAction, { type: "add_product" }>, opts: ApplyOptions) {
  const index = opts.imageIndex === undefined ? 0 : opts.imageIndex;
  const choice = index === null ? undefined : action.imageOptions[index];
  if (!choice) return [];
  let url = choice.url;
  if (choice.source === "upload") {
    const n = Number(choice.url.replace("upload:", ""));
    const file = opts.photoFiles?.[n];
    if (!file) throw new Error("Your photo is no longer attached. Attach it again or pick a suggested photo.");
    url = await uploadSiteImage(siteId, file);
  } else {
    const host = (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
      } catch {
        return "";
      }
    })();
    if (!isAllowedProductImageUrl(url, host ? [host] : [])) return [];
  }
  return [{ url, alt: action.product.name }];
}

async function applyAddProduct(siteId: string, action: Extract<AssistantAction, { type: "add_product" }>, opts: ApplyOptions): Promise<ApplyResult> {
  const db = await getAuthenticatedClient();
  const images = await productImage(siteId, action, opts);

  const existing = await db.from("products").select("slug").eq("site_id", siteId);
  if (existing.error) return { ok: false, error: existing.error.message };
  const slugs = (existing.data ?? []).map((r) => (r as { slug: string }).slug);
  const slug = uniqueProductSlug(action.product.name, slugs);

  let categoryId: string | null = null;
  let createdCategory: string | null = null;
  if (action.product.category) {
    const c = await resolveCategory(db, siteId, action.product.category);
    categoryId = c.id;
    if (c.created) createdCategory = c.id;
  }

  const { data, error } = await db
    .from("products")
    .insert(productRow(siteId, { ...action.product, slug }, categoryId, images, slugs.length))
    .select("id")
    .single();
  if (error) {
    if (createdCategory) await db.from("product_categories").delete().eq("id", createdCategory);
    return { ok: false, error: (error as { code?: string }).code === "23505" ? "A product with that name already exists." : error.message };
  }
  const id = data.id as string;

  if (action.product.variants.length) {
    const { error: variantError } = await db.from("product_variants").insert(variantRows(siteId, id, action.product.variants));
    if (variantError) {
      await db.from("products").delete().eq("id", id).eq("site_id", siteId);
      if (createdCategory) await db.from("product_categories").delete().eq("id", createdCategory);
      return { ok: false, error: variantError.message };
    }
  }
  return { ok: true, key: id, undo: { kind: "product", id, categoryId: createdCategory } };
}

async function applyUpdateProduct(siteId: string, action: Extract<AssistantAction, { type: "update_product" }>): Promise<ApplyResult> {
  const db = await getAuthenticatedClient();
  const { data: row, error } = await db.from("products").select("*").eq("id", action.productId).eq("site_id", siteId).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: false, error: "That product no longer exists." };

  let currentCategory: string | null = null;
  if (row.category_id) {
    const c = await db.from("product_categories").select("name").eq("id", row.category_id as string).maybeSingle();
    currentCategory = (c.data as { name: string } | null)?.name ?? null;
  }
  if (!productMatches(row as Record<string, unknown>, action.before, currentCategory)) return { ok: false, error: PRODUCT_STALE };

  let categoryId: string | null | undefined;
  let createdCategory: string | null = null;
  if (action.after.category !== undefined) {
    if (action.after.category) {
      const c = await resolveCategory(db, siteId, action.after.category);
      categoryId = c.id;
      if (c.created) createdCategory = c.id;
    } else categoryId = null;
  }

  const next = fieldsToColumns(action.after, categoryId);
  const prev: Record<string, unknown> = {};
  for (const k of Object.keys(next)) prev[k] = (row as Record<string, unknown>)[k] ?? null;
  const { data, error: updateError } = await db.from("products").update(next).eq("id", action.productId).eq("site_id", siteId).select("id");
  if (updateError || !data?.length) {
    if (createdCategory) await db.from("product_categories").delete().eq("id", createdCategory);
    return { ok: false, error: updateError?.message ?? "Product could not be updated." };
  }
  return { ok: true, key: action.productId, undo: { kind: "product_update", id: action.productId, prev, next, categoryId: createdCategory } };
}

async function applySetStock(siteId: string, action: Extract<AssistantAction, { type: "set_stock" }>): Promise<ApplyResult> {
  const db = await getAuthenticatedClient();
  const done: Array<{ variantId: string; created: boolean; before: number | null; after: number | null }> = [];

  const rollback = async () => {
    for (const d of done.reverse()) {
      if (d.created) await db.from("product_variants").delete().eq("id", d.variantId).eq("site_id", siteId);
      else await db.from("product_variants").update({ stock: d.before }).eq("id", d.variantId).eq("site_id", siteId);
    }
  };

  for (const c of action.changes) {
    if (c.variantId === null) {
      const have = await db.from("product_variants").select("id", { count: "exact", head: true }).eq("product_id", action.productId).eq("site_id", siteId);
      if (have.error) { await rollback(); return { ok: false, error: have.error.message }; }
      if ((have.count ?? 0) > 0) { await rollback(); return { ok: false, error: PRODUCT_STALE }; }
      const ins = await db
        .from("product_variants")
        .insert({ product_id: action.productId, site_id: siteId, options: { ...STANDARD_VARIANT }, price_kobo: null, stock: c.after, sku: null, position: 0 })
        .select("id")
        .single();
      if (ins.error) { await rollback(); return { ok: false, error: ins.error.message }; }
      done.push({ variantId: ins.data.id as string, created: true, before: null, after: c.after });
    } else {
      const { data: v, error } = await db.from("product_variants").select("stock").eq("id", c.variantId).eq("site_id", siteId).maybeSingle();
      if (error) { await rollback(); return { ok: false, error: error.message }; }
      if (!v) { await rollback(); return { ok: false, error: "That option no longer exists." }; }
      const current = (v as { stock: number | null }).stock;
      if ((current === null ? null : Number(current)) !== c.before) { await rollback(); return { ok: false, error: PRODUCT_STALE }; }
      const upd = await db.from("product_variants").update({ stock: c.after }).eq("id", c.variantId).eq("site_id", siteId).select("id");
      if (upd.error || !upd.data?.length) { await rollback(); return { ok: false, error: upd.error?.message ?? "Stock could not be updated." }; }
      done.push({ variantId: c.variantId, created: false, before: c.before, after: c.after });
    }
  }
  return { ok: true, key: action.productId, undo: { kind: "stock", changes: done } };
}

export async function applyAssistantAction(siteId: string, action: AssistantAction, opts: ApplyOptions = {}): Promise<ApplyResult> {
  if (action.type === "update_profile") return applyProfile(siteId, action);
  if (action.type === "add_product") return applyAddProduct(siteId, action, opts);
  if (action.type === "update_product") return applyUpdateProduct(siteId, action);
  if (action.type === "set_stock") return applySetStock(siteId, action);

  if (action.type === "add_page") {
    const valid = validatePageData(action.data);
    if (!valid.ok) return { ok: false, error: valid.error ?? "Invalid page." };
    let created;
    try {
      created = await createExtraPage(siteId, action.key, action.data);
    } catch {
      // The key may have been taken since the suggestion; pick the next free one and retry once.
      const keys = (await listExtraPages(siteId)).map((p) => p.key);
      created = await createExtraPage(siteId, uniquePageKey(action.key, keys), action.data);
    }
    return { ok: true, key: created.key, undo: { kind: "new_page", id: created.id, written: action.data } };
  }

  const supabase = await getAuthenticatedClient();
  const table = tableFor(action.pageKind);
  const { data: row, error } = await supabase
    .from(table)
    .select("id, data")
    .eq("site_id", siteId)
    .eq("key", action.page)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: false, error: "That page no longer exists." };

  const current = (row.data ?? {}) as PageData;
  const sections = Array.isArray(current.sections) ? [...current.sections] : [];
  let next: PageData;

  if (action.type === "edit_section" || action.type === "remove_section" || action.type === "move_section") {
    const at = locate(sections, action.before, action.sectionIndex);
    if (at < 0) return { ok: false, error: STALE };
    if (action.type === "edit_section") {
      sections[at] = action.after;
    } else if (action.type === "remove_section") {
      sections.splice(at, 1);
    } else {
      const [moved] = sections.splice(at, 1);
      sections.splice(Math.min(action.to, sections.length), 0, moved!);
    }
    next = { ...current, sections };
  } else if (action.type === "add_section") {
    sections.splice(Math.min(action.position, sections.length), 0, action.section);
    next = { ...current, sections };
  } else {
    next = { ...current, seo: { ...(current.seo ?? {}), ...action.after } };
  }

  const valid = validatePageData(next);
  if (!valid.ok) return { ok: false, error: valid.error ?? "Invalid page." };

  const { error: updateError } = await supabase.from(table).update({ data: next }).eq("id", row.id as string);
  if (updateError) return { ok: false, error: updateError.message };
  return { ok: true, key: action.page, undo: { kind: "page", table, id: row.id as string, prev: current, written: next } };
}

/** Reverses an applied proposal, but only if nobody has changed that content since. */
export async function undoAssistantAction(siteId: string, undo: UndoRecord): Promise<UndoResult> {
  const supabase = await getAuthenticatedClient();

  if (undo.kind === "profile") {
    const { data: row, error } = await supabase.from("business_profiles").select(PROFILE_COLUMNS).eq("site_id", siteId).maybeSingle();
    if (error) return { ok: false, error: error.message };
    const current = profileFromRow(row as Record<string, unknown> | null);
    for (const [f, v] of Object.entries(undo.after)) {
      if ((current[f as keyof ProfileFields] ?? "") !== v) return { ok: false, error: UNDO_STALE };
    }
    const { error: updateError } = await supabase
      .from("business_profiles")
      .update(profileUpdatePayload(row as Record<string, unknown> | null, undo.before))
      .eq("site_id", siteId);
    return updateError ? { ok: false, error: updateError.message } : { ok: true };
  }

  if (undo.kind === "product") {
    const { error } = await supabase.from("products").delete().eq("id", undo.id).eq("site_id", siteId);
    if (error) return { ok: false, error: error.message };
    if (undo.categoryId) {
      const left = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", undo.categoryId).eq("site_id", siteId);
      if (!left.error && (left.count ?? 0) === 0) await supabase.from("product_categories").delete().eq("id", undo.categoryId).eq("site_id", siteId);
    }
    return { ok: true };
  }

  if (undo.kind === "product_update") {
    const { data: row, error } = await supabase.from("products").select("*").eq("id", undo.id).eq("site_id", siteId).maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!row) return { ok: false, error: "That product no longer exists." };
    for (const [k, v] of Object.entries(undo.next)) {
      const cur = (row as Record<string, unknown>)[k] ?? null;
      if (!same(typeof cur === "string" && /^\d+$/.test(cur) ? Number(cur) : cur, v ?? null)) return { ok: false, error: UNDO_STALE };
    }
    const { error: writeError } = await supabase.from("products").update(undo.prev).eq("id", undo.id).eq("site_id", siteId);
    if (writeError) return { ok: false, error: writeError.message };
    if (undo.categoryId) {
      const left = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", undo.categoryId).eq("site_id", siteId);
      if (!left.error && (left.count ?? 0) === 0) await supabase.from("product_categories").delete().eq("id", undo.categoryId).eq("site_id", siteId);
    }
    return { ok: true };
  }

  if (undo.kind === "stock") {
    for (const c of [...undo.changes].reverse()) {
      const { data: v, error } = await supabase.from("product_variants").select("stock").eq("id", c.variantId).eq("site_id", siteId).maybeSingle();
      if (error) return { ok: false, error: error.message };
      if (!v) continue;
      const cur = (v as { stock: number | null }).stock;
      if ((cur === null ? null : Number(cur)) !== c.after) return { ok: false, error: UNDO_STALE };
      const w = c.created
        ? await supabase.from("product_variants").delete().eq("id", c.variantId).eq("site_id", siteId)
        : await supabase.from("product_variants").update({ stock: c.before }).eq("id", c.variantId).eq("site_id", siteId);
      if (w.error) return { ok: false, error: w.error.message };
    }
    return { ok: true };
  }

  const table = undo.kind === "new_page" ? "extra_pages" : undo.table;
  const { data: row, error } = await supabase.from(table).select("id, data, status").eq("id", undo.id).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!row) return undo.kind === "new_page" ? { ok: true } : { ok: false, error: "That page no longer exists." };
  if (!same(row.data, undo.written)) return { ok: false, error: UNDO_STALE };
  if (undo.kind === "new_page" && row.status === "published") {
    return { ok: false, error: "This page has been published since, so I won't delete it. Unpublish it from the editor first." };
  }

  const { error: writeError } =
    undo.kind === "new_page"
      ? await supabase.from("extra_pages").delete().eq("id", undo.id)
      : await supabase.from(table).update({ data: undo.prev }).eq("id", undo.id);
  return writeError ? { ok: false, error: writeError.message } : { ok: true };
}

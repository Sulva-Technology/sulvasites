// Applies (and undoes) an approved "Ask AI" proposal from the browser, under the signed-in user's
// own permissions (RLS). Only content changes: a live page stays live, a draft stays a draft.
import { createExtraPage, listExtraPages } from "@/lib/extraPages";
import { validatePageData, type PageData, type Section } from "@/lib/pageSchema";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import { uniquePageKey } from "@/templates/pagePresets";

import {
  PROFILE_COLUMNS,
  profileFromRow,
  profileUpdatePayload,
  type AssistantAction,
  type ProfileFields,
} from "./siteAssistant";

/** What to put back if the owner taps Undo. */
export type UndoRecord =
  | { kind: "page"; table: "pages" | "extra_pages"; id: string; prev: PageData; written: PageData }
  | { kind: "new_page"; id: string; written: PageData }
  | { kind: "profile"; before: ProfileFields; after: ProfileFields };

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

export async function applyAssistantAction(siteId: string, action: AssistantAction): Promise<ApplyResult> {
  if (action.type === "update_profile") return applyProfile(siteId, action);

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

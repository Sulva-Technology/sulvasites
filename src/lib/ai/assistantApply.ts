// Applies an approved "Ask AI" proposal from the browser, under the signed-in user's own
// permissions (RLS). Only the page's content changes: a live page stays live, a draft stays a draft.
import { createExtraPage, listExtraPages } from "@/lib/extraPages";
import { validatePageData, type PageData } from "@/lib/pageSchema";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import { uniquePageKey } from "@/templates/pagePresets";

import type { AssistantAction } from "./siteAssistant";

export type ApplyResult = { ok: true; key: string } | { ok: false; error: string };

const STALE =
  "This part of the page changed after I suggested the edit, so I didn't overwrite it. Ask me again to get a fresh suggestion.";

function tableFor(kind: "core" | "extra") {
  return kind === "core" ? "pages" : "extra_pages";
}

export async function applyAssistantAction(siteId: string, action: AssistantAction): Promise<ApplyResult> {
  const supabase = await getAuthenticatedClient();

  if (action.type === "add_page") {
    const valid = validatePageData(action.data);
    if (!valid.ok) return { ok: false, error: valid.error ?? "Invalid page." };
    try {
      const created = await createExtraPage(siteId, action.key, action.data);
      return { ok: true, key: created.key };
    } catch {
      // The key may have been taken since the suggestion; pick the next free one and retry once.
      const keys = (await listExtraPages(siteId)).map((p) => p.key);
      const created = await createExtraPage(siteId, uniquePageKey(action.key, keys), action.data);
      return { ok: true, key: created.key };
    }
  }

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

  if (action.type === "edit_section") {
    if (JSON.stringify(sections[action.sectionIndex]) !== JSON.stringify(action.before)) {
      return { ok: false, error: STALE };
    }
    sections[action.sectionIndex] = action.after;
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
  return { ok: true, key: action.page };
}

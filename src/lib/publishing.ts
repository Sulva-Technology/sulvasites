import { supabaseBrowser, getAuthenticatedClient } from "@/lib/supabase/browser";
import { validatePageData, type PageData } from "@/lib/pageSchema";

type PublishablePageKey = "home" | "about" | "contact";

export async function publishPage(pageId: string, pageDraft: PageData) {
  const valid = validatePageData(pageDraft);
  if (!valid.ok) throw new Error(valid.error ?? "Invalid page JSON structure.");

  // Ensure client is fully authenticated before making database call
  const supabase = await getAuthenticatedClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("pages")
    .update({ status: "published", data: pageDraft, published_at: now })
    .eq("id", pageId)
    .select("status, published_at, updated_at")
    .single();

  if (error) throw error;
  return data as { status: string; published_at: string | null; updated_at: string };
}

// We set published_at = NULL on unpublish to make it unambiguous for the public
// frontend: if status != 'published', there is no active published timestamp.
export async function unpublishPage(pageId: string) {
  // Ensure client is fully authenticated before making database call
  const supabase = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from("pages")
    .update({ status: "draft", published_at: null })
    .eq("id", pageId)
    .select("status, published_at, updated_at")
    .single();

  if (error) throw error;
  return data as { status: string; published_at: string | null; updated_at: string };
}

export async function publishSite(siteId: string) {
  // Ensure client is fully authenticated before making database call
  const supabase = await getAuthenticatedClient();

  const now = new Date().toISOString();

  const { data: pages, error: pagesError } = await supabase
    .from("pages")
    .update({ status: "published", published_at: now })
    .eq("site_id", siteId)
    .in("key", ["home", "about", "contact"] satisfies PublishablePageKey[])
    .select("id, key, status, published_at");

  if (pagesError) throw pagesError;

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .update({ status: "published" })
    .eq("id", siteId)
    .select("status, updated_at")
    .single();

  if (siteError) throw siteError;

  // Extra pages (Services, Menu, Shop pages…) go live with the site; already-live ones keep their
  // published_at. Best effort: the site is already live, so a failure here only leaves drafts.
  const { data: extras, error: extrasError } = await supabase
    .from("extra_pages")
    .update({ status: "published", published_at: now })
    .eq("site_id", siteId)
    .neq("status", "published")
    .select("id");
  if (extrasError) console.error("Extra pages were not published:", extrasError.message);

  return {
    pages: (pages ?? []) as Array<{
      id: string;
      key: PublishablePageKey;
      status: string;
      published_at: string | null;
    }>,
    site: site as { status: string; updated_at: string },
    extraPagesPublished: extras?.length ?? 0,
    extraPagesError: extrasError?.message ?? null,
  };
}

export async function unpublishSite(siteId: string) {
  // Ensure client is fully authenticated before making database call
  const supabase = await getAuthenticatedClient();

  const { data: pages, error: pagesError } = await supabase
    .from("pages")
    .update({ status: "draft", published_at: null })
    .eq("site_id", siteId)
    .in("key", ["home", "about", "contact"] satisfies PublishablePageKey[])
    .select("id, key, status, published_at");

  if (pagesError) throw pagesError;

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .update({ status: "draft" })
    .eq("id", siteId)
    .select("status, updated_at")
    .single();

  if (siteError) throw siteError;

  return {
    pages: (pages ?? []) as Array<{
      id: string;
      key: PublishablePageKey;
      status: string;
      published_at: string | null;
    }>,
    site: site as { status: string; updated_at: string },
  };
}


import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin.server";

// Admin-only: exposes draft state and raw DB errors.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { slug } = await params;
  const supabase = supabaseServer();

  // Check site
  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, slug, template_key, status")
    .eq("slug", slug)
    .single();

  if (siteError || !site) {
    return NextResponse.json({
      error: "Site not found",
      slug,
      siteError: siteError?.message || null,
    });
  }

  // Check profile
  const { data: profile, error: profileError } = await supabase
    .from("business_profiles")
    .select("business_name, site_id")
    .eq("site_id", site.id)
    .single();

  // Check pages
  const { data: pages, error: pagesError } = await supabase
    .from("pages")
    .select("key, status, id")
    .eq("site_id", site.id)
    .in("key", ["home", "about", "contact"]);

  // Check published pages specifically
  const { data: publishedPages } = await supabase
    .from("pages")
    .select("key, status, id")
    .eq("site_id", site.id)
    .eq("status", "published")
    .in("key", ["home", "about", "contact"]);

  // Critical: can we read the page `data` column? (public rendering requires it)
  const { data: pageDataRow, error: pageDataError } = await supabase
    .from("pages")
    .select("key, status, data")
    .eq("site_id", site.id)
    .eq("status", "published")
    .in("key", ["home", "about", "contact"])
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    slug,
    site: {
      id: site.id,
      slug: site.slug,
      template_key: site.template_key,
      status: site.status,
    },
    profile: profile
      ? { exists: true, business_name: profile.business_name }
      : { exists: false, error: profileError?.message || null },
    pages: {
      all: pages || [],
      published: publishedPages || [],
      missing: ["home", "about", "contact"].filter(
        (key) => !pages?.some((p) => p.key === key),
      ),
      draft: pages?.filter((p) => p.status === "draft") || [],
      dataAccess: {
        ok: !pageDataError && !!pageDataRow,
        error: pageDataError?.message || null,
      },
    },
    diagnosis: {
      sitePublished: site.status === "published",
      allPagesExist:
        pages?.length === 3 &&
        ["home", "about", "contact"].every((key) =>
          pages.some((p) => p.key === key),
        ),
      allPagesPublished: publishedPages?.length === 3,
      canResolve:
        site.status === "published" &&
        publishedPages?.length === 3 &&
        profile !== null &&
        !pageDataError,
    },
  });
}

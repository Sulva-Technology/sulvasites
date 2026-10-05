// Creates a site from an assistant build result using the signed-in admin's own client (RLS applies).
import { uploadLogo, uploadSiteImage } from "@/lib/assets";
import { createExtraPage } from "@/lib/extraPages";
import { validatePageData, type PageData } from "@/lib/pageSchema";
import { pickPhotos, photoUrl } from "@/lib/stockPhotos";
import { expandPalette } from "@/lib/ai/setupPalette";
import { replaceUploadTokens, type SiteSetup } from "@/lib/ai/setupPhotos";
import { slugify } from "@/lib/slugify";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import type { BuildResult } from "@/lib/ai/siteBuilder";

function isUniqueViolation(error: { code?: string; message?: string }) {
  return error.code === "23505" || (error.message ?? "").toLowerCase().includes("duplicate key");
}

export type CreateSiteOutcome = { siteId: string; slug: string; warnings: string[] };

function errMessage(e: unknown) {
  return e instanceof Error ? e.message : e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "error";
}

/**
 * Inserts the site (retrying "-2", "-3"… on slug clashes), then uploads the owner's photos
 * and logo, saves profile (with the chosen palette), pages and extra pages.
 */
export async function createSiteFromBuild(result: BuildResult, desiredSlug: string, setup?: SiteSetup): Promise<CreateSiteOutcome> {
  const base = slugify(desiredSlug) || "my-site";
  const supabase = await getAuthenticatedClient();
  const warnings: string[] = [];

  let siteId = "";
  let slug = base;
  for (let attempt = 1; attempt <= 6; attempt++) {
    slug = attempt === 1 ? base : `${base}-${attempt}`;
    const { data, error } = await supabase
      .from("sites")
      .insert({ slug, template_key: result.templateKey })
      .select("id")
      .single();
    if (!error && data) {
      siteId = data.id as string;
      break;
    }
    if (error && !isUniqueViolation(error)) throw error;
    if (attempt === 6) throw new Error(`The address "${base}" is taken and no free variant was found. Pick a different slug.`);
  }

  // Owner photos: upload now that the site exists, then swap "upload:N" placeholders.
  const uploads = setup?.uploads ?? [];
  const urls = await Promise.all(
    uploads.map((u) =>
      uploadSiteImage(siteId, u.file).catch((e: unknown) => {
        warnings.push(`Photo "${u.file.name}" could not be uploaded (${errMessage(e)}); a stock photo was used.`);
        return null;
      }),
    ),
  );
  const spare = pickPhotos(result.photoCategory, 8, `${slug}-spare`);
  const allPages = replaceUploadTokens(
    { ...result.pages, ...Object.fromEntries(result.extraPages.map((e) => [e.key, e.data])) } as Record<string, PageData>,
    urls,
    (i) => {
      const s = spare[i % spare.length]!;
      return { url: photoUrl(s.id), alt: s.alt };
    },
  );

  // Profile: only overwrite fields the build actually has, so nothing is wiped.
  const p = result.profile;
  const payload: Record<string, unknown> = { business_name: p.business_name };
  for (const k of ["tagline", "description", "address", "phone", "email", "whatsapp"] as const) {
    if (p[k]) payload[k] = p[k];
  }
  const socials = Object.fromEntries(Object.entries(p.socials).filter(([, v]) => !!v));
  if (Object.keys(socials).length) payload.socials = { instagram: null, facebook: null, twitter: null, tiktok: null, ...socials };
  if (setup?.color) payload.theme_colors = { [result.templateKey]: expandPalette(result.templateKey, setup.color) };
  let { error: profileErr } = await supabase.from("business_profiles").update(payload).eq("site_id", siteId);
  if (profileErr && "theme_colors" in payload && /theme_colors/i.test(profileErr.message) && /does not exist|schema cache/i.test(profileErr.message)) {
    warnings.push('Your colours were not saved: missing DB column "business_profiles.theme_colors". Run supabase/migrations/003_add_theme_colors_column.sql in Supabase.');
    delete payload.theme_colors;
    ({ error: profileErr } = await supabase.from("business_profiles").update(payload).eq("site_id", siteId));
  }
  if (profileErr) warnings.push(`Profile could not be saved (${profileErr.message}). Add it on the site page.`);

  if (setup?.logo) {
    await uploadLogo(siteId, setup.logo.file).catch((e: unknown) => {
      warnings.push(`Logo upload failed (${errMessage(e)}). Add it on the site page.`);
    });
  }

  for (const key of ["home", "about", "contact"] as const) {
    const data = allPages[key] ?? result.pages[key];
    const valid = validatePageData(data);
    if (!valid.ok) {
      warnings.push(`The ${key} page was invalid and was left blank.`);
      continue;
    }
    const { error } = await supabase.from("pages").update({ data, status: "draft" }).eq("site_id", siteId).eq("key", key);
    if (error) warnings.push(`The ${key} page could not be saved (${error.message}).`);
  }

  for (const extra of result.extraPages) {
    try {
      await createExtraPage(siteId, extra.key, allPages[extra.key] ?? extra.data);
    } catch (e) {
      warnings.push(`Extra page "${extra.label}" could not be created (${e instanceof Error ? e.message : "error"}).`);
    }
  }

  return { siteId, slug, warnings };
}

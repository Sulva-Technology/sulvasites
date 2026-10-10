import { ATTACHMENT_BUCKET, ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, attachmentFolder } from "@/lib/ai/agent/attachments";
import { supabaseBrowser, getAuthenticatedClient } from "@/lib/supabase/browser";

/**
 * Storage bucket setup (Supabase Dashboard):
 * - Create a PUBLIC bucket named: `site-assets`
 * - Public read is allowed (logos/images are public for brochure sites).
 *
 * This MVP uses public URLs via:
 *   supabase.storage.from('site-assets').getPublicUrl(path)
 */

/** Matches the site-assets bucket's allowed_mime_types (supabase/migrations/004_site_assets_bucket.sql). */
export const SITE_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
];

export function safeFilename(filename: string) {
  const base = filename.trim().toLowerCase();
  const cleaned = base.replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-");
  return cleaned || "file";
}

export function getPublicAssetUrl(path: string) {
  const supabase = supabaseBrowser();
  return supabase.storage.from("site-assets").getPublicUrl(path).data.publicUrl;
}

export async function uploadLogo(siteId: string, file: File) {
  if (!file) throw new Error("File is required.");

  // Ensure client is fully authenticated before making database call
  const supabase = await getAuthenticatedClient();
  const path = `${siteId}/logo/${Date.now()}-${safeFilename(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("site-assets")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) throw uploadError;

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .insert({
      site_id: siteId,
      path,
      mime_type: file.type || null,
      size_bytes: file.size || null,
      meta: { originalFilename: file.name },
    })
    .select("id, site_id, path, mime_type, size_bytes, meta, created_at")
    .single();

  if (assetError) throw assetError;

  const { error: profileError } = await supabase
    .from("business_profiles")
    .update({ logo_asset_id: asset.id })
    .eq("site_id", siteId);

  if (profileError) throw profileError;

  return asset as {
    id: string;
    site_id: string;
    path: string;
    mime_type: string | null;
    size_bytes: number | null;
    meta: Record<string, unknown>;
    created_at: string;
  };
}

export async function uploadSiteImage(siteId: string, file: File): Promise<string> {
  if (!file) throw new Error("File is required.");
  if (!SITE_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Please choose a PNG, JPG, WebP, GIF, SVG or AVIF image.");
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("Image must be 10 MB or smaller.");

  const supabase = await getAuthenticatedClient();
  const path = `${siteId}/images/${Date.now()}-${safeFilename(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("site-assets")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    if (/bucket not found/i.test(uploadError.message)) {
      throw new Error("Storage bucket 'site-assets' is missing. Run supabase/migrations/004_site_assets_bucket.sql in the Supabase SQL Editor.");
    }
    throw uploadError;
  }

  // Record the asset; failure here shouldn't block using the uploaded image.
  await supabase.from("assets").insert({
    site_id: siteId,
    path,
    mime_type: file.type || null,
    size_bytes: file.size || null,
    meta: { originalFilename: file.name, kind: "image" },
  });

  return getPublicAssetUrl(path);
}

/**
 * Uploads a file attached in the "Ask AI" panel to <siteId>/assistant/ and returns its public URL.
 * Same bucket and checks as the dashboard uploads; the assistant only proposes using it.
 */
export async function uploadAssistantAttachment(siteId: string, file: File): Promise<string> {
  if (!ATTACHMENT_TYPES.includes(file.type)) throw new Error("Please attach a JPG, PNG or WebP picture.");
  if (file.size > ATTACHMENT_MAX_BYTES) throw new Error("That picture is too big. Pictures must be 10 MB or smaller.");

  const supabase = await getAuthenticatedClient();
  const path = `${attachmentFolder(siteId)}${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeFilename(file.name)}`;
  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new Error("Photo storage isn't set up yet. Please contact Sulvatech support.");
    throw new Error("Your picture couldn't be uploaded. Check your connection and try again.");
  }
  await supabase.from("assets").insert({
    site_id: siteId,
    path,
    mime_type: file.type || null,
    size_bytes: file.size || null,
    meta: { originalFilename: file.name, kind: "assistant" },
  });
  return getPublicAssetUrl(path);
}

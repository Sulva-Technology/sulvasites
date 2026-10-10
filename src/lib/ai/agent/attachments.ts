// Files the owner attaches in the "Ask AI" panel. The browser uploads each one to the site's own
// storage folder first (same bucket, types and size limit as the dashboard uploads), then sends only
// its address; the server accepts addresses inside that site's assistant folder and nothing else.
// Pure; relative imports only (Node test runner).
import type { Attachment, AttachmentKind } from "./types.ts";

export const MAX_ATTACHMENTS = 3;
export const ATTACHMENT_KINDS: AttachmentKind[] = ["photo", "logo", "document"];
/** Pictures the vision models can read. */
export const ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_BUCKET = "site-assets";

/** Storage path prefix for a site's assistant uploads. */
export function attachmentFolder(siteId: string): string {
  return `${siteId}/assistant/`;
}

/** Public URL prefix the server accepts for a site's attachments. */
export function attachmentUrlPrefix(supabaseUrl: string, siteId: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${ATTACHMENT_BUCKET}/${attachmentFolder(siteId)}`;
}

/** A best guess at what a file is, from its name and the owner's message. The owner can change it. */
export function guessAttachmentKind(fileName: string, message = ""): AttachmentKind {
  const t = `${fileName} ${message}`.toLowerCase();
  if (/\blogo\b|brand ?mark|favicon/.test(t)) return "logo";
  if (/\bmenu\b|price ?list|receipt|invoice|flyer|document|\bdoc\b|\bpdf\b|catalogue|catalog/.test(t)) return "document";
  return "photo";
}

/** The attachments a request may use: right kind, inside this site's assistant folder, at most MAX_ATTACHMENTS. */
export function cleanAttachments(v: unknown, siteId: string, supabaseUrl: string | undefined): Attachment[] {
  if (!Array.isArray(v) || !supabaseUrl || !/^[0-9a-f-]{36}$/i.test(siteId)) return [];
  const prefix = attachmentUrlPrefix(supabaseUrl, siteId);
  const out: Attachment[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const r = x as Record<string, unknown>;
    const url = typeof r.url === "string" ? r.url : "";
    const kind = ATTACHMENT_KINDS.find((k) => k === r.kind);
    if (!kind || !url.startsWith(prefix) || url.length > 600) continue;
    const rest = url.slice(prefix.length);
    // One plain file name: no sub-folders, dot-dot, query strings or encoded slashes.
    if (!/^[A-Za-z0-9._-]+$/.test(rest) || rest.includes("..")) continue;
    const name = typeof r.name === "string" ? r.name.replace(/[^\w .()-]/g, "").slice(0, 80) : undefined;
    out.push({ kind, url, ...(name ? { name } : {}) });
    if (out.length >= MAX_ATTACHMENTS) break;
  }
  return out;
}

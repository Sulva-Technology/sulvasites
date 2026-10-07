/** Contact link builders shared by all templates. */

/** Where a navigation entry points: its own path (blog) or the extra page at /p/<key>. */
export function navPageHref(baseUrl: string, page: { key: string; href?: string }): string {
  return page.href ? `${baseUrl}${page.href}` : `${baseUrl}/p/${page.key}`;
}

export function buildTelLink(phone: string | null | undefined): string {
  if (!phone) return "#";
  return `tel:${phone.replace(/\s/g, "")}`;
}

export function buildEmailLink(email: string | null | undefined): string {
  if (!email) return "#";
  return `mailto:${email}`;
}

export function buildWhatsAppLink(whatsapp: string | null | undefined): string {
  if (!whatsapp) return "#";
  const cleaned = whatsapp.replace(/\D/g, "");
  return `https://wa.me/${cleaned}`;
}

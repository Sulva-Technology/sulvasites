export const INBOX_STATUSES = ["new", "read", "replied", "archived"] as const;
export type InboxStatus = (typeof INBOX_STATUSES)[number];
export const INBOX_KINDS = ["enquiry", "booking"] as const;

export const INBOX_STATUS_LABEL: Record<InboxStatus, string> = {
  new: "New",
  read: "Read",
  replied: "Replied",
  archived: "Archived",
};

export type ReplyLinks = { mailto: string | null; tel: string | null; whatsapp: string | null };

/** Reply-by links for the dashboard detail pane. Only built from stored (validated) values. */
export function replyLinks(
  m: { name: string; email: string | null; phone: string | null; kind: "enquiry" | "booking" },
  businessName: string,
): ReplyLinks {
  const subject = m.kind === "booking" ? `Your booking request - ${businessName}` : `Your enquiry - ${businessName}`;
  const body = `Hi ${m.name},\n\nThanks for getting in touch.\n\n`;
  const digits = (m.phone ?? "").replace(/[^\d+]/g, "");
  const waDigits = (m.phone ?? "").replace(/\D/g, "");
  return {
    mailto: m.email ? `mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null,
    tel: digits ? `tel:${digits}` : null,
    whatsapp: waDigits.length >= 7 ? `https://wa.me/${waDigits}` : null,
  };
}

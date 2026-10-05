import type { InboxStatus } from "./status.ts";

export type InboxRow = {
  id: string;
  kind: "enquiry" | "booking";
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  extra: Record<string, string>;
  status: InboxStatus;
  source_page: string | null;
  created_at: string;
};

export type InboxFilter = { status: "all" | "open" | InboxStatus; kind: "all" | "enquiry" | "booking"; q: string };

/** "open" = everything except archived. Search matches name, email, phone, message and extra values. */
export function filterMessages(rows: InboxRow[], f: InboxFilter): InboxRow[] {
  const needle = f.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.status === "open" ? r.status === "archived" : f.status !== "all" && r.status !== f.status) return false;
    if (f.kind !== "all" && r.kind !== f.kind) return false;
    if (!needle) return true;
    const hay = [r.name, r.email ?? "", r.phone ?? "", r.message, ...Object.values(r.extra ?? {})].join("\n").toLowerCase();
    return hay.includes(needle);
  });
}

export function countUnread(rows: Array<Pick<InboxRow, "status">>): number {
  return rows.filter((r) => r.status === "new").length;
}

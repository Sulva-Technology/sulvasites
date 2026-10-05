"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge, btnGhostCls, btnCls, cardCls, errMsg, inputCls, Notice } from "@/components/shop-admin/common";
import { filterMessages, type InboxFilter, type InboxRow } from "@/lib/inbox/filter";
import { INBOX_STATUS_LABEL, replyLinks, type InboxStatus } from "@/lib/inbox/status";
import { getAuthenticatedClient } from "@/lib/supabase/browser";

const LIMIT = 300;
export const INBOX_CHANGED_EVENT = "inbox:changed";

function statusTone(s: InboxStatus): "blue" | "gray" | "green" | "amber" {
  return s === "new" ? "blue" : s === "read" ? "gray" : s === "replied" ? "green" : "amber";
}

/** Inbox list + detail for one site. Shared by /dashboard/[siteId]/inbox and /admin/sites/[siteId]/inbox. */
export default function InboxView({ siteId }: { siteId: string }) {
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [businessName, setBusinessName] = useState("our business");
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>({ status: "open", kind: "all", q: "" });

  const load = useCallback(async () => {
    setErr(null);
    try {
      const db = await getAuthenticatedClient();
      const [{ data, error }, { data: profile }] = await Promise.all([
        db
          .from("inbox_messages")
          .select("id, kind, name, email, phone, message, extra, status, source_page, created_at")
          .eq("site_id", siteId)
          .eq("is_spam", false)
          .order("created_at", { ascending: false })
          .limit(LIMIT),
        db.from("business_profiles").select("business_name").eq("site_id", siteId).maybeSingle(),
      ]);
      if (error) throw error;
      setRows(
        ((data ?? []) as InboxRow[]).map((r) => ({
          ...r,
          extra: r.extra && typeof r.extra === "object" ? r.extra : {},
        })),
      );
      if (typeof profile?.business_name === "string" && profile.business_name) setBusinessName(profile.business_name);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoaded(true);
    }
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => filterMessages(rows, filter), [rows, filter]);
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const setStatus = useCallback(
    async (id: string, status: InboxStatus) => {
      const prev = rows.find((r) => r.id === id)?.status;
      if (!prev || prev === status) return;
      setRows((cur) => cur.map((r) => (r.id === id ? { ...r, status } : r)));
      try {
        const db = await getAuthenticatedClient();
        const { error } = await db.from("inbox_messages").update({ status }).eq("id", id).eq("site_id", siteId);
        if (error) throw error;
        window.dispatchEvent(new Event(INBOX_CHANGED_EVENT));
      } catch (e) {
        setRows((cur) => cur.map((r) => (r.id === id ? { ...r, status: prev } : r)));
        setErr(errMsg(e));
      }
    },
    [rows, siteId],
  );

  const open = (r: InboxRow) => {
    setSelectedId(r.id);
    if (r.status === "new") void setStatus(r.id, "read");
  };

  const unread = rows.filter((r) => r.status === "new").length;
  const links = selected ? replyLinks(selected, businessName) : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[12rem] flex-1 text-sm font-medium text-koi-ink/80">
          Search
          <input
            className={inputCls}
            value={filter.q}
            placeholder="Name, email, phone or message"
            onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
          />
        </label>
        <label className="text-sm font-medium text-koi-ink/80">
          Status
          <select
            className={inputCls}
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value as InboxFilter["status"] }))}
          >
            <option value="open">Open (hides archived)</option>
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="text-sm font-medium text-koi-ink/80">
          Type
          <select
            className={inputCls}
            value={filter.kind}
            onChange={(e) => setFilter((f) => ({ ...f, kind: e.target.value as InboxFilter["kind"] }))}
          >
            <option value="all">All</option>
            <option value="enquiry">Enquiries</option>
            <option value="booking">Bookings</option>
          </select>
        </label>
        <button type="button" className={btnGhostCls} onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {err ? (
        <div className="mb-3">
          <Notice kind="error">{err}</Notice>
        </div>
      ) : null}
      <p className="mb-2 text-xs text-koi-ink/55" aria-live="polite">
        {unread} unread
      </p>

      <div className="grid gap-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section className={`${cardCls} p-0`} aria-label="Messages">
          {!loaded ? (
            <div className="p-4 text-sm text-koi-ink/60">Loading…</div>
          ) : visible.length === 0 ? (
            <div className="p-4 text-sm text-koi-ink/60">
              {rows.length === 0 ? "No messages yet. Enquiries and bookings from your website will appear here." : "No messages match."}
            </div>
          ) : (
            <ul className="max-h-[32rem] divide-y divide-koi-ink/5 overflow-y-auto">
              {visible.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => open(r)}
                    aria-current={r.id === selectedId}
                    className={`block w-full px-4 py-3 text-left hover:bg-koi-paper ${r.id === selectedId ? "bg-koi-paper" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${r.status === "new" ? "font-semibold text-koi-ink" : "text-koi-ink/80"}`}>
                        {r.name}
                      </span>
                      <span className="shrink-0 text-xs text-koi-ink/55">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Badge tone={statusTone(r.status)}>{INBOX_STATUS_LABEL[r.status]}</Badge>
                      <span className="text-xs text-koi-ink/55">{r.kind === "booking" ? "Booking" : "Enquiry"}</span>
                    </div>
                    <div className="mt-1 truncate text-xs text-koi-ink/60">
                      {r.message || Object.values(r.extra).join(" · ") || r.email || r.phone}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {rows.length >= LIMIT ? <p className="px-4 py-2 text-xs text-koi-ink/55">Showing the latest {LIMIT} messages.</p> : null}
        </section>

        <section className={cardCls} aria-label="Message detail">
          {!selected ? (
            <div className="text-sm text-koi-ink/60">Select a message to read it.</div>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-koi-ink">{selected.name}</h2>
                  <p className="text-xs text-koi-ink/55">
                    {selected.kind === "booking" ? "Booking request" : "Enquiry"} · {new Date(selected.created_at).toLocaleString()}
                    {selected.source_page ? ` · from ${selected.source_page}` : ""}
                  </p>
                </div>
                <Badge tone={statusTone(selected.status)}>{INBOX_STATUS_LABEL[selected.status]}</Badge>
              </div>

              <dl className="mt-4 grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 text-sm">
                {selected.email ? (
                  <>
                    <dt className="text-koi-ink/55">Email</dt>
                    <dd className="break-all text-koi-ink">{selected.email}</dd>
                  </>
                ) : null}
                {selected.phone ? (
                  <>
                    <dt className="text-koi-ink/55">Phone</dt>
                    <dd className="text-koi-ink">{selected.phone}</dd>
                  </>
                ) : null}
                {Object.entries(selected.extra).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="capitalize text-koi-ink/55">{k.replace(/_/g, " ")}</dt>
                    <dd className="text-koi-ink">{v}</dd>
                  </div>
                ))}
              </dl>

              {selected.message ? (
                <p className="mt-4 whitespace-pre-wrap rounded bg-koi-paper p-3 text-sm text-koi-ink">{selected.message}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {links?.mailto ? (
                  <a className={btnCls} href={links.mailto} onClick={() => void setStatus(selected.id, "replied")}>
                    Reply by email
                  </a>
                ) : null}
                {links?.whatsapp ? (
                  <a className={btnGhostCls} href={links.whatsapp} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                ) : null}
                {links?.tel ? (
                  <a className={btnGhostCls} href={links.tel}>
                    Call
                  </a>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-koi-ink/5 pt-4">
                <button
                  type="button"
                  className={btnGhostCls}
                  onClick={() => void setStatus(selected.id, selected.status === "new" ? "read" : "new")}
                >
                  {selected.status === "new" ? "Mark as read" : "Mark as unread"}
                </button>
                <button
                  type="button"
                  className={btnGhostCls}
                  disabled={selected.status === "replied"}
                  onClick={() => void setStatus(selected.id, "replied")}
                >
                  Mark as replied
                </button>
                <button
                  type="button"
                  className={btnGhostCls}
                  onClick={() => void setStatus(selected.id, selected.status === "archived" ? "read" : "archived")}
                >
                  {selected.status === "archived" ? "Unarchive" : "Archive"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

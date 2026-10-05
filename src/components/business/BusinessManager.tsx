"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SiteImageProvider } from "@/components/page-editor/ImageField";
import { Badge, btnCls, btnDangerCls, btnGhostCls, cardCls, errMsg, Notice } from "@/components/shop-admin/common";
import { categoryForTemplate } from "@/lib/stockPhotos";
import { DAYS, kindDef, templateOffersKind } from "@/lib/businessData/kinds";
import { orderItems, toServiceItem, toUseCaseItem } from "@/lib/businessData/merge";
import { formatKobo } from "@/lib/businessData/price";
import { seedFromPages } from "@/lib/businessData/seed";
import type { BusinessItemInput, BusinessItemRow, BusinessKind } from "@/lib/businessData/types";
import { emptyForm, itemToForm } from "@/lib/businessData/validate";
import type { PageData } from "@/lib/pageSchema";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import ItemForm from "./ItemForm";
import { isMissingTable, useTemplateKey } from "./useTemplateKey";

const COLS = "id, site_id, kind, position, name, price_kobo, data, active, created_at";

function summary(def: ReturnType<typeof kindDef>, it: BusinessItemRow): string {
  const price = it.price_kobo != null ? formatKobo(it.price_kobo) : "";
  let rest = "";
  if (def.target === "team") rest = [String(it.data.specialty ?? ""), price].filter(Boolean).join(" · ");
  else if (def.target === "use_cases") rest = toUseCaseItem(it).description;
  else rest = toServiceItem(it).desc;
  return rest || price;
}

export default function BusinessManager({
  siteId,
  basePath,
  kind,
  templateKey: provided,
}: {
  siteId: string;
  basePath: string;
  kind: string;
  templateKey?: string;
}) {
  const { templateKey, failed } = useTemplateKey(siteId, provided);
  if (failed) return <Notice kind="error">Site not found, or you do not have access to it.</Notice>;
  if (!templateKey) return <div className="text-sm text-gray-600">Loading…</div>;
  if (!templateOffersKind(templateKey, kind)) {
    return (
      <div className="space-y-3">
        <Notice kind="warn">This list is not available for your website.</Notice>
        <Link href={basePath} className="text-sm text-blue-700 underline">Back to business</Link>
      </div>
    );
  }
  return (
    <SiteImageProvider siteId={siteId}>
      <Inner siteId={siteId} basePath={basePath} kind={kind} templateKey={templateKey} />
    </SiteImageProvider>
  );
}

function Inner({ siteId, basePath, kind, templateKey }: { siteId: string; basePath: string; kind: BusinessKind; templateKey: string }) {
  const def = useMemo(() => kindDef(kind, categoryForTemplate(templateKey)), [kind, templateKey]);
  const [items, setItems] = useState<BusinessItemRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState<"new" | string | null>(null);

  const load = useCallback(async () => {
    try {
      const db = await getAuthenticatedClient();
      const { data, error } = await db
        .from("business_items")
        .select(COLS)
        .eq("site_id", siteId)
        .eq("kind", kind)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      setItems((data ?? []) as BusinessItemRow[]);
    } catch (e) {
      if (isMissingTable(e)) setMissing(true);
      else setErr(errMsg(e));
    } finally {
      setLoaded(true);
    }
  }, [siteId, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const ordered = useMemo(() => orderItems(items, def), [items, def]);
  const nextPosition = items.reduce((m, i) => Math.max(m, i.position), -1) + 1;

  async function run(fn: () => Promise<string | void>) {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const msg = await fn();
      await load();
      if (msg) setOk(msg);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const save = (value: BusinessItemInput) =>
    run(async () => {
      const db = await getAuthenticatedClient();
      if (editing === "new") {
        const { error } = await db.from("business_items").insert({ site_id: siteId, kind, position: nextPosition, ...value });
        if (error) throw error;
      } else {
        const { error } = await db.from("business_items").update(value).eq("id", editing!).eq("site_id", siteId);
        if (error) throw error;
      }
      setEditing(null);
      return "Saved. Your website is updated.";
    });

  const toggle = (it: BusinessItemRow) =>
    run(async () => {
      const db = await getAuthenticatedClient();
      const { error } = await db.from("business_items").update({ active: !it.active }).eq("id", it.id).eq("site_id", siteId);
      if (error) throw error;
    });

  const remove = (it: BusinessItemRow) => {
    if (!window.confirm(`Delete "${it.name}"? This cannot be undone.`)) return;
    return run(async () => {
      const db = await getAuthenticatedClient();
      const { error } = await db.from("business_items").delete().eq("id", it.id).eq("site_id", siteId);
      if (error) throw error;
      if (editing === it.id) setEditing(null);
      return "Deleted.";
    });
  };

  const groupOf = (it: BusinessItemRow) => (def.groupBy ? String(it.data[def.groupBy] ?? "").trim().toLowerCase() : "");

  /** Swap with the neighbour in the same group, then renumber positions 0..n-1 in display order. */
  const move = (it: BusinessItemRow, dir: -1 | 1) =>
    run(async () => {
      const idx = ordered.findIndex((x) => x.id === it.id);
      let j = idx + dir;
      while (j >= 0 && j < ordered.length && groupOf(ordered[j]!) !== groupOf(it)) j += dir;
      if (j < 0 || j >= ordered.length) return;
      const next = [...ordered];
      [next[idx], next[j]] = [next[j]!, next[idx]!];
      const db = await getAuthenticatedClient();
      const changed = next.map((x, p) => ({ x, p })).filter(({ x, p }) => x.position !== p);
      const results = await Promise.all(
        changed.map(({ x, p }) => db.from("business_items").update({ position: p }).eq("id", x.id).eq("site_id", siteId)),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    });

  const importFromSite = () =>
    run(async () => {
      const db = await getAuthenticatedClient();
      const [core, extra] = await Promise.all([
        db.from("pages").select("data").eq("site_id", siteId),
        db.from("extra_pages").select("data").eq("site_id", siteId),
      ]);
      if (core.error) throw core.error;
      if (extra.error) throw extra.error;
      const pages = [...(core.data ?? []), ...(extra.data ?? [])].map((r) => (r as { data: PageData }).data);
      const rows = seedFromPages(kind, templateKey, pages, items.map((i) => i.name));
      if (rows.length === 0) return "Nothing new to import: no matching items on your website pages.";
      const { error } = await db
        .from("business_items")
        .insert(rows.map((r, i) => ({ site_id: siteId, kind, position: nextPosition + i, ...r })));
      if (error) throw error;
      return `Imported ${rows.length} item${rows.length === 1 ? "" : "s"} from your website. Review them and add prices and details.`;
    });

  if (missing) {
    return <Notice kind="warn">Business lists are not switched on for this platform yet. Please contact Sulvatech.</Notice>;
  }

  const editingItem = editing && editing !== "new" ? items.find((i) => i.id === editing) : null;
  let lastGroup: string | null = null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href={basePath} className="text-xs text-gray-500 underline">Business</Link>
          <h2 className="text-lg font-semibold text-gray-900">{def.plural}</h2>
          <p className="text-sm text-gray-600">{def.blurb}</p>
        </div>
        <div className="flex gap-2">
          <button className={btnGhostCls} disabled={busy || !loaded} onClick={() => void importFromSite()}>
            Import from my site content
          </button>
          <button className={btnCls} disabled={busy || editing === "new"} onClick={() => { setOk(null); setEditing("new"); }}>
            Add {def.singular.toLowerCase()}
          </button>
        </div>
      </div>

      {err ? <Notice kind="error">{err}</Notice> : null}
      {ok ? <Notice kind="ok">{ok}</Notice> : null}

      {editing === "new" ? (
        <ItemForm
          key="new"
          kind={kind}
          templateKey={templateKey}
          def={def}
          initial={emptyForm(def)}
          saving={busy}
          submitLabel={`Add ${def.singular.toLowerCase()}`}
          onSubmit={(v) => void save(v)}
          onCancel={() => setEditing(null)}
        />
      ) : null}

      {!loaded ? <div className="text-sm text-gray-600">Loading…</div> : null}

      {loaded && items.length === 0 && editing !== "new" ? (
        <div className={`${cardCls} text-center`}>
          <div className="font-medium text-gray-900">No {def.plural.toLowerCase()} yet</div>
          <p className="mt-1 text-sm text-gray-600">{def.emptyHint}</p>
          <p className="mt-1 text-xs text-gray-500">Until you add some, your website keeps showing its current content.</p>
          <div className="mt-3 flex justify-center gap-2">
            <button className={btnCls} disabled={busy} onClick={() => setEditing("new")}>Add {def.singular.toLowerCase()}</button>
            <button className={btnGhostCls} disabled={busy} onClick={() => void importFromSite()}>Import from my site content</button>
          </div>
        </div>
      ) : null}

      {ordered.length > 0 && !ordered.some((i) => i.active) ? (
        <Notice kind="info">Everything here is switched off, so your website shows its original content instead.</Notice>
      ) : null}

      <ul className="space-y-2">
        {ordered.map((it, idx) => {
          const g = groupOf(it);
          const heading = def.groupBy && g !== lastGroup ? String(it.data[def.groupBy] ?? "").trim() || "No section" : null;
          lastGroup = g;
          const prevSame = ordered.slice(0, idx).some((x) => groupOf(x) === g);
          const nextSame = ordered.slice(idx + 1).some((x) => groupOf(x) === g);
          const dayLabel = def.autoSort ? DAYS.find((d) => d.value === it.data.day)?.short : null;
          return (
            <li key={it.id}>
              {heading ? <div className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{heading}</div> : null}
              {editingItem?.id === it.id ? (
                <ItemForm
                  key={it.id}
                  kind={kind}
                  templateKey={templateKey}
                  def={def}
                  initial={itemToForm(def, it)}
                  saving={busy}
                  submitLabel="Save changes"
                  onSubmit={(v) => void save(v)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className={`${cardCls} flex items-start gap-3 ${it.active ? "" : "opacity-70"}`}>
                  {typeof it.data.photo === "string" && it.data.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.data.photo} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{it.name}</span>
                      {dayLabel ? <Badge tone="blue">{dayLabel}</Badge> : null}
                      {!it.active ? <Badge tone="amber">{def.inactiveBadge}</Badge> : null}
                    </div>
                    {summary(def, it) ? <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{summary(def, it)}</p> : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {!def.autoSort ? (
                      <>
                        <button className={btnGhostCls} aria-label={`Move ${it.name} up`} disabled={busy || !prevSame} onClick={() => void move(it, -1)}>↑</button>
                        <button className={btnGhostCls} aria-label={`Move ${it.name} down`} disabled={busy || !nextSame} onClick={() => void move(it, 1)}>↓</button>
                      </>
                    ) : null}
                    <button className={btnGhostCls} disabled={busy} onClick={() => void toggle(it)}>{it.active ? "Switch off" : "Switch on"}</button>
                    <button className={btnGhostCls} disabled={busy} onClick={() => { setOk(null); setEditing(it.id); }}>Edit</button>
                    <button className={btnDangerCls} disabled={busy} onClick={() => void remove(it)}>Delete</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {def.autoSort && items.length > 1 ? <p className="text-xs text-gray-500">Sorted by day and start time automatically.</p> : null}
    </div>
  );
}

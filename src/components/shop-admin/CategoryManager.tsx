"use client";

import { useCallback, useEffect, useState } from "react";

import { slugify } from "@/lib/slugify";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import {
  btnCls, btnDangerCls, btnGhostCls, cardCls, errMsg, inputCls, NoAccess, Notice, type ShopAdminProps,
} from "./common";
import ShopAdminTabs from "./ShopAdminTabs";

type Category = { id: string; name: string; slug: string; position: number };

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export default function CategoryManager(props: ShopAdminProps) {
  if (props.role === "staff") return <NoAccess />;
  return <Inner {...props} />;
}

function Inner(props: ShopAdminProps) {
  const { siteId } = props;
  const [cats, setCats] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string; slug: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const db = await getAuthenticatedClient();
      const { data, error } = await db
        .from("product_categories")
        .select("id, name, slug, position")
        .eq("site_id", siteId)
        .order("position")
        .order("name");
      if (error) throw error;
      setCats((data ?? []) as Category[]);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoaded(true);
    }
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await load();
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setErr(code === "23505" ? "Another category already uses that URL name." : errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    const n = name.trim();
    const slug = slugify(n);
    if (!n) return setErr("Enter a category name.");
    if (!SLUG_RE.test(slug)) return setErr("Category name must contain letters or numbers.");
    await run(async () => {
      const db = await getAuthenticatedClient();
      const { error } = await db
        .from("product_categories")
        .insert({ site_id: siteId, name: n, slug, position: cats.length });
      if (error) throw error;
      setName("");
    });
  }

  async function saveEdit() {
    if (!editing) return;
    const n = editing.name.trim();
    const slug = editing.slug.trim();
    if (!n) return setErr("Enter a category name.");
    if (!SLUG_RE.test(slug)) return setErr("URL name may use lowercase letters, numbers and single hyphens only.");
    await run(async () => {
      const db = await getAuthenticatedClient();
      const { error } = await db
        .from("product_categories")
        .update({ name: n, slug })
        .eq("id", editing.id)
        .eq("site_id", siteId);
      if (error) throw error;
      setEditing(null);
    });
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= cats.length) return;
    const next = [...cats];
    [next[index], next[j]] = [next[j], next[index]];
    await run(async () => {
      const db = await getAuthenticatedClient();
      const results = await Promise.all(
        next.map((c, i) =>
          c.position === i ? null : db.from("product_categories").update({ position: i }).eq("id", c.id).eq("site_id", siteId),
        ),
      );
      const bad = results.find((r) => r && r.error);
      if (bad?.error) throw bad.error;
    });
  }

  async function remove(c: Category) {
    if (!window.confirm(`Delete "${c.name}"? Its products stay in the shop but become uncategorised.`)) return;
    await run(async () => {
      const db = await getAuthenticatedClient();
      const { error } = await db.from("product_categories").delete().eq("id", c.id).eq("site_id", siteId);
      if (error) throw error;
    });
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Shop</h1>
      <ShopAdminTabs {...props} active="categories" />
      {err ? (
        <div className="mb-3">
          <Notice kind="error">{err}</Notice>
        </div>
      ) : null}
      <section className={cardCls}>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <label className="min-w-[14rem] flex-1 text-sm font-medium text-gray-800">
            New category
            <input className={inputCls} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </label>
          <button type="submit" className={btnCls} disabled={busy}>
            Add category
          </button>
        </form>
      </section>
      <section className={`${cardCls} mt-4`}>
        {!loaded ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : cats.length === 0 ? (
          <div className="text-sm text-gray-600">No categories yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {cats.map((c, i) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-2">
                {editing?.id === c.id ? (
                  <>
                    <input
                      aria-label="Category name"
                      className={`${inputCls} !mt-0 w-48`}
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    />
                    <input
                      aria-label="Category URL name"
                      className={`${inputCls} !mt-0 w-48 font-mono`}
                      value={editing.slug}
                      onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                    />
                    <button type="button" className={btnCls} disabled={busy} onClick={saveEdit}>
                      Save
                    </button>
                    <button type="button" className={btnGhostCls} onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900">{c.name}</div>
                      <div className="truncate font-mono text-xs text-gray-500">/shop/c/{c.slug}</div>
                    </div>
                    <button type="button" className={btnGhostCls} disabled={busy || i === 0} aria-label={`Move ${c.name} up`} onClick={() => move(i, -1)}>
                      Up
                    </button>
                    <button type="button" className={btnGhostCls} disabled={busy || i === cats.length - 1} aria-label={`Move ${c.name} down`} onClick={() => move(i, 1)}>
                      Down
                    </button>
                    <button type="button" className={btnGhostCls} onClick={() => setEditing({ id: c.id, name: c.name, slug: c.slug })}>
                      Edit
                    </button>
                    <button type="button" className={btnDangerCls} disabled={busy} onClick={() => remove(c)}>
                      Delete
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

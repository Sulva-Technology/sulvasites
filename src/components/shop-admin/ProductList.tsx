"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatNaira } from "@/lib/shop/money";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import {
  Badge, btnCls, btnGhostCls, cardCls, errMsg, inputCls, NoAccess, Notice, type ShopAdminProps,
} from "./common";
import ShopAdminTabs from "./ShopAdminTabs";

type Product = {
  id: string;
  name: string;
  slug: string;
  price_kobo: number;
  active: boolean;
  featured: boolean;
  position: number;
  category_id: string | null;
  images: Array<{ url?: string }>;
};

export default function ProductList(props: ShopAdminProps) {
  if (props.role === "staff") return <NoAccess />;
  return <Inner {...props} />;
}

function Inner(props: ShopAdminProps) {
  const { siteId, basePath } = props;
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Array<{ id: string; name: string }>>([]);
  const [stock, setStock] = useState<Record<string, { tracked: number; total: number; out: number }>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const load = useCallback(async () => {
    try {
      const db = await getAuthenticatedClient();
      const [p, c, v] = await Promise.all([
        db.from("products").select("id, name, slug, price_kobo, active, featured, position, category_id, images").eq("site_id", siteId).order("position").order("name"),
        db.from("product_categories").select("id, name").eq("site_id", siteId).order("position").order("name"),
        db.from("product_variants").select("product_id, stock").eq("site_id", siteId),
      ]);
      if (p.error) throw p.error;
      if (c.error) throw c.error;
      if (v.error) throw v.error;
      setProducts(((p.data ?? []) as Product[]).map((x) => ({ ...x, price_kobo: Number(x.price_kobo) })));
      setCats((c.data ?? []) as Array<{ id: string; name: string }>);
      const s: Record<string, { tracked: number; total: number; out: number }> = {};
      for (const r of (v.data ?? []) as Array<{ product_id: string; stock: number | null }>) {
        const e = (s[r.product_id] ??= { tracked: 0, total: 0, out: 0 });
        e.total += 1;
        if (r.stock !== null) {
          e.tracked += 1;
          if (r.stock === 0) e.out += 1;
        }
      }
      setStock(s);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoaded(true);
    }
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const catName = useMemo(() => new Map(cats.map((c) => [c.id, c.name])), [cats]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter(
      (p) => (!cat || (cat === "none" ? !p.category_id : p.category_id === cat)) && (!needle || p.name.toLowerCase().includes(needle) || p.slug.includes(needle)),
    );
  }, [products, q, cat]);
  const canReorder = !q.trim() && !cat;

  async function toggleActive(p: Product) {
    setBusy(true);
    setErr(null);
    try {
      const db = await getAuthenticatedClient();
      const { data, error } = await db.from("products").update({ active: !p.active }).eq("id", p.id).eq("site_id", siteId).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Product could not be updated.");
      setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x)));
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= products.length) return;
    const next = [...products];
    [next[index], next[j]] = [next[j], next[index]];
    const renumbered = next.map((p, i) => ({ ...p, position: i }));
    setBusy(true);
    setErr(null);
    try {
      const db = await getAuthenticatedClient();
      const changed = renumbered.filter((p, i) => p.position !== products[i]?.position || p.id !== products[i]?.id);
      const results = await Promise.all(
        changed.map((p) => db.from("products").update({ position: p.position }).eq("id", p.id).eq("site_id", siteId)),
      );
      const bad = results.find((r) => r.error);
      if (bad?.error) throw bad.error;
      setProducts(renumbered);
    } catch (e) {
      setErr(errMsg(e));
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Shop</h1>
      <ShopAdminTabs {...props} active="products" />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[12rem] flex-1 text-sm font-medium text-gray-800">
          Search
          <input className={inputCls} value={q} placeholder="Name or URL name" onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="text-sm font-medium text-gray-800">
          Category
          <select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All</option>
            <option value="none">Uncategorised</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Link href={`${basePath}/products/new`} className={btnCls}>
          Add product
        </Link>
      </div>
      {err ? (
        <div className="mb-3">
          <Notice kind="error">{err}</Notice>
        </div>
      ) : null}
      <section className={cardCls}>
        {!loaded ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-gray-600">{products.length === 0 ? "No products yet." : "No products match."}</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((p) => {
              const i = products.findIndex((x) => x.id === p.id);
              const st = stock[p.id];
              const img = p.images?.[0]?.url;
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`${basePath}/products/${p.id}`} className="block truncate text-sm font-medium text-blue-800 hover:underline">
                      {p.name}
                    </Link>
                    <div className="text-xs text-gray-500">
                      {formatNaira(p.price_kobo)}
                      {p.category_id ? ` · ${catName.get(p.category_id) ?? ""}` : " · Uncategorised"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.featured ? <Badge tone="blue">Featured</Badge> : null}
                    {st ? (
                      st.out > 0 ? (
                        <Badge tone="red">{st.out === st.tracked ? "Out of stock" : `${st.out} variant(s) out`}</Badge>
                      ) : (
                        <Badge tone="gray">{st.total} variant(s)</Badge>
                      )
                    ) : null}
                  </div>
                  <label className="flex items-center gap-1 text-xs text-gray-700">
                    <input type="checkbox" checked={p.active} disabled={busy} onChange={() => toggleActive(p)} />
                    Active
                  </label>
                  {canReorder ? (
                    <>
                      <button type="button" className={btnGhostCls} disabled={busy || i === 0} aria-label={`Move ${p.name} up`} onClick={() => move(i, -1)}>
                        Up
                      </button>
                      <button type="button" className={btnGhostCls} disabled={busy || i === products.length - 1} aria-label={`Move ${p.name} down`} onClick={() => move(i, 1)}>
                        Down
                      </button>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

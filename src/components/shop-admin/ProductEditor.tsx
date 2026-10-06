"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import ImageField, { SiteImageProvider } from "@/components/page-editor/ImageField";
import { ensureShopEnabled } from "@/lib/shop/autoEnable";
import { slugify } from "@/lib/slugify";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import type { VariantRow } from "@/lib/shop/variantMatrix";
import {
  btnCls, btnDangerCls, btnGhostCls, cardCls, errMsg, inputCls, NairaInput, NoAccess, Notice, type ShopAdminProps,
} from "./common";
import ShopAdminTabs from "./ShopAdminTabs";
import VariantTable from "./VariantTable";

type Img = { url: string; alt: string };
type Category = { id: string; name: string };
type Form = {
  name: string;
  slug: string;
  description: string;
  category_id: string;
  price_kobo: number | null;
  compare_at_kobo: number | null;
  active: boolean;
  featured: boolean;
  images: Img[];
};

const EMPTY: Form = {
  name: "", slug: "", description: "", category_id: "", price_kobo: null, compare_at_kobo: null,
  active: true, featured: false, images: [],
};
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED = ["cart", "checkout", "order", "c"];
const MAX_IMAGES = 10;

export default function ProductEditor(props: ShopAdminProps & { productId: string }) {
  if (props.role === "staff") return <NoAccess />;
  return (
    <SiteImageProvider siteId={props.siteId}>
      <Inner {...props} />
    </SiteImageProvider>
  );
}

function Inner(props: ShopAdminProps & { productId: string }) {
  const { siteId, basePath, productId } = props;
  const router = useRouter();
  const isNew = productId === "new";
  const [form, setForm] = useState<Form>(EMPTY);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [originalVariantIds, setOriginalVariantIds] = useState<string[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [tableKey, setTableKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const db = await getAuthenticatedClient();
      const catRes = await db.from("product_categories").select("id, name").eq("site_id", siteId).order("position").order("name");
      if (catRes.error) throw catRes.error;
      setCats((catRes.data ?? []) as Category[]);
      if (!isNew) {
        const [p, v] = await Promise.all([
          db.from("products").select("*").eq("id", productId).eq("site_id", siteId).maybeSingle(),
          db.from("product_variants").select("id, options, price_kobo, stock, sku, position").eq("product_id", productId).eq("site_id", siteId).order("position"),
        ]);
        if (p.error) throw p.error;
        if (v.error) throw v.error;
        if (!p.data) {
          setErr("Product not found.");
        } else {
          const d = p.data;
          setForm({
            name: d.name,
            slug: d.slug,
            description: d.description ?? "",
            category_id: d.category_id ?? "",
            price_kobo: Number(d.price_kobo),
            compare_at_kobo: d.compare_at_kobo === null ? null : Number(d.compare_at_kobo),
            active: Boolean(d.active),
            featured: Boolean(d.featured),
            images: Array.isArray(d.images)
              ? (d.images as Array<{ url?: unknown; alt?: unknown }>).map((i) => ({
                  url: typeof i.url === "string" ? i.url : "",
                  alt: typeof i.alt === "string" ? i.alt : "",
                }))
              : [],
          });
          const rows: VariantRow[] = (v.data ?? []).map((r) => ({
            id: r.id as string,
            options: (r.options ?? {}) as Record<string, string>,
            price_kobo: r.price_kobo === null ? null : Number(r.price_kobo),
            stock: r.stock === null ? null : Number(r.stock),
            sku: (r.sku as string | null) ?? null,
            position: Number(r.position),
          }));
          setVariants(rows);
          setOriginalVariantIds(rows.map((r) => r.id as string));
          setTableKey((k) => k + 1);
        }
      }
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoaded(true);
    }
  }, [siteId, productId, isNew]);

  useEffect(() => {
    void load();
  }, [load]);

  function setName(name: string) {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  }

  function moveImage(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= form.images.length) return;
    const imgs = [...form.images];
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    setForm({ ...form, images: imgs });
  }

  function validate(): string | null {
    if (!form.name.trim()) return "Enter a product name.";
    if (!SLUG_RE.test(form.slug)) return "URL name may use lowercase letters, numbers and single hyphens only.";
    if (RESERVED.includes(form.slug)) return `"${form.slug}" is reserved. Choose another URL name.`;
    if (form.price_kobo === null) return "Enter a price.";
    if (form.compare_at_kobo !== null && form.compare_at_kobo <= form.price_kobo) {
      return "Compare-at price must be higher than the price (or leave it empty).";
    }
    const seen = new Set<string>();
    for (const v of variants) {
      const k = JSON.stringify(Object.entries(v.options).sort());
      if (seen.has(k)) return "Two variants have the same options.";
      seen.add(k);
    }
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) {
      setErr(problem);
      setOk(null);
      return;
    }
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const db = await getAuthenticatedClient();
      const payload = {
        site_id: siteId,
        category_id: form.category_id || null,
        name: form.name.trim(),
        slug: form.slug,
        description: form.description.trim() || null,
        images: form.images.filter((i) => i.url.trim()).map((i) => ({ url: i.url.trim(), alt: i.alt.trim() })),
        price_kobo: form.price_kobo,
        compare_at_kobo: form.compare_at_kobo,
        active: form.active,
        featured: form.featured,
      };
      let id = productId;
      if (isNew) {
        const count = await db.from("products").select("id", { count: "exact", head: true }).eq("site_id", siteId);
        const { data, error } = await db
          .from("products")
          .insert({ ...payload, position: count.count ?? 0 })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id as string;
      } else {
        const { data, error } = await db.from("products").update(payload).eq("id", productId).eq("site_id", siteId).select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("Product could not be updated.");
      }

      // Variants: delete removed, update kept, insert new.
      const keptIds = variants.map((v) => v.id).filter((x): x is string => Boolean(x));
      const removed = originalVariantIds.filter((x) => !keptIds.includes(x));
      if (removed.length) {
        const { error } = await db.from("product_variants").delete().in("id", removed).eq("site_id", siteId);
        if (error) throw error;
      }
      for (const [position, v] of variants.entries()) {
        const row = { options: v.options, price_kobo: v.price_kobo, stock: v.stock, sku: v.sku, position };
        if (v.id) {
          const { error } = await db.from("product_variants").update(row).eq("id", v.id).eq("site_id", siteId);
          if (error) throw error;
        }
      }
      const fresh = variants
        .map((v, position) => ({ v, position }))
        .filter(({ v }) => !v.id)
        .map(({ v, position }) => ({
          product_id: id, site_id: siteId, options: v.options, price_kobo: v.price_kobo, stock: v.stock, sku: v.sku, position,
        }));
      if (fresh.length) {
        const { error } = await db.from("product_variants").insert(fresh);
        if (error) throw error;
      }

      if (isNew) {
        // A first product is the signal the owner is selling: make sure customers can see it.
        await ensureShopEnabled(db, siteId, "products");
        router.replace(`${basePath}/products/${id}`);
      } else {
        await load();
        setOk("Saved.");
      }
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setErr(code === "23505" ? "Another product already uses that URL name." : errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${form.name}" and its variants? Past orders keep their line items.`)) return;
    setBusy(true);
    setErr(null);
    try {
      const db = await getAuthenticatedClient();
      const { error } = await db.from("products").delete().eq("id", productId).eq("site_id", siteId);
      if (error) throw error;
      router.replace(`${basePath}/products`);
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight text-koi-ink">Shop</h1>
      <ShopAdminTabs {...props} active="products" />
      <div className="mb-3">
        <Link href={`${basePath}/products`} className="text-sm text-koi-deep underline">
          Back to products
        </Link>
      </div>
      {!loaded ? (
        <div className="text-sm text-koi-ink/60">Loading…</div>
      ) : (
        <div className="space-y-4">
          {err ? <Notice kind="error">{err}</Notice> : null}
          {ok ? <Notice kind="ok">{ok}</Notice> : null}

          <section className={`${cardCls} grid gap-3 md:grid-cols-2`}>
            <label className="text-sm font-medium text-koi-ink/80 md:col-span-2">
              Name
              <input className={inputCls} value={form.name} maxLength={160} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="text-sm font-medium text-koi-ink/80">
              URL name
              <input
                className={`${inputCls} font-mono`}
                value={form.slug}
                maxLength={120}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm({ ...form, slug: e.target.value });
                }}
              />
            </label>
            <label className="text-sm font-medium text-koi-ink/80">
              Category
              <select className={inputCls} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Uncategorised</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-sm font-medium text-koi-ink/80">
              <label htmlFor="price">Price (₦)</label>
              <NairaInput id="price" valueKobo={form.price_kobo} onChange={(k) => setForm((f) => ({ ...f, price_kobo: k }))} />
            </div>
            <div className="text-sm font-medium text-koi-ink/80">
              <label htmlFor="compare">Compare-at price (₦, optional)</label>
              <NairaInput id="compare" valueKobo={form.compare_at_kobo} onChange={(k) => setForm((f) => ({ ...f, compare_at_kobo: k }))} />
            </div>
            <label className="text-sm font-medium text-koi-ink/80 md:col-span-2">
              Description
              <textarea className={inputCls} rows={5} value={form.description} maxLength={5000} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="flex items-center gap-2 text-sm text-koi-ink/80">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active (visible in the shop)
            </label>
            <label className="flex items-center gap-2 text-sm text-koi-ink/80">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
              Featured
            </label>
          </section>

          <section className={cardCls}>
            <h2 className="mb-2 text-sm font-semibold text-koi-ink">Images</h2>
            <div className="space-y-4">
              {form.images.map((img, i) => (
                <div key={i} className="rounded border border-koi-ink/5 p-3">
                  <ImageField
                    label={i === 0 ? "Main image" : `Image ${i + 1}`}
                    value={img.url}
                    onChange={(url) => setForm((f) => ({ ...f, images: f.images.map((x, j) => (j === i ? { ...x, url } : x)) }))}
                  />
                  <label className="mt-2 block text-sm font-medium text-koi-ink/80">
                    Alt text
                    <input
                      className={inputCls}
                      value={img.alt}
                      maxLength={200}
                      onChange={(e) => setForm((f) => ({ ...f, images: f.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)) }))}
                    />
                  </label>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className={btnGhostCls} disabled={i === 0} onClick={() => moveImage(i, -1)}>
                      Move up
                    </button>
                    <button type="button" className={btnGhostCls} disabled={i === form.images.length - 1} onClick={() => moveImage(i, 1)}>
                      Move down
                    </button>
                    <button type="button" className={btnDangerCls} onClick={() => setForm({ ...form, images: form.images.filter((_, j) => j !== i) })}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={`${btnGhostCls} mt-3`}
              disabled={form.images.length >= MAX_IMAGES}
              onClick={() => setForm({ ...form, images: [...form.images, { url: "", alt: "" }] })}
            >
              Add image
            </button>
          </section>

          <section className={cardCls}>
            <h2 className="mb-2 text-sm font-semibold text-koi-ink">Variants and stock</h2>
            <VariantTable key={tableKey} variants={variants} onChange={setVariants} basePriceKobo={form.price_kobo} />
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={btnCls} disabled={busy} onClick={save}>
              {busy ? "Saving…" : isNew ? "Create product" : "Save product"}
            </button>
            {!isNew ? (
              <button type="button" className={btnDangerCls} disabled={busy} onClick={remove}>
                Delete product
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

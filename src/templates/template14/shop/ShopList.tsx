"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatNaira } from "@/lib/shop/money";
import { shopHref, useT14 } from "../ctx";
import { IconClose, IconFilter, IconSearch } from "../icons";
import DealsStrip from "./DealsStrip";
import {
  dealProducts,
  filterProducts,
  SORTS,
  sortProducts,
  type ProductFilters,
  type SortId,
} from "./helpers";
import ProductCard from "./ProductCard";

const toKobo = (raw: string): number | null => {
  const n = Number(raw.replace(/[^\d.]/g, ""));
  return raw.trim() && Number.isFinite(n) ? Math.round(n * 100) : null;
};

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <li>
      <button type="button" className="t14-chip t14-sl-x" onClick={onRemove}>
        {label} <IconClose size={12} />
        <span className="t14-sr"> (remove filter)</span>
      </button>
    </li>
  );
}

/**
 * All products, or one category. A sticky toolbar (search, category chips, a filters popover and
 * sorting) runs over the loaded catalogue in the browser. Search shares its text with the header box.
 */
export default function ShopList({ categorySlug }: { categorySlug?: string }) {
  const { shop, baseUrl, query, setQuery } = useT14();
  const [sort, setSort] = useState<SortId>("featured");
  const [catId, setCatId] = useState<string | null>(null);
  const [minRaw, setMinRaw] = useState("");
  const [maxRaw, setMaxRaw] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  // Links such as /shop?q=cable or /shop?sale=1 (header search, "See all deals") pre-set the filters.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const sale = params.get("sale") === "1";
    // Applied after the effect body so the first paint matches the server render.
    queueMicrotask(() => {
      if (q) setQuery(q);
      if (sale) setOnSaleOnly(true);
    });
  }, [setQuery]);

  // The filters popover closes on Escape (focus returns to its button) and on a click outside the bar.
  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFiltersOpen(false);
        filterBtnRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [filtersOpen]);

  const category = shop?.categories.find((c) => c.slug === categorySlug) ?? null;

  const products = useMemo(() => {
    if (!shop) return [];
    const filters: ProductFilters = {
      query,
      categoryId: category ? category.id : catId,
      minKobo: toKobo(minRaw),
      maxKobo: toKobo(maxRaw),
      inStockOnly,
      onSaleOnly,
    };
    return sortProducts(filterProducts(shop, shop.products, filters), sort);
  }, [shop, sort, query, category, catId, minRaw, maxRaw, inStockOnly, onSaleOnly]);

  const deals = useMemo(() => (shop ? dealProducts(shop).slice(0, 10) : []), [shop]);

  if (!shop) return null;
  const cats = [...shop.categories].sort((a, b) => a.position - b.position);
  const title = category ? category.name : "Shop";

  const priceActive = !!minRaw.trim() || !!maxRaw.trim();
  const active = !!query.trim() || (!category && !!catId) || priceActive || inStockOnly || onSaleOnly;
  const popCount = Number(priceActive) + Number(inStockOnly) + Number(onSaleOnly);
  const clear = () => {
    setQuery("");
    setCatId(null);
    setMinRaw("");
    setMaxRaw("");
    setInStockOnly(false);
    setOnSaleOnly(false);
  };
  const fee = shop.settings.deliveryFeeKobo;
  const deliveryText = fee > 0 ? `, delivery from ${formatNaira(fee)}` : ", free delivery";
  const countText = `${products.length} ${products.length === 1 ? "product" : "products"}`;
  const priceLabel = `Price ${minRaw.trim() ? `from ₦${minRaw.trim()}` : ""} ${maxRaw.trim() ? `to ₦${maxRaw.trim()}` : ""}`.replace(/\s+/g, " ").trim();

  return (
    <section className="t14-sl t14-shop-page">
      <div className="t14-container">
        <header className="t14-sl-head">
          <nav className="t14-crumbs" aria-label="Breadcrumb">
            <Link href={`${baseUrl}/`}>Home</Link>
            <span aria-hidden="true">/</span>
            {category ? <Link href={shopHref(baseUrl)}>Shop</Link> : <span aria-current="page">Shop</span>}
            {category ? (
              <>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{category.name}</span>
              </>
            ) : null}
          </nav>
          <h1 className="t14-h1">{title}.</h1>
          <p className="t14-lead" role="status" aria-live="polite">
            {countText}
            {query.trim() ? <> for &ldquo;{query.trim()}&rdquo;</> : null}
            {deliveryText}.
          </p>
        </header>

        {!category && !active && deals.length > 0 ? <DealsStrip products={deals} id="t14-list-deals" showAll={false} /> : null}

        <div className="t14-sl-barwrap">
          <div className="t14-sl-bar" ref={barRef}>
            <label className="t14-sl-search">
              <IconSearch size={16} />
              <span className="t14-sr">Search products</span>
              <input
                type="search"
                value={query}
                placeholder="Search products"
                autoComplete="off"
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            {!category && cats.length > 0 ? (
              <div className="t14-sl-cats" role="group" aria-label="Category">
                <button type="button" aria-pressed={catId === null} onClick={() => setCatId(null)}>
                  All
                </button>
                {cats.map((c) => (
                  <button key={c.id} type="button" aria-pressed={catId === c.id} onClick={() => setCatId(c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>
            ) : null}

            <button
              ref={filterBtnRef}
              type="button"
              className="t14-pill t14-pill-soft t14-sl-filterbtn"
              aria-expanded={filtersOpen}
              aria-controls="t14-sl-pop"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <IconFilter size={16} /> Filters
              {popCount > 0 ? <span className="t14-sl-badge">{popCount}</span> : null}
            </button>

            <label className="t14-sl-sort">
              <span className="t14-sr">Sort by</span>
              <select className="t14-pill t14-pill-soft" value={sort} onChange={(e) => setSort(e.target.value as SortId)}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            {filtersOpen ? (
              <div id="t14-sl-pop" className="t14-sl-pop" role="group" aria-label="Filters">
                <fieldset className="t14-sl-fs">
                  <legend>Price (₦)</legend>
                  <div className="t14-sl-price">
                    <label>
                      <span className="t14-sr">Minimum price in naira</span>
                      <input inputMode="numeric" placeholder="Min" value={minRaw} onChange={(e) => setMinRaw(e.target.value)} />
                    </label>
                    <span aria-hidden="true">–</span>
                    <label>
                      <span className="t14-sr">Maximum price in naira</span>
                      <input inputMode="numeric" placeholder="Max" value={maxRaw} onChange={(e) => setMaxRaw(e.target.value)} />
                    </label>
                  </div>
                </fieldset>
                <fieldset className="t14-sl-fs">
                  <legend>Availability</legend>
                  <label className="t14-sl-switch">
                    <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                    <span>In stock only</span>
                    <i aria-hidden="true" />
                  </label>
                  <label className="t14-sl-switch">
                    <input type="checkbox" checked={onSaleOnly} onChange={(e) => setOnSaleOnly(e.target.checked)} />
                    <span>On sale</span>
                    <i aria-hidden="true" />
                  </label>
                </fieldset>
                <div className="t14-sl-popfoot">
                  <button type="button" className="t14-sl-clear" onClick={clear} disabled={!active}>
                    Clear all
                  </button>
                  <button type="button" className="t14-pill t14-pill-black" onClick={() => setFiltersOpen(false)}>
                    Show {countText}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {active ? (
          <ul className="t14-sl-chips" aria-label="Active filters">
            {query.trim() ? <Chip label={`Search: ${query.trim()}`} onRemove={() => setQuery("")} /> : null}
            {!category && catId ? <Chip label={cats.find((c) => c.id === catId)?.name ?? "Category"} onRemove={() => setCatId(null)} /> : null}
            {priceActive ? (
              <Chip
                label={priceLabel}
                onRemove={() => {
                  setMinRaw("");
                  setMaxRaw("");
                }}
              />
            ) : null}
            {inStockOnly ? <Chip label="In stock" onRemove={() => setInStockOnly(false)} /> : null}
            {onSaleOnly ? <Chip label="On sale" onRemove={() => setOnSaleOnly(false)} /> : null}
            <li>
              <button type="button" className="t14-sl-clear" onClick={clear}>
                Clear all
              </button>
            </li>
          </ul>
        ) : null}

        {products.length > 0 ? (
          <ul className="t14-sl-grid">
            {products.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} priority={i < 4} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="t14-sl-empty">
            <p className="t14-sl-empty-title">
              {active ? "No products match" : category ? "Nothing in this category yet" : "The shop is being stocked"}
            </p>
            <p>{active ? "Try a different search or clear the filters." : category ? "Have a look at everything else." : "Check back soon."}</p>
            {active ? (
              <button type="button" className="t14-pill t14-pill-black" onClick={clear}>
                Clear filters
              </button>
            ) : category ? (
              <Link className="t14-pill t14-pill-black" href={shopHref(baseUrl)}>
                View all products
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

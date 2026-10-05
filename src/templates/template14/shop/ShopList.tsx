"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { shopHref, useT14 } from "../ctx";
import { IconClose, IconFilter } from "../icons";
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
      <button type="button" onClick={onRemove}>
        {label} <IconClose size={14} />
        <span className="t14-sr"> (remove filter)</span>
      </button>
    </li>
  );
}

/**
 * All products, or one category. A filter rail (category, price range, in stock, on sale), search
 * (the header box) and sorting all run in the browser over the loaded catalogue.
 */
export default function ShopList({ categorySlug }: { categorySlug?: string }) {
  const { shop, baseUrl, profile, query, setQuery } = useT14();
  const [sort, setSort] = useState<SortId>("featured");
  const [catId, setCatId] = useState<string | null>(null);
  const [minRaw, setMinRaw] = useState("");
  const [maxRaw, setMaxRaw] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
  const title = category ? category.name : "All products";

  const priceActive = !!minRaw.trim() || !!maxRaw.trim();
  const active = !!query.trim() || (!category && !!catId) || priceActive || inStockOnly || onSaleOnly;
  const clear = () => {
    setQuery("");
    setCatId(null);
    setMinRaw("");
    setMaxRaw("");
    setInStockOnly(false);
    setOnSaleOnly(false);
  };
  const countText = `${products.length} ${products.length === 1 ? "product" : "products"}`;
  const priceLabel = `Price ${minRaw.trim() ? `from ₦${minRaw.trim()}` : ""} ${maxRaw.trim() ? `to ₦${maxRaw.trim()}` : ""}`.replace(/\s+/g, " ").trim();

  return (
    <section className="t14-section t14-shop-page">
      <div className="t14-container">
        <header className="t14-shop-head">
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
          <h1 className="t14-h1">{title}</h1>
          {!category && profile.tagline ? <p className="t14-lead">{profile.tagline}</p> : null}
        </header>

        {!category && !active && deals.length > 0 ? <DealsStrip products={deals} id="t14-list-deals" showAll={false} /> : null}

        <div className="t14-listing">
          <aside className="t14-filters" aria-label="Filters" data-open={filtersOpen}>
            <div className="t14-filters-head">
              <h2 className="t14-filters-title">Filters</h2>
              {active ? (
                <button type="button" className="t14-link-btn" onClick={clear}>
                  Clear all
                </button>
              ) : null}
            </div>

            {!category && cats.length > 0 ? (
              <fieldset className="t14-filter">
                <legend>Category</legend>
                <label className="t14-check">
                  <input type="radio" name="t14-cat" checked={catId === null} onChange={() => setCatId(null)} />
                  <span>All categories</span>
                </label>
                {cats.map((c) => (
                  <label key={c.id} className="t14-check">
                    <input type="radio" name="t14-cat" checked={catId === c.id} onChange={() => setCatId(c.id)} />
                    <span>{c.name}</span>
                  </label>
                ))}
              </fieldset>
            ) : null}

            <fieldset className="t14-filter">
              <legend>Price (₦)</legend>
              <div className="t14-price-inputs">
                <label>
                  <span className="t14-sr">Minimum price in naira</span>
                  <input className="t14-input" inputMode="numeric" placeholder="Min" value={minRaw} onChange={(e) => setMinRaw(e.target.value)} />
                </label>
                <span aria-hidden="true">–</span>
                <label>
                  <span className="t14-sr">Maximum price in naira</span>
                  <input
                    className="t14-input"
                    inputMode="numeric"
                    placeholder="Max"
                    value={maxRaw}
                    onChange={(e) => setMaxRaw(e.target.value)}
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="t14-filter">
              <legend>Availability</legend>
              <label className="t14-check">
                <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                <span>In stock only</span>
              </label>
              <label className="t14-check">
                <input type="checkbox" checked={onSaleOnly} onChange={(e) => setOnSaleOnly(e.target.checked)} />
                <span>On sale</span>
              </label>
            </fieldset>
          </aside>

          <div className="t14-results">
            <div className="t14-toolbar">
              <button
                type="button"
                className="t14-btn t14-btn-ghost t14-btn-sm t14-filters-toggle"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((o) => !o)}
              >
                <IconFilter size={16} /> Filters
              </button>
              <p className="t14-count" role="status" aria-live="polite">
                {countText}
                {query.trim() ? <> for &ldquo;{query.trim()}&rdquo;</> : null}
              </p>
              <label className="t14-sort">
                <span>Sort by</span>
                <select className="t14-input" value={sort} onChange={(e) => setSort(e.target.value as SortId)}>
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {active ? (
              <ul className="t14-chips" aria-label="Active filters">
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
              </ul>
            ) : null}

            {products.length > 0 ? (
              <ul className="t14-grid">
                {products.map((p, i) => (
                  <li key={p.id}>
                    <ProductCard product={p} priority={i < 4} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="t14-empty">
                <p className="t14-empty-title">
                  {active ? "No products match" : category ? "Nothing in this category yet" : "The shop is being stocked"}
                </p>
                <p className="t14-muted">
                  {active ? "Try a different search or clear the filters." : category ? "Have a look at everything else." : "Check back soon."}
                </p>
                {active ? (
                  <button type="button" className="t14-btn" onClick={clear}>
                    Clear filters
                  </button>
                ) : category ? (
                  <Link className="t14-btn" href={shopHref(baseUrl)}>
                    View all products
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

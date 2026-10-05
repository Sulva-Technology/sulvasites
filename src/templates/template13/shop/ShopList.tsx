"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import RollText from "../components/RollText";
import { shopHref, useT13 } from "../ctx";
import { matchesQuery } from "../lib";
import { categoryName, SORTS, sortProducts, type SortId } from "./helpers";
import ProductCard from "./ProductCard";

/** All products, or one category: crumbs, big serif title, category pills, a sort control and the grid. */
export default function ShopList({ categorySlug }: { categorySlug?: string }) {
  const { shop, baseUrl } = useT13();
  const [sort, setSort] = useState<SortId>("featured");
  const router = useRouter();
  // The list follows the URL, so the composer, back/forward and Clear all stay in sync.
  const q = useSearchParams()?.get("q") ?? "";

  const clearQuery = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    router.replace(url.pathname + url.search + url.hash, { scroll: false });
  };

  const category = shop?.categories.find((c) => c.slug === categorySlug) ?? null;
  const products = useMemo(() => {
    if (!shop) return [];
    const base = category ? shop.products.filter((p) => p.categoryId === category.id) : shop.products;
    const found = q.trim() ? base.filter((p) => matchesQuery(p, categoryName(shop, p), q)) : base;
    return sortProducts(found, sort);
  }, [shop, category, sort, q]);

  if (!shop) return null;
  const cats = [...shop.categories].sort((a, b) => a.position - b.position);
  const title = category ? category.name : "The collection";

  return (
    <section className="t13-section t13-sl">
      <div className="t13-container">
        <header className="t13-sl-head">
          <nav className="t13-crumbs" aria-label="Breadcrumb">
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
          <div className="t13-sl-titlerow">
            <h1 className="t13-sl-title">{title}</h1>
            <p className="t13-sl-count t13-mono" role="status" aria-live="polite">
              {products.length} {products.length === 1 ? "piece" : "pieces"}
            </p>
          </div>
        </header>

        <div className="t13-sl-bar">
          {cats.length > 0 ? (
            <nav className="t13-sl-tabs" aria-label="Categories">
              <Link
                className={`t13-pill t13-pill-glass${!category ? " t13-pill-solid" : ""}`}
                href={shopHref(baseUrl)}
                aria-current={!category ? "page" : undefined}
              >
                <RollText text="All" />
              </Link>
              {cats.map((c) => (
                <Link
                  key={c.id}
                  className={`t13-pill t13-pill-glass${category?.id === c.id ? " t13-pill-solid" : ""}`}
                  href={`${baseUrl}/shop/c/${c.slug}`}
                  aria-current={category?.id === c.id ? "page" : undefined}
                >
                  <RollText text={c.name} />
                </Link>
              ))}
            </nav>
          ) : (
            <span />
          )}
          <label className="t13-pill t13-pill-glass t13-sl-sort">
            <span className="t13-mono">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortId)} aria-label="Sort by">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {q.trim() ? (
          <div className="t13-qbanner">
            <p>Results for “{q.trim()}”</p>
            <button type="button" className="t13-pill t13-pill-glass" onClick={clearQuery}>
              Clear
            </button>
          </div>
        ) : null}

        {products.length > 0 ? (
          <ul className="t13-pgrid">
            {products.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} priority={i < 3} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="t13-empty">
            <p className="t13-empty-title">
              {q.trim() ? `Nothing matches “${q.trim()}”. Try another word.` : category ? "Nothing in this category yet" : "The shop is being stocked"}
            </p>
            {q.trim() ? null : (
              <p className="t13-muted">{category ? "Have a look at everything else." : "Check back soon for new pieces."}</p>
            )}
            {category && !q.trim() ? (
              <Link className="t13-pill t13-pill-solid" href={shopHref(baseUrl)}>
                View all products
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

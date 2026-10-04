"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { shopHref, useT13 } from "../ctx";
import { SORTS, sortProducts, type SortId } from "./helpers";
import ProductCard from "./ProductCard";

/** All products, or one category: category links, a sort control and the product grid. */
export default function ShopList({ categorySlug }: { categorySlug?: string }) {
  const { shop, baseUrl, profile } = useT13();
  const [sort, setSort] = useState<SortId>("featured");

  const category = shop?.categories.find((c) => c.slug === categorySlug) ?? null;
  const products = useMemo(() => {
    if (!shop) return [];
    const base = category ? shop.products.filter((p) => p.categoryId === category.id) : shop.products;
    return sortProducts(base, sort);
  }, [shop, category, sort]);

  if (!shop) return null;
  const cats = [...shop.categories].sort((a, b) => a.position - b.position);
  const title = category ? category.name : "Shop";

  return (
    <section className="t13-section t13-shop-page">
      <div className="t13-container">
        <header className="t13-shop-head">
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
          <h1 className="t13-h1">{title}</h1>
          {!category && profile.tagline ? <p className="t13-lead">{profile.tagline}</p> : null}
        </header>

        <div className="t13-toolbar">
          {cats.length > 0 ? (
            <nav className="t13-cats" aria-label="Categories">
              <Link href={shopHref(baseUrl)} aria-current={!category ? "page" : undefined}>
                All
              </Link>
              {cats.map((c) => (
                <Link key={c.id} href={`${baseUrl}/shop/c/${c.slug}`} aria-current={category?.id === c.id ? "page" : undefined}>
                  {c.name}
                </Link>
              ))}
            </nav>
          ) : (
            <span />
          )}
          <div className="t13-sortbar">
            <p className="t13-count" role="status" aria-live="polite">
              {products.length} {products.length === 1 ? "product" : "products"}
            </p>
            <label className="t13-sort">
              <span>Sort by</span>
              <select className="t13-input" value={sort} onChange={(e) => setSort(e.target.value as SortId)}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {products.length > 0 ? (
          <ul className="t13-grid" data-cols="3">
            {products.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} priority={i < 3} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="t13-empty">
            <p className="t13-empty-title">{category ? "Nothing in this category yet" : "The shop is being stocked"}</p>
            <p className="t13-muted">{category ? "Have a look at everything else." : "Check back soon for new pieces."}</p>
            {category ? (
              <Link className="t13-btn" href={shopHref(baseUrl)}>
                View all products
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

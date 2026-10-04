"use client";

import Link from "next/link";

import { shopHref, useT13 } from "../ctx";
import { IconArrow } from "../icons";
import ProductCard from "../shop/ProductCard";

/**
 * "Shop the looks": a row of featured products (else the first few) under the home hero.
 * Only rendered when the storefront is live and has products; it is not a page section, so it
 * never appears in the editor.
 */
export default function T13Looks() {
  const { shop, baseUrl } = useT13();
  if (!shop || shop.products.length === 0) return null;
  const featured = shop.products.filter((p) => p.featured);
  const picks = (featured.length >= 3 ? featured : shop.products).slice(0, 4);

  return (
    <section className="t13-section t13-looks" aria-labelledby="t13-looks-h">
      <div className="t13-container">
        <header className="t13-head t13-head-split t13-reveal">
          <div>
            <p className="t13-label">New in</p>
            <h2 id="t13-looks-h" className="t13-h2">
              Shop the looks
            </h2>
          </div>
          <Link className="t13-textlink" href={shopHref(baseUrl)}>
            View all <IconArrow size={16} />
          </Link>
        </header>
        <ul className="t13-grid t13-reveal" data-cols="4">
          {picks.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

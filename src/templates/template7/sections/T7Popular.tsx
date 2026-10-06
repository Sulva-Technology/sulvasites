"use client";

import Link from "next/link";

import { shopHref, useT7 } from "../ctx";
import { IconArrow } from "../icons";
import ProductCard from "../shop/ProductCard";

/**
 * Home "order tonight" row under the hero: featured dishes as photo cards with one-tap add, in a
 * swipeable glass rail. Only rendered when online ordering is live and has dishes; it is not a page
 * section, so it never appears in the editor.
 */
export default function T7Popular() {
  const { shop, baseUrl } = useT7();
  if (!shop || shop.products.length === 0) return null;
  const featured = shop.products.filter((p) => p.featured);
  const picks = (featured.length >= 3 ? featured : shop.products).slice(0, 8);

  return (
    <section className="t7-section t7-popular" aria-labelledby="t7-popular-h">
      <div className="t7-container">
        <header className="t7-head t7-head-split t7-reveal">
          <div>
            <span className="t7-eyebrow">Order online</span>
            <h2 id="t7-popular-h" className="t7-h2">
              Tonight&apos;s favourites
            </h2>
          </div>
          <Link className="t7-textlink" href={shopHref(baseUrl)}>
            See the full menu <IconArrow size={16} />
          </Link>
        </header>
        <ul className="t7-rail">
          {picks.map((p, i) => (
            <li key={p.id} className="t7-reveal">
              <ProductCard product={p} priority={i < 2} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";

import { shopHref, useT14 } from "../ctx";
import { IconArrow, IconGrid } from "../icons";
import DealsStrip from "../shop/DealsStrip";
import { dealProducts } from "../shop/helpers";
import ProductCard from "../shop/ProductCard";

/**
 * Home storefront rows under the hero: category shortcuts, the deals strip (products with a
 * compare-at price) and popular products. Only rendered when the shop is live and has products;
 * it is not a page section, so it never appears in the editor.
 */
export default function T14Storefront() {
  const { shop, baseUrl } = useT14();
  if (!shop || shop.products.length === 0) return null;
  const cats = [...shop.categories].sort((a, b) => a.position - b.position);
  const deals = dealProducts(shop).slice(0, 10);
  const featured = shop.products.filter((p) => p.featured);
  const picks = (featured.length >= 4 ? featured : shop.products).slice(0, 8);

  return (
    <div className="t14-storefront">
      <div className="t14-container">
        {cats.length > 0 ? (
          <nav className="t14-catrow t14-reveal" aria-label="Shop by category">
            {cats.map((c) => (
              <Link key={c.id} href={`${baseUrl}/shop/c/${c.slug}`}>
                <IconGrid size={18} /> {c.name}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="t14-reveal">
          <DealsStrip products={deals} id="t14-home-deals" />
        </div>

        <section className="t14-popular t14-reveal" aria-labelledby="t14-popular-h">
          <header className="t14-deals-head">
            <h2 id="t14-popular-h" className="t14-h3">
              Popular right now
            </h2>
            <Link className="t14-textlink" href={shopHref(baseUrl)}>
              View all <IconArrow size={16} />
            </Link>
          </header>
          <ul className="t14-grid">
            {picks.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

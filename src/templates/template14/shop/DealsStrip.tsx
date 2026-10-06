"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import type { ShopProduct } from "@/lib/shop/types";
import { shopHref, useT14 } from "../ctx";
import { IconArrow } from "../icons";
import { savingKobo } from "../lib";
import { productHref } from "./helpers";
import { PriceText } from "./ProductCard";

/** Horizontally scrolling rail of discounted products (compare-at above the price). */
export default function DealsStrip({ products, id, showAll = true }: { products: ShopProduct[]; id: string; showAll?: boolean }) {
  const { baseUrl } = useT14();
  if (products.length === 0) return null;
  return (
    <section className="t14-dl" aria-labelledby={id}>
      <header className="t14-dl-head">
        <h2 id={id} className="t14-h3">
          On sale now
        </h2>
        {showAll ? (
          <Link className="t14-pill t14-pill-soft" href={`${shopHref(baseUrl)}?sale=1`}>
            See all deals <IconArrow size={16} />
          </Link>
        ) : null}
      </header>
      <ul className="t14-dl-row" aria-label="Deals">
        {products.map((p) => {
          const img = p.images[0];
          const saving = savingKobo(p.priceKobo, p.compareAtKobo);
          return (
            <li key={p.id} className="t14-dl-card">
              <Link href={productHref(baseUrl, p)} className="t14-dl-link">
                <span className="t14-dl-img">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt={img.alt || ""} loading="lazy" />
                  ) : null}
                  {saving > 0 ? <span className="t14-pc-chip">Save {formatNaira(saving)}</span> : null}
                </span>
                <span className="t14-dl-name">{p.name}</span>
                <PriceText product={p} className="t14-dl-price" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

"use client";

import Link from "next/link";

import type { ShopProduct } from "@/lib/shop/types";
import { shopHref, useT14 } from "../ctx";
import { IconArrow, IconTag } from "../icons";
import ProductCard from "./ProductCard";

/** Horizontally scrolling strip of discounted products (compare-at above the price). */
export default function DealsStrip({ products, id, showAll = true }: { products: ShopProduct[]; id: string; showAll?: boolean }) {
  const { baseUrl } = useT14();
  if (products.length === 0) return null;
  return (
    <section className="t14-deals" aria-labelledby={id}>
      <header className="t14-deals-head">
        <h2 id={id} className="t14-h3">
          <IconTag size={22} /> Deals
        </h2>
        {showAll ? (
          <Link className="t14-textlink" href={`${shopHref(baseUrl)}?sale=1`}>
            See all deals <IconArrow size={16} />
          </Link>
        ) : null}
      </header>
      <ul className="t14-deals-row">
        {products.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

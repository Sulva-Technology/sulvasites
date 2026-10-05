"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import type { ShopProduct } from "@/lib/shop/types";
import { useT13 } from "../ctx";
import { IconChevron } from "../icons";
import { initials, pickMarquee } from "../lib";
import { categoryName, isOnSale, isSizeOption, optionGroups, priceRange, productHref } from "../shop/helpers";

/**
 * Endless row of mono "ticker" cards, one per product (Offloop's agent marquee).
 * Pass `products` to show a subset (e.g. "you may also like"); default is the whole catalogue.
 */
export default function T13Marquee({ products, label = "Featured pieces" }: { products?: ShopProduct[]; label?: string } = {}) {
  const { shop, baseUrl } = useT13();
  const source = products ?? shop?.products ?? [];
  if (!shop || source.length === 0) return null;
  const items = pickMarquee(source, 10);

  const row = (copy: 0 | 1) =>
    items.map((p, i) => {
      const cat = categoryName(shop, p);
      const size = optionGroups(p).find((g) => isSizeOption(g.name));
      const sale = isOnSale(p);
      return (
        <Link
          key={`${copy}-${p.id}-${i}`}
          className="t13-tick"
          href={productHref(baseUrl, p)}
          tabIndex={copy === 1 ? -1 : undefined}
        >
          <span className="t13-tick-win">
            <span className="t13-tick-title">
              <span className="t13-tick-chev" aria-hidden="true">
                <IconChevron size={12} />
              </span>
              {p.name}{" "}
              <em className="t13-mono t13-dim">
                {(i % source.length) + 1}/{source.length}
              </em>
            </span>
            <code>SKU  {p.variants[0]?.sku ?? p.slug.toUpperCase().slice(0, 10)}</code>
            {size ? <code>Sizes  {size.values.join(" ")}</code> : null}
            <code className="t13-tick-price">
              {formatNaira(priceRange(p).min)}
              {sale ? <s>{formatNaira(p.compareAtKobo ?? 0)}</s> : null}
            </code>
          </span>
          <span className="t13-tick-foot">
            <span className="t13-avatar" aria-hidden="true">
              {initials(cat || p.name)}
            </span>
            {cat ?? "Mode"} <i>View piece</i>
          </span>
        </Link>
      );
    });

  return (
    <section className="t13-marquee" aria-label={label}>
      <div className="t13-marquee-track">
        {row(0)}
        <div style={{ display: "contents" }} aria-hidden="true">
          {row(1)}
        </div>
      </div>
    </section>
  );
}

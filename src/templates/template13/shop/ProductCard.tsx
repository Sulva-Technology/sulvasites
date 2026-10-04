"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import type { ShopProduct } from "@/lib/shop/types";
import { useT13 } from "../ctx";
import { discountPercent, isOnSale, priceRange, productHref, productSoldOut } from "./helpers";

export function PriceText({ product, className }: { product: ShopProduct; className?: string }) {
  const { min, max } = priceRange(product);
  const sale = isOnSale(product);
  return (
    <span className={`t13-price ${className ?? ""}`} data-sale={sale}>
      {min !== max ? <span className="t13-price-from">From </span> : null}
      <span className="t13-price-now">{formatNaira(min)}</span>
      {sale && min === max ? (
        <>
          <s className="t13-price-was">
            <span className="t13-sr">Was </span>
            {formatNaira(product.compareAtKobo ?? 0)}
          </s>
        </>
      ) : null}
    </span>
  );
}

/** Product tile: portrait photo (the second photo fades in on hover/focus), name and price. */
export default function ProductCard({ product, priority = false }: { product: ShopProduct; priority?: boolean }) {
  const { baseUrl } = useT13();
  const first = product.images[0];
  const second = product.images[1];
  const sold = productSoldOut(product);
  const pct = discountPercent(product);

  return (
    <article className="t13-card">
      <Link href={productHref(baseUrl, product)} className="t13-card-link">
        <span className="t13-card-media" data-has-second={!!second}>
          {first ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="t13-card-img" src={first.url} alt={first.alt || ""} loading={priority ? "eager" : "lazy"} />
          ) : (
            <span className="t13-card-noimg" aria-hidden="true">
              {product.name.slice(0, 1)}
            </span>
          )}
          {second ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="t13-card-img t13-card-img2" src={second.url} alt="" loading="lazy" />
          ) : null}
          {sold ? (
            <span className="t13-badge t13-badge-dark">Sold out</span>
          ) : pct > 0 ? (
            <span className="t13-badge">-{pct}%</span>
          ) : null}
        </span>
        <span className="t13-card-name">{product.name}</span>
        <PriceText product={product} />
      </Link>
    </article>
  );
}

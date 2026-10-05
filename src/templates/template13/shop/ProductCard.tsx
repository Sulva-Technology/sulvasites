"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import type { ShopProduct } from "@/lib/shop/types";
import { useT13 } from "../ctx";
import { IconPlus } from "../icons";
import { discountPercent, isOnSale, priceRange, productHref, productSoldOut } from "./helpers";
import { useQuickAdd } from "./useQuickAdd";

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

/** Product tile: portrait photo (the second photo crossfades in on hover/focus), badge, quick add, name and price. */
export default function ProductCard({ product, priority = false }: { product: ShopProduct; priority?: boolean }) {
  const { baseUrl } = useT13();
  const quick = useQuickAdd()(product);
  const first = product.images[0];
  const second = product.images[1];
  const sold = productSoldOut(product);
  const pct = discountPercent(product);
  const href = productHref(baseUrl, product);

  return (
    <article className="t13-pc">
      <div className="t13-pc-frame">
        <Link href={href} className="t13-pc-media" data-has-second={!!second} tabIndex={-1} aria-hidden="true">
          {first ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="t13-pc-img" src={first.url} alt="" loading={priority ? "eager" : "lazy"} />
          ) : (
            <span className="t13-pc-noimg">{product.name.slice(0, 1)}</span>
          )}
          {second ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="t13-pc-img t13-pc-img2" src={second.url} alt="" loading="lazy" />
          ) : null}
        </Link>
        {sold ? (
          <span className="t13-pc-badge t13-mono">Sold out</span>
        ) : pct > 0 ? (
          <span className="t13-pc-badge t13-mono">−{pct}%</span>
        ) : null}
        {quick.target === "out" ? null : quick.target === "choose" ? (
          <Link className="t13-pc-add" href={quick.href} aria-label={`Choose options for ${product.name}`}>
            <IconPlus size={16} />
          </Link>
        ) : (
          <button type="button" className="t13-pc-add" onClick={quick.add} aria-label={`Add ${product.name} to bag`}>
            <IconPlus size={16} />
          </button>
        )}
      </div>
      <Link href={href} className="t13-pc-info">
        <span className="t13-pc-name">{product.name}</span>
        <PriceText product={product} />
      </Link>
    </article>
  );
}

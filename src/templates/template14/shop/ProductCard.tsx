"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import type { ShopProduct } from "@/lib/shop/types";
import { useT14 } from "../ctx";
import { IconCheck, IconPlus } from "../icons";
import { savingKobo } from "../lib";
import { isOnSale, priceRange, productHref, productSoldOut, quickAddTarget } from "./helpers";

export function PriceText({ product, className }: { product: ShopProduct; className?: string }) {
  const { min, max } = priceRange(product);
  const sale = isOnSale(product);
  return (
    <span className={`t14-price ${className ?? ""}`} data-sale={sale}>
      {min !== max ? <span className="t14-price-from">From </span> : null}
      <span className="t14-price-now">{formatNaira(min)}</span>
      {sale && min === max ? (
        <s className="t14-price-was">
          <span className="t14-sr">Was </span>
          {formatNaira(product.compareAtKobo ?? 0)}
        </s>
      ) : null}
    </span>
  );
}

/** Product tile: paper photo (second photo fades in on hover), name, price and a round quick-add. */
export default function ProductCard({ product, priority = false }: { product: ShopProduct; priority?: boolean }) {
  const { baseUrl, cart, announce } = useT14();
  const first = product.images[0];
  const second = product.images[1];
  const sold = productSoldOut(product);
  const saving = savingKobo(product.priceKobo, product.compareAtKobo);
  const target = quickAddTarget(product);
  const href = productHref(baseUrl, product);

  const inCart =
    typeof target === "object"
      ? cart.lines
          .filter((l) => l.productId === product.id && l.variantId === target.variantId)
          .reduce((n, l) => n + l.quantity, 0)
      : 0;
  const variant = typeof target === "object" && target.variantId ? product.variants.find((v) => v.id === target.variantId) : null;
  const atMax = !!variant && variant.stock !== null && inCart >= variant.stock;

  const quickAdd = () => {
    if (typeof target !== "object" || atMax) return;
    cart.add({ productId: product.id, variantId: target.variantId, quantity: 1 });
    announce(`${product.name} added to your bag`);
  };

  return (
    <article className="t14-pc" data-sold={sold}>
      <Link href={href} className="t14-pc-link">
        <span className="t14-pc-media">
          {first ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="t14-pc-img" src={first.url} alt={first.alt || ""} loading={priority ? "eager" : "lazy"} />
          ) : (
            <span className="t14-pc-noimg" aria-hidden="true">
              {product.name.slice(0, 1)}
            </span>
          )}
          {second ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="t14-pc-img t14-pc-img2" src={second.url} alt="" loading="lazy" />
          ) : null}
          {sold || target === "out" ? (
            <span className="t14-pc-chip t14-pc-chip-dark">Sold out</span>
          ) : saving > 0 ? (
            <span className="t14-pc-chip">Save {formatNaira(saving)}</span>
          ) : null}
        </span>
        <span className="t14-pc-text">
          <span className="t14-pc-name">{product.name}</span>
          <PriceText product={product} className="t14-pc-price" />
        </span>
      </Link>
      {sold || target === "out" ? null : target === "choose" ? (
        <Link className="t14-pc-add" href={href} aria-label={`Choose options: ${product.name}`}>
          <IconPlus size={18} />
        </Link>
      ) : (
        <button
          type="button"
          className="t14-pc-add"
          onClick={quickAdd}
          aria-disabled={atMax}
          aria-label={`${atMax ? "All available stock is in your bag:" : "Add to bag:"} ${product.name}`}
        >
          {atMax ? <IconCheck size={17} /> : <IconPlus size={18} />}
        </button>
      )}
    </article>
  );
}

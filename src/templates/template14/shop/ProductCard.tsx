"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import type { ShopProduct } from "@/lib/shop/types";
import { useT14 } from "../ctx";
import { IconBag, IconPlus } from "../icons";
import { categoryName, discountPercent, isOnSale, priceRange, productHref, productSoldOut, quickAddTarget } from "./helpers";

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

/** Dense product tile: square photo, name, price and a one-tap "Add to cart" (or "Choose options"). */
export default function ProductCard({ product, priority = false }: { product: ShopProduct; priority?: boolean }) {
  const { baseUrl, shop, cart, announce } = useT14();
  const first = product.images[0];
  const sold = productSoldOut(product);
  const pct = discountPercent(product);
  const cat = shop ? categoryName(shop, product) : null;
  const target = quickAddTarget(product);

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
    announce(`${product.name} added to your cart`);
  };

  return (
    <article className="t14-card" data-sold={sold}>
      <Link href={productHref(baseUrl, product)} className="t14-card-link">
        <span className="t14-card-media">
          {first ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="t14-card-img" src={first.url} alt={first.alt || ""} loading={priority ? "eager" : "lazy"} />
          ) : (
            <span className="t14-card-noimg" aria-hidden="true">
              {product.name.slice(0, 1)}
            </span>
          )}
          {sold ? (
            <span className="t14-badge t14-badge-dark">Sold out</span>
          ) : pct > 0 ? (
            <span className="t14-badge">
              -{pct}%<span className="t14-sr"> off</span>
            </span>
          ) : null}
        </span>
        {cat ? <span className="t14-card-cat">{cat}</span> : null}
        <span className="t14-card-name">{product.name}</span>
        <PriceText product={product} />
      </Link>
      {sold || target === "out" ? (
        <p className="t14-card-note" data-state="out">
          Sold out
        </p>
      ) : target === "choose" ? (
        <Link className="t14-btn t14-btn-sm t14-btn-ghost t14-card-add" href={productHref(baseUrl, product)}>
          Choose options
        </Link>
      ) : (
        <button
          type="button"
          className="t14-btn t14-btn-sm t14-card-add"
          onClick={quickAdd}
          aria-disabled={atMax}
          aria-label={`${atMax ? "All available stock is in your cart:" : "Add to cart:"} ${product.name}`}
        >
          {atMax ? (
            <>
              <IconBag size={16} /> In cart
            </>
          ) : (
            <>
              <IconPlus size={16} /> Add to cart
            </>
          )}
        </button>
      )}
    </article>
  );
}

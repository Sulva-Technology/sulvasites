"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import type { ShopProduct } from "@/lib/shop/types";
import { useT7 } from "../ctx";
import { IconCheck, IconPlus } from "../icons";
import { isOnSale, priceRange, productHref, productSoldOut, quickAddTarget } from "./helpers";

export function PriceText({ product, className }: { product: ShopProduct; className?: string }) {
  const { min, max } = priceRange(product);
  const sale = isOnSale(product);
  return (
    <span className={`t7-price ${className ?? ""}`} data-sale={sale}>
      {min !== max ? <span className="t7-price-from">From </span> : null}
      <span className="t7-price-now">{formatNaira(min)}</span>
      {sale && min === max ? (
        <s className="t7-price-was">
          <span className="t7-sr">Was </span>
          {formatNaira(product.compareAtKobo ?? 0)}
        </s>
      ) : null}
    </span>
  );
}

/** Dish card: photo with a glass price tag, name, short description and a round one-tap "Add". */
export default function ProductCard({ product, priority = false }: { product: ShopProduct; priority?: boolean }) {
  const { baseUrl, cart, announce, openCart } = useT7();
  const first = product.images[0];
  const sold = productSoldOut(product);
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
    if (typeof target !== "object") return;
    if (atMax) {
      openCart();
      return;
    }
    cart.add({ productId: product.id, variantId: target.variantId, quantity: 1 });
    announce(`${product.name} added to your order`);
  };

  return (
    <article className="t7-dishcard" data-sold={sold || target === "out"}>
      <Link href={href} className="t7-dishcard-media" tabIndex={-1} aria-hidden="true">
        {first ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={first.url} alt="" loading={priority ? "eager" : "lazy"} />
        ) : (
          <span className="t7-dishcard-noimg">{product.name.slice(0, 1)}</span>
        )}
        <PriceText product={product} className="t7-dishcard-price" />
        {sold || target === "out" ? <span className="t7-dishcard-flag">Sold out</span> : null}
      </Link>
      <div className="t7-dishcard-body">
        <h3 className="t7-dishcard-name">
          <Link href={href}>{product.name}</Link>
        </h3>
        {product.description ? <p className="t7-dishcard-desc">{product.description.split(/\n/)[0]}</p> : null}
      </div>
      {sold || target === "out" ? null : target === "choose" ? (
        <Link className="t7-add" href={href} aria-label={`Choose options for ${product.name}`}>
          <IconPlus size={18} />
        </Link>
      ) : (
        <button
          type="button"
          className="t7-add"
          data-in={inCart > 0}
          onClick={quickAdd}
          aria-label={atMax ? `All available ${product.name} is in your order` : `Add ${product.name} to your order`}
        >
          {inCart > 0 ? (
            <>
              <IconCheck size={16} />
              <span className="t7-add-n">{inCart}</span>
            </>
          ) : (
            <IconPlus size={18} />
          )}
        </button>
      )}
    </article>
  );
}

"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import { shopHref, useT14 } from "../ctx";
import { IconBag } from "../icons";
import { useBag } from "./useBag";

/**
 * Phone-only bar pinned to the bottom of the screen while the cart has items: item count,
 * subtotal and a checkout shortcut. Hidden on the cart, checkout and order pages, where the page
 * already has those actions.
 */
export default function StickyCartBar() {
  const { baseUrl, openCart, shopViewKind } = useT14();
  const { subtotal, count, ready } = useBag();
  if (!ready || count === 0) return null;
  if (shopViewKind === "cart" || shopViewKind === "checkout" || shopViewKind === "order") return null;

  return (
    <div className="t14-cartbar" role="region" aria-label="Cart summary">
      <button type="button" className="t14-cartbar-open" onClick={openCart} aria-haspopup="dialog">
        <span className="t14-cartbar-ico">
          <IconBag size={22} />
          <span className="t14-cartbar-count" aria-hidden="true">
            {count > 99 ? "99+" : count}
          </span>
        </span>
        <span className="t14-cartbar-text">
          <b>{formatNaira(subtotal)}</b>
          <small>
            {count} {count === 1 ? "item" : "items"} in cart
          </small>
        </span>
      </button>
      <Link className="t14-btn" href={`${shopHref(baseUrl)}/checkout`}>
        Checkout
      </Link>
    </div>
  );
}

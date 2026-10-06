"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import { shopHref, useT7 } from "../ctx";
import { IconBag } from "../icons";
import { useBag } from "./useBag";

/**
 * Phone-only bar pinned to the bottom of the screen while the cart has items: item count,
 * subtotal and a checkout shortcut. Hidden on the cart, checkout and order pages, where the page
 * already has those actions.
 */
export default function StickyCartBar() {
  const { baseUrl, openCart, shopViewKind } = useT7();
  const { subtotal, count, ready } = useBag();
  if (!ready || count === 0) return null;
  if (shopViewKind === "cart" || shopViewKind === "checkout" || shopViewKind === "order") return null;

  return (
    <div className="t7-cartbar" role="region" aria-label="Order summary">
      <button type="button" className="t7-cartbar-open" onClick={openCart} aria-haspopup="dialog">
        <span className="t7-cartbar-ico">
          <IconBag size={22} />
          <span className="t7-cartbar-count" aria-hidden="true">
            {count > 99 ? "99+" : count}
          </span>
        </span>
        <span className="t7-cartbar-text">
          <b>{formatNaira(subtotal)}</b>
          <small>
            {count} {count === 1 ? "item" : "items"} in your order
          </small>
        </span>
      </button>
      <Link className="t7-btn" href={`${shopHref(baseUrl)}/checkout`}>
        Checkout
      </Link>
    </div>
  );
}

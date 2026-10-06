"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import { shopHref, useT7 } from "../ctx";
import { IconArrow, IconBag, IconClose } from "../icons";
import CartLines from "./CartLines";
import { useFocusTrap } from "./useFocusTrap";
import { useBag } from "./useBag";

/** Slide-out cart. Mounted only while open: focus moves in and is trapped, Escape and the scrim close it. */
export default function CartDrawer() {
  const { baseUrl, closeCart } = useT7();
  const { rows, subtotal, count, ready } = useBag();
  const ref = useFocusTrap<HTMLElement>(closeCart, "[data-autofocus]");

  return (
    <div className="t7-cart-root">
      <div className="t7-scrim" onClick={closeCart} aria-hidden="true" />
      <aside ref={ref} className="t7-cart" role="dialog" aria-modal="true" aria-labelledby="t7-bag-title" tabIndex={-1}>
        <header className="t7-cart-head">
          <h2 id="t7-bag-title" className="t7-cart-title">
            Your order{ready && count > 0 ? <span className="t7-cart-count"> ({count})</span> : null}
          </h2>
          <button type="button" className="t7-icon-btn" aria-label="Close order" onClick={closeCart} data-autofocus>
            <IconClose />
          </button>
        </header>

        {ready && rows.length > 0 ? (
          <>
            <div className="t7-cart-body">
              <CartLines rows={rows} onNavigate={closeCart} />
            </div>
            <footer className="t7-cart-foot">
              <p className="t7-sum-row">
                <span>Subtotal</span>
                <b>{formatNaira(subtotal)}</b>
              </p>
              <p className="t7-fine">Delivery is added at checkout.</p>
              <Link className="t7-btn t7-btn-block t7-btn-lg" href={`${shopHref(baseUrl)}/checkout`} onClick={closeCart}>
                Checkout <IconArrow size={18} />
              </Link>
              <Link className="t7-btn t7-btn-ghost t7-btn-block" href={`${shopHref(baseUrl)}/cart`} onClick={closeCart}>
                View order
              </Link>
            </footer>
          </>
        ) : (
          <div className="t7-cart-empty">
            <span className="t7-empty-ico" aria-hidden="true">
              <IconBag size={34} />
            </span>
            <p className="t7-empty-title">{ready ? "Your order is empty" : "Loading your order"}</p>
            {ready ? (
              <Link className="t7-btn" href={shopHref(baseUrl)} onClick={closeCart}>
                Back to the menu
              </Link>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}

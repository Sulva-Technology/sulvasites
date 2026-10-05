"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import { shopHref, useT14 } from "../ctx";
import { IconArrow, IconBag, IconClose } from "../icons";
import CartLines from "./CartLines";
import { useFocusTrap } from "./useFocusTrap";
import { useBag } from "./useBag";

/** Slide-out cart. Mounted only while open: focus moves in and is trapped, Escape and the scrim close it. */
export default function CartDrawer() {
  const { baseUrl, closeCart } = useT14();
  const { rows, subtotal, count, ready } = useBag();
  const ref = useFocusTrap<HTMLElement>(closeCart, "[data-autofocus]");

  return (
    <div className="t14-drawer-root">
      <div className="t14-scrim" onClick={closeCart} aria-hidden="true" />
      <aside ref={ref} className="t14-drawer" role="dialog" aria-modal="true" aria-labelledby="t14-bag-title" tabIndex={-1}>
        <header className="t14-drawer-head">
          <h2 id="t14-bag-title" className="t14-drawer-title">
            Your cart{ready && count > 0 ? <span className="t14-drawer-count"> ({count})</span> : null}
          </h2>
          <button type="button" className="t14-icon-btn" aria-label="Close cart" onClick={closeCart} data-autofocus>
            <IconClose />
          </button>
        </header>

        {ready && rows.length > 0 ? (
          <>
            <div className="t14-drawer-body">
              <CartLines rows={rows} onNavigate={closeCart} />
            </div>
            <footer className="t14-drawer-foot">
              <p className="t14-sum-row">
                <span>Subtotal</span>
                <b>{formatNaira(subtotal)}</b>
              </p>
              <p className="t14-fine">Delivery is added at checkout.</p>
              <Link className="t14-btn t14-btn-block t14-btn-lg" href={`${shopHref(baseUrl)}/checkout`} onClick={closeCart}>
                Checkout <IconArrow size={18} />
              </Link>
              <Link className="t14-btn t14-btn-ghost t14-btn-block" href={`${shopHref(baseUrl)}/cart`} onClick={closeCart}>
                View cart
              </Link>
            </footer>
          </>
        ) : (
          <div className="t14-drawer-empty">
            <span className="t14-empty-ico" aria-hidden="true">
              <IconBag size={34} />
            </span>
            <p className="t14-empty-title">{ready ? "Your cart is empty" : "Loading your cart"}</p>
            {ready ? (
              <Link className="t14-btn" href={shopHref(baseUrl)} onClick={closeCart}>
                Continue shopping
              </Link>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}

"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import { shopHref, useT14 } from "../ctx";
import { IconArrow, IconBag, IconClose } from "../icons";
import CartLines from "./CartLines";
import { useFocusTrap } from "./useFocusTrap";
import { useBag } from "./useBag";
import WhatsAppOrderButton from "./WhatsAppOrderButton";

/** Floating bag sheet. Mounted only while open: focus moves in and is trapped, Escape and the scrim close it. */
export default function CartDrawer() {
  const { baseUrl, closeCart } = useT14();
  const { rows, subtotal, count, ready } = useBag();
  const ref = useFocusTrap<HTMLElement>(closeCart, "[data-autofocus]");

  return (
    <div className="t14-drawer-root">
      <div className="t14-bag-scrim" onClick={closeCart} aria-hidden="true" />
      <aside ref={ref} className="t14-bag" role="dialog" aria-modal="true" aria-labelledby="t14-bag-title" tabIndex={-1}>
        <header className="t14-bag-head">
          <h2 id="t14-bag-title" className="t14-bag-title">
            Your bag
          </h2>
          {ready && count > 0 ? (
            <span className="t14-chip t14-bag-count">
              {count}
              <span className="t14-sr"> {count === 1 ? "item" : "items"}</span>
            </span>
          ) : null}
          <button type="button" className="t14-bag-x" aria-label="Close bag" onClick={closeCart} data-autofocus>
            <IconClose size={18} />
          </button>
        </header>

        {ready && rows.length > 0 ? (
          <>
            <div className="t14-bag-body">
              <CartLines rows={rows} onNavigate={closeCart} />
            </div>
            <footer className="t14-bag-foot">
              <p className="t14-bsum-row">
                <span>Delivery</span>
                <span>Added at checkout</span>
              </p>
              <p className="t14-bsum-total">
                <span>Subtotal</span>
                <b>{formatNaira(subtotal)}</b>
              </p>
              <Link className="t14-pill t14-pill-black t14-pill-xl t14-pill-block" href={`${shopHref(baseUrl)}/checkout`} onClick={closeCart}>
                Checkout <IconArrow size={18} />
              </Link>
              <WhatsAppOrderButton rows={rows} onNavigate={closeCart} />
              <Link className="t14-pill t14-pill-soft t14-pill-block" href={`${shopHref(baseUrl)}/cart`} onClick={closeCart}>
                View bag
              </Link>
            </footer>
          </>
        ) : (
          <div className="t14-bag-empty">
            <span className="t14-bag-empty-ico" aria-hidden="true">
              <IconBag size={30} />
            </span>
            <p className="t14-bag-empty-t">{ready ? "Your bag is empty" : "Loading your bag"}</p>
            {ready ? (
              <Link className="t14-pill t14-pill-black" href={shopHref(baseUrl)} onClick={closeCart}>
                Continue shopping
              </Link>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}

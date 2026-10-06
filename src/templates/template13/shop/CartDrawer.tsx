"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import { shopHref, useT13 } from "../ctx";
import { IconArrow, IconBag, IconClose } from "../icons";
import CartLines from "./CartLines";
import { useFocusTrap } from "./useFocusTrap";
import { useBag } from "./useBag";
import WhatsAppOrderButton from "./WhatsAppOrderButton";

/** Slide-out bag. Mounted only while open: focus moves in and is trapped, Escape and the scrim close it. */
export default function CartDrawer() {
  const { baseUrl, closeCart } = useT13();
  const { rows, subtotal, count, ready } = useBag();
  const ref = useFocusTrap<HTMLElement>(closeCart, "[data-autofocus]");

  return (
    <div className="t13-drawer-root">
      <div className="t13-scrim" onClick={closeCart} aria-hidden="true" />
      <aside ref={ref} className="t13-drawer" role="dialog" aria-modal="true" aria-labelledby="t13-bag-title" tabIndex={-1}>
        <header className="t13-drawer-head">
          <h2 id="t13-bag-title" className="t13-drawer-title">
            Your bag{ready && count > 0 ? <span className="t13-drawer-count t13-mono">{count}</span> : null}
          </h2>
          <button type="button" className="t13-icon-btn" aria-label="Close bag" onClick={closeCart} data-autofocus>
            <IconClose />
          </button>
        </header>

        {ready && rows.length > 0 ? (
          <>
            <div className="t13-drawer-body">
              <CartLines rows={rows} onNavigate={closeCart} />
            </div>
            <footer className="t13-drawer-foot">
              <p className="t13-sum-row t13-mono">
                <span>Subtotal</span>
                <b>{formatNaira(subtotal)}</b>
              </p>
              <p className="t13-fine">Delivery is added at checkout.</p>
              <Link className="t13-pill t13-pill-lg t13-add" href={`${shopHref(baseUrl)}/checkout`} onClick={closeCart}>
                Checkout <IconArrow size={18} />
              </Link>
              <WhatsAppOrderButton rows={rows} onNavigate={closeCart} />
              <Link className="t13-text-btn t13-center" href={shopHref(baseUrl)} onClick={closeCart}>
                Keep shopping
              </Link>
            </footer>
          </>
        ) : (
          <div className="t13-drawer-empty">
            <span className="t13-empty-ico" aria-hidden="true">
              <IconBag size={34} />
            </span>
            <p className="t13-empty-title">{ready ? "Your bag is empty" : "Loading your bag"}</p>
            {ready ? (
              <Link className="t13-pill t13-pill-solid" href={shopHref(baseUrl)} onClick={closeCart}>
                Continue shopping
              </Link>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}

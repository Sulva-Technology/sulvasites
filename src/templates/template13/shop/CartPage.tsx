"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import { shopHref, useT13 } from "../ctx";
import { IconArrow, IconBag } from "../icons";
import CartLines from "./CartLines";
import { useBag } from "./useBag";

/** Full-page bag. */
export default function CartPage() {
  const { baseUrl } = useT13();
  const { rows, subtotal, blocked, ready } = useBag();

  return (
    <section className="t13-section t13-sp">
      <div className="t13-container">
        <header className="t13-sp-head">
          <nav className="t13-crumbs" aria-label="Breadcrumb">
            <Link href={shopHref(baseUrl)}>Shop</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Bag</span>
          </nav>
          <h1 className="t13-sp-title">Your bag</h1>
        </header>

        {!ready ? (
          <p className="t13-muted" role="status">
            Loading your bag
          </p>
        ) : rows.length === 0 ? (
          <div className="t13-empty">
            <span className="t13-empty-ico" aria-hidden="true">
              <IconBag size={38} />
            </span>
            <p className="t13-empty-title">Your bag is empty</p>
            <p className="t13-muted">Add something you love and it will wait for you here.</p>
            <Link className="t13-pill t13-pill-solid t13-pill-lg" href={shopHref(baseUrl)}>
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="t13-bag-layout">
            <div className="t13-bag-lines">
              <CartLines rows={rows} />
            </div>
            <aside className="t13-summary" aria-label="Order summary">
              <h2 className="t13-sum-title">Summary</h2>
              <p className="t13-sum-row t13-mono">
                <span>Subtotal</span>
                <b>{formatNaira(subtotal)}</b>
              </p>
              <p className="t13-fine">Delivery is added at checkout.</p>
              {blocked ? (
                <p className="t13-form-error" role="alert">
                  Remove the unavailable items above to continue.
                </p>
              ) : null}
              <Link className="t13-pill t13-pill-lg t13-add" href={`${shopHref(baseUrl)}/checkout`}>
                Checkout <IconArrow size={18} />
              </Link>
              <Link className="t13-text-btn t13-center" href={shopHref(baseUrl)}>
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}

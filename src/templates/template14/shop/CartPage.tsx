"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import { shopHref, useT14 } from "../ctx";
import { IconArrow, IconBag } from "../icons";
import CartLines from "./CartLines";
import { useBag } from "./useBag";

/** Full-page cart. */
export default function CartPage() {
  const { baseUrl } = useT14();
  const { rows, subtotal, blocked, ready } = useBag();

  return (
    <section className="t14-section t14-shop-page">
      <div className="t14-container">
        <header className="t14-shop-head">
          <nav className="t14-crumbs" aria-label="Breadcrumb">
            <Link href={shopHref(baseUrl)}>Shop</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Cart</span>
          </nav>
          <h1 className="t14-h1">Your cart</h1>
        </header>

        {!ready ? (
          <p className="t14-muted" role="status">
            Loading your cart
          </p>
        ) : rows.length === 0 ? (
          <div className="t14-empty">
            <span className="t14-empty-ico" aria-hidden="true">
              <IconBag size={38} />
            </span>
            <p className="t14-empty-title">Your cart is empty</p>
            <p className="t14-muted">Add something and it will wait for you here.</p>
            <Link className="t14-btn t14-btn-lg" href={shopHref(baseUrl)}>
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="t14-bag-layout">
            <div className="t14-bag-lines">
              <CartLines rows={rows} />
            </div>
            <aside className="t14-summary" aria-label="Order summary">
              <h2 className="t14-card-title">Summary</h2>
              <p className="t14-sum-row">
                <span>Subtotal</span>
                <b>{formatNaira(subtotal)}</b>
              </p>
              <p className="t14-fine">Delivery is added at checkout.</p>
              {blocked ? (
                <p className="t14-form-error" role="alert">
                  Remove the unavailable items above to continue.
                </p>
              ) : null}
              <Link className="t14-btn t14-btn-block t14-btn-lg" href={`${shopHref(baseUrl)}/checkout`}>
                Checkout <IconArrow size={18} />
              </Link>
              <Link className="t14-textlink t14-center" href={shopHref(baseUrl)}>
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}

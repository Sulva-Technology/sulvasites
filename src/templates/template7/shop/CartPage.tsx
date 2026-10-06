"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import { shopHref, useT7 } from "../ctx";
import { IconArrow, IconBag } from "../icons";
import CartLines from "./CartLines";
import { useBag } from "./useBag";

/** Full-page cart. */
export default function CartPage() {
  const { baseUrl } = useT7();
  const { rows, subtotal, blocked, ready } = useBag();

  return (
    <section className="t7-section t7-shop-page">
      <div className="t7-container">
        <header className="t7-shop-head">
          <nav className="t7-crumbs" aria-label="Breadcrumb">
            <Link href={shopHref(baseUrl)}>Menu</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Your order</span>
          </nav>
          <h1 className="t7-h1">Your order</h1>
        </header>

        {!ready ? (
          <p className="t7-muted" role="status">
            Loading your order
          </p>
        ) : rows.length === 0 ? (
          <div className="t7-empty">
            <span className="t7-empty-ico" aria-hidden="true">
              <IconBag size={38} />
            </span>
            <p className="t7-empty-title">Your order is empty</p>
            <p className="t7-muted">Add a dish or two and it will wait for you here.</p>
            <Link className="t7-btn t7-btn-lg" href={shopHref(baseUrl)}>
              Back to the menu
            </Link>
          </div>
        ) : (
          <div className="t7-bag-layout">
            <div className="t7-bag-lines">
              <CartLines rows={rows} />
            </div>
            <aside className="t7-summary" aria-label="Order summary">
              <h2 className="t7-card-title">Summary</h2>
              <p className="t7-sum-row">
                <span>Subtotal</span>
                <b>{formatNaira(subtotal)}</b>
              </p>
              <p className="t7-fine">Delivery is added at checkout.</p>
              {blocked ? (
                <p className="t7-form-error" role="alert">
                  Remove the unavailable items above to continue.
                </p>
              ) : null}
              <Link className="t7-btn t7-btn-block t7-btn-lg" href={`${shopHref(baseUrl)}/checkout`}>
                Checkout <IconArrow size={18} />
              </Link>
              <Link className="t7-textlink t7-center" href={shopHref(baseUrl)}>
                Back to the menu
              </Link>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}

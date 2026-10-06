"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import { shopHref, useT14 } from "../ctx";
import { IconArrow, IconBag } from "../icons";
import CartLines from "./CartLines";
import { useBag } from "./useBag";

/** Full-page bag: a lines card and a summary card on a paper page. */
export default function CartPage() {
  const { baseUrl } = useT14();
  const { rows, subtotal, blocked, ready } = useBag();

  return (
    <section className="t14-cp t14-shop-page">
      <div className="t14-container">
        <header className="t14-cp-head">
          <nav className="t14-crumbs" aria-label="Breadcrumb">
            <Link href={shopHref(baseUrl)}>Shop</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Bag</span>
          </nav>
          <h1 className="t14-h1">Your bag.</h1>
        </header>

        {!ready ? (
          <p className="t14-cp-note" role="status">
            Loading your bag
          </p>
        ) : rows.length === 0 ? (
          <div className="t14-cp-empty">
            <span className="t14-bag-empty-ico" aria-hidden="true">
              <IconBag size={30} />
            </span>
            <p className="t14-bag-empty-t">Your bag is empty</p>
            <p className="t14-cp-note">Add something and it will wait for you here.</p>
            <Link className="t14-pill t14-pill-black t14-pill-lg" href={shopHref(baseUrl)}>
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="t14-cp-layout">
            <div className="t14-cp-card">
              <CartLines rows={rows} />
            </div>
            <aside className="t14-cp-card t14-cp-sum" aria-label="Order summary">
              <h2 className="t14-cp-h">Summary</h2>
              <p className="t14-bsum-row">
                <span>Delivery</span>
                <span>Added at checkout</span>
              </p>
              <p className="t14-bsum-total">
                <span>Subtotal</span>
                <b>{formatNaira(subtotal)}</b>
              </p>
              {blocked ? (
                <p className="t14-co-formerr" role="alert">
                  Remove the unavailable items to continue.
                </p>
              ) : null}
              <Link className="t14-pill t14-pill-black t14-pill-xl t14-pill-block" href={`${shopHref(baseUrl)}/checkout`}>
                Checkout <IconArrow size={18} />
              </Link>
              <Link className="t14-pill t14-pill-soft t14-pill-block" href={shopHref(baseUrl)}>
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}

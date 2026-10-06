"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatNaira } from "@/lib/shop/money";
import type { OrderStatus } from "@/lib/shop/types";
import { pollOrder, type VerifyResult } from "@/lib/shop/verifyClient";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { shopHref, useT7 } from "../ctx";
import { IconAlert, IconCheck, IconClock } from "../icons";

const COPY: Record<OrderStatus["payment"], { title: string; icon: "ok" | "wait" | "bad" }> = {
  paid: { title: "Thank you, your payment is confirmed", icon: "ok" },
  pending: { title: "Confirming your payment", icon: "wait" },
  failed: { title: "Your payment did not go through", icon: "bad" },
  cancelled: { title: "This order was cancelled", icon: "bad" },
  refund_pending: { title: "We could not complete this order", icon: "bad" },
};

/**
 * Order status after Paystack redirects back. Polls the verify endpoint until the payment state is
 * final (paid, failed, cancelled, refund pending), then shows what happened and what to do next.
 * The cart is cleared once the order is confirmed paid.
 */
export default function OrderPage({ reference }: { reference: string }) {
  const { shop, baseUrl, cart, profile } = useT7();
  const siteId = shop?.siteId ?? "";
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [polling, setPolling] = useState(true);
  const [run, setRun] = useState(0);
  const cleared = useRef(false);

  const clearCart = cart.clear;
  useEffect(() => {
    const ctrl = new AbortController();
    pollOrder(siteId, reference, {
      signal: ctrl.signal,
      onUpdate: (r) => {
        if (!ctrl.signal.aborted) setResult(r);
      },
    }).finally(() => {
      if (!ctrl.signal.aborted) setPolling(false);
    });
    return () => ctrl.abort();
  }, [siteId, reference, run]);

  const order = result?.ok ? result.order : null;
  const paid = order?.payment === "paid";
  useEffect(() => {
    if (paid && !cleared.current) {
      cleared.current = true;
      clearCart();
    }
  }, [paid, clearCart]);

  const recheck = useCallback(() => {
    setPolling(true);
    setRun((n) => n + 1);
  }, []);

  const notFound = result && !result.ok && result.notFound;
  const errorText = result && !result.ok && !result.notFound ? result.error : null;
  const state = order ? COPY[order.payment] : null;

  const contacts = (
    <p className="t7-fine">
      {profile.whatsapp ? (
        <a href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
          WhatsApp us
        </a>
      ) : null}
      {profile.phone ? (
        <>
          {profile.whatsapp ? " · " : ""}
          <a href={buildTelLink(profile.phone)}>{profile.phone}</a>
        </>
      ) : null}
      {profile.email ? (
        <>
          {profile.whatsapp || profile.phone ? " · " : ""}
          <a href={buildEmailLink(profile.email)}>{profile.email}</a>
        </>
      ) : null}
    </p>
  );

  return (
    <section className="t7-section t7-shop-page">
      <div className="t7-container t7-order">
        <p className="t7-label">Order</p>
        <p className="t7-order-ref">
          Reference <b>{reference}</b>
        </p>

        <div className="t7-order-card" role="status" aria-live="polite" aria-atomic="true" data-state={order?.payment ?? (notFound ? "failed" : "pending")}>
          {notFound ? (
            <>
              <span className="t7-order-ico" data-kind="bad">
                <IconAlert size={30} />
              </span>
              <h1 className="t7-h2">We could not find this order</h1>
              <p className="t7-muted">Check the link or reference. If you have paid, contact us with your reference.</p>
              {contacts}
            </>
          ) : state && order ? (
            <>
              <span className="t7-order-ico" data-kind={state.icon}>
                {state.icon === "ok" ? <IconCheck size={30} /> : state.icon === "wait" ? <IconClock size={30} /> : <IconAlert size={30} />}
              </span>
              <h1 className="t7-h2">{state.title}</h1>
              {order.payment === "paid" ? (
                <p className="t7-muted">
                  {order.firstName ? `${order.firstName}, your` : "Your"} order is confirmed.
                  {order.deliveryMethod === "pickup" ? " You chose to pick it up." : ""} Paystack sends your payment receipt.
                </p>
              ) : order.payment === "pending" ? (
                <p className="t7-muted">
                  {polling
                    ? "Checking with Paystack. This usually takes a few seconds."
                    : "We have not received confirmation yet. If you completed payment, it can take a little longer."}
                </p>
              ) : order.payment === "failed" ? (
                <p className="t7-muted">The payment was not completed, so this order has not been placed. Your order is still saved so you can try again.</p>
              ) : order.payment === "cancelled" ? (
                <p className="t7-muted">This order was cancelled. If you think this is a mistake, contact us with your reference.</p>
              ) : (
                <p className="t7-muted">
                  Your payment came through but we could not complete the order, so it needs to be refunded. Please contact us with
                  your reference.
                </p>
              )}

              {order.items.length > 0 ? (
                <>
                  <ul className="t7-order-items" aria-label="Items in this order">
                    {order.items.map((it, i) => (
                      <li key={i}>
                        <span>
                          {it.name}
                          {it.variantLabel ? <small> {it.variantLabel}</small> : null}
                          <small> × {it.quantity}</small>
                        </span>
                        <b>{formatNaira(it.lineTotalKobo)}</b>
                      </li>
                    ))}
                  </ul>
                  <p className="t7-sum-row">
                    <span>Subtotal</span>
                    <b>{formatNaira(order.subtotalKobo)}</b>
                  </p>
                  <p className="t7-sum-row">
                    <span>{order.deliveryMethod === "pickup" ? "Pickup" : "Delivery"}</span>
                    <b>{order.deliveryKobo > 0 ? formatNaira(order.deliveryKobo) : "Free"}</b>
                  </p>
                  <p className="t7-sum-row t7-sum-total">
                    <span>Total</span>
                    <b>{formatNaira(order.totalKobo)}</b>
                  </p>
                </>
              ) : null}

              <div className="t7-actions t7-actions-center">
                {order.payment === "pending" && !polling ? (
                  <button type="button" className="t7-btn" onClick={recheck}>
                    Check again
                  </button>
                ) : null}
                {order.payment === "failed" ? (
                  <Link className="t7-btn" href={`${shopHref(baseUrl)}/checkout`}>
                    Try again
                  </Link>
                ) : null}
                <Link className={order.payment === "paid" ? "t7-btn" : "t7-btn t7-btn-ghost"} href={shopHref(baseUrl)}>
                  Back to the menu
                </Link>
              </div>
              {order.payment === "refund_pending" || order.payment === "cancelled" || order.payment === "pending" ? contacts : null}
            </>
          ) : errorText ? (
            <>
              <span className="t7-order-ico" data-kind="bad">
                <IconAlert size={30} />
              </span>
              <h1 className="t7-h2">We could not check this order</h1>
              <p className="t7-muted">{errorText}</p>
              <div className="t7-actions t7-actions-center">
                <button type="button" className="t7-btn" onClick={recheck} disabled={polling}>
                  {polling ? "Checking" : "Try again"}
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="t7-order-ico" data-kind="wait">
                <IconClock size={30} />
              </span>
              <h1 className="t7-h2">Confirming your payment</h1>
              <p className="t7-muted">Checking with Paystack. This usually takes a few seconds.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

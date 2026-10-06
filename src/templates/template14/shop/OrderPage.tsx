"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatNaira } from "@/lib/shop/money";
import type { OrderStatus } from "@/lib/shop/types";
import { pollOrder, type VerifyResult } from "@/lib/shop/verifyClient";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { shopHref, useT14 } from "../ctx";
import { IconAlert, IconCheck, IconClock } from "../icons";

type StepState = "done" | "current" | "next";

/** Paid then Fulfilled: the only states the order API reports for a paid-for order. */
function steps(order: OrderStatus): Array<{ label: string; state: StepState }> | null {
  if (order.payment === "pending") {
    return [
      { label: "Paid", state: "current" },
      { label: "Fulfilled", state: "next" },
    ];
  }
  if (order.payment === "paid") {
    return [
      { label: "Paid", state: "done" },
      { label: "Fulfilled", state: order.status === "fulfilled" ? "done" : "next" },
    ];
  }
  return null;
}

const Tick = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path className="t14-ord-tick" pathLength={1} d="m6 12.5 4 4L18.5 8" />
  </svg>
);

const COPY: Record<OrderStatus["payment"], { title: string; icon: "ok" | "wait" | "bad" }> = {
  paid: { title: "Thank you.", icon: "ok" },
  pending: { title: "Confirming your payment.", icon: "wait" },
  failed: { title: "Your payment did not go through.", icon: "bad" },
  cancelled: { title: "This order was cancelled.", icon: "bad" },
  refund_pending: { title: "We could not complete this order.", icon: "bad" },
};

/**
 * Order status after Paystack redirects back. Polls the verify endpoint until the payment state is
 * final (paid, failed, cancelled, refund pending), then shows what happened and what to do next.
 * The cart is cleared once the order is confirmed paid.
 */
export default function OrderPage({ reference }: { reference: string }) {
  const { shop, baseUrl, cart, profile } = useT14();
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
    <p className="t14-ord-contact">
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

  const timeline = order ? steps(order) : null;

  return (
    <section className="t14-ord t14-shop-page">
      <div className="t14-container">
        <div className="t14-ord-card" role="status" aria-live="polite" aria-atomic="true" data-state={order?.payment ?? (notFound ? "failed" : "pending")}>
          {notFound ? (
            <>
              <span className="t14-ord-ico" data-kind="bad">
                <IconAlert size={26} />
              </span>
              <h1 className="t14-ord-h">We could not find this order.</h1>
              <p className="t14-chip t14-ord-ref">Reference {reference}</p>
              <p className="t14-ord-p">Check the link or reference. If you have paid, contact us with your reference.</p>
              {contacts}
            </>
          ) : state && order ? (
            <>
              <span className="t14-ord-ico" data-kind={state.icon}>
                {state.icon === "ok" ? <Tick /> : state.icon === "wait" ? <IconClock size={24} /> : <IconAlert size={26} />}
              </span>
              <h1 className="t14-ord-h">
                {order.payment === "paid" && order.firstName ? (
                  <>
                    <span className="t14-dim">Thank you,</span>
                    <br />
                    {order.firstName}.
                  </>
                ) : (
                  state.title
                )}
              </h1>
              <p className="t14-chip t14-ord-ref">Reference {reference}</p>
              {order.payment === "paid" ? (
                <p className="t14-ord-p">
                  Your order is confirmed.
                  {order.deliveryMethod === "pickup" ? " You chose to pick it up." : ""} Paystack sends your payment receipt.
                </p>
              ) : order.payment === "pending" ? (
                <p className="t14-ord-p">
                  {polling
                    ? "Checking with Paystack. This usually takes a few seconds."
                    : "We have not received confirmation yet. If you completed payment, it can take a little longer."}
                </p>
              ) : order.payment === "failed" ? (
                <p className="t14-ord-p">The payment was not completed, so this order has not been placed. Your bag is still saved so you can try again.</p>
              ) : order.payment === "cancelled" ? (
                <p className="t14-ord-p">This order was cancelled. If you think this is a mistake, contact us with your reference.</p>
              ) : (
                <p className="t14-ord-p">
                  Your payment came through but we could not complete the order, so it needs to be refunded. Please contact us with
                  your reference.
                </p>
              )}

              {timeline ? (
                <ol className="t14-ord-steps" aria-label="Order progress">
                  {timeline.map((st) => (
                    <li key={st.label} data-s={st.state}>
                      {st.state === "done" ? <IconCheck size={14} /> : st.state === "current" ? <i aria-hidden="true" /> : null}
                      {st.label}
                      <span className="t14-sr"> ({st.state === "done" ? "done" : st.state === "current" ? "in progress" : "next"})</span>
                    </li>
                  ))}
                </ol>
              ) : null}

              {order.items.length > 0 ? (
                <div className="t14-ord-list">
                  <ul className="t14-ord-items" aria-label="Items in this order">
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
                  <p className="t14-bsum-row">
                    <span>Subtotal</span>
                    <span>{formatNaira(order.subtotalKobo)}</span>
                  </p>
                  <p className="t14-bsum-row">
                    <span>{order.deliveryMethod === "pickup" ? "Pickup" : "Delivery"}</span>
                    <span>{order.deliveryKobo > 0 ? formatNaira(order.deliveryKobo) : "Free"}</span>
                  </p>
                  <p className="t14-bsum-total">
                    <span>Total</span>
                    <b>{formatNaira(order.totalKobo)}</b>
                  </p>
                </div>
              ) : null}

              <div className="t14-ord-actions">
                {order.payment === "pending" && !polling ? (
                  <button type="button" className="t14-pill t14-pill-black" onClick={recheck}>
                    Check again
                  </button>
                ) : null}
                {order.payment === "failed" ? (
                  <Link className="t14-pill t14-pill-black" href={`${shopHref(baseUrl)}/checkout`}>
                    Try again
                  </Link>
                ) : null}
                <Link className="t14-pill t14-pill-soft" href={shopHref(baseUrl)}>
                  Continue shopping
                </Link>
              </div>
              {order.payment === "refund_pending" || order.payment === "cancelled" || order.payment === "pending" ? contacts : null}
            </>
          ) : errorText ? (
            <>
              <span className="t14-ord-ico" data-kind="bad">
                <IconAlert size={26} />
              </span>
              <h1 className="t14-ord-h">We could not check this order.</h1>
              <p className="t14-chip t14-ord-ref">Reference {reference}</p>
              <p className="t14-ord-p">{errorText}</p>
              <div className="t14-ord-actions">
                <button type="button" className="t14-pill t14-pill-black" onClick={recheck} disabled={polling}>
                  {polling ? "Checking" : "Try again"}
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="t14-ord-ico" data-kind="wait">
                <IconClock size={24} />
              </span>
              <h1 className="t14-ord-h">Confirming your payment.</h1>
              <p className="t14-chip t14-ord-ref">Reference {reference}</p>
              <p className="t14-ord-p">Checking with Paystack. This usually takes a few seconds.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

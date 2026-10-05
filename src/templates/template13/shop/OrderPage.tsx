"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatNaira } from "@/lib/shop/money";
import type { OrderStatus } from "@/lib/shop/types";
import { pollOrder, type VerifyResult } from "@/lib/shop/verifyClient";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { shopHref, useT13 } from "../ctx";
import { IconAlert, IconClock } from "../icons";

/** Timeline steps the API can actually report (payment state + order status); nothing else is invented. */
const STEPS: Array<{ key: string; label: string }> = [
  { key: "paid", label: "Paid" },
  { key: "fulfilled", label: "Fulfilled" },
];

function Timeline({ order }: { order: OrderStatus }) {
  if (order.payment !== "paid") return null;
  const at = STEPS.findIndex((x) => x.key === order.status);
  // "paid" while the order awaits fulfilment; any other status is shown as plain text.
  const known = at >= 0;
  const current = known ? at : 0;
  return (
    <div className="t13-tl-wrap">
      <ol className="t13-tl" aria-label="Order progress">
        {STEPS.map((st, i) => (
          <li
            key={st.key}
            className="t13-tl-step t13-mono"
            data-state={known ? (i < current ? "done" : i === current ? "current" : "todo") : i === 0 ? "done" : "todo"}
            aria-current={known && i === current ? "step" : undefined}
          >
            <span className="t13-tl-dot" aria-hidden="true" />
            {st.label}
          </li>
        ))}
      </ol>
      {!known ? <p className="t13-mono t13-tl-note">Status: {order.status}</p> : null}
    </div>
  );
}

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
 * The bag is cleared once the order is confirmed paid.
 */
export default function OrderPage({ reference }: { reference: string }) {
  const { shop, baseUrl, cart, profile } = useT13();
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
    <p className="t13-fine">
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
    <section className="t13-section t13-order-page">
      <div className="t13-container t13-order">
        <p className="t13-order-ref t13-mono">
          <span>Reference</span> <b>{reference}</b>
        </p>

        <div className="t13-order-card" role="status" aria-live="polite" aria-atomic="true" data-state={order?.payment ?? (notFound ? "failed" : "pending")}>
          {notFound ? (
            <>
              <span className="t13-order-ico" data-kind="bad">
                <IconAlert size={30} />
              </span>
              <h1 className="t13-order-title">We could not find this order</h1>
              <p className="t13-muted">Check the link or reference. If you have paid, contact us with your reference.</p>
              {contacts}
            </>
          ) : state && order ? (
            <>
              {order.payment === "paid" ? null : (
                <span className="t13-order-ico" data-kind={state.icon}>
                  {state.icon === "wait" ? <IconClock size={30} /> : <IconAlert size={30} />}
                </span>
              )}
              <h1 className="t13-order-title">{order.payment === "paid" ? `Thank you${order.firstName ? `, ${order.firstName}` : ""}.` : state.title}</h1>
              {order.payment === "paid" ? (
                <p className="t13-muted">
                  Your payment is confirmed and your order is placed.
                  {order.deliveryMethod === "pickup" ? " You chose to pick it up." : ""} Paystack sends your payment receipt.
                </p>
              ) : order.payment === "pending" ? (
                <p className="t13-muted">
                  {polling
                    ? "Checking with Paystack. This usually takes a few seconds."
                    : "We have not received confirmation yet. If you completed payment, it can take a little longer."}
                </p>
              ) : order.payment === "failed" ? (
                <p className="t13-muted">The payment was not completed, so this order has not been placed. Your bag is still saved so you can try again.</p>
              ) : order.payment === "cancelled" ? (
                <p className="t13-muted">This order was cancelled. If you think this is a mistake, contact us with your reference.</p>
              ) : (
                <p className="t13-muted">
                  Your payment came through but we could not complete the order, so it needs to be refunded. Please contact us with
                  your reference.
                </p>
              )}

              <Timeline order={order} />

              {order.items.length > 0 ? (
                <>
                  <ul className="t13-order-items t13-mono" aria-label="Items in this order">
                    {order.items.map((it, i) => (
                      <li key={i}>
                        <span>
                          {it.name}
                          {it.variantLabel ? <small> {it.variantLabel}</small> : null}
                          <small> x {it.quantity}</small>
                        </span>
                        <b>{formatNaira(it.lineTotalKobo)}</b>
                      </li>
                    ))}
                  </ul>
                  <p className="t13-sum-row t13-mono">
                    <span>Subtotal</span>
                    <b>{formatNaira(order.subtotalKobo)}</b>
                  </p>
                  <p className="t13-sum-row t13-mono">
                    <span>{order.deliveryMethod === "pickup" ? "Pickup" : "Delivery"}</span>
                    <b>{order.deliveryKobo > 0 ? formatNaira(order.deliveryKobo) : "Free"}</b>
                  </p>
                  <p className="t13-sum-row t13-sum-total t13-mono">
                    <span>Total</span>
                    <b>{formatNaira(order.totalKobo)}</b>
                  </p>
                </>
              ) : null}

              <div className="t13-actions t13-actions-center">
                {order.payment === "pending" && !polling ? (
                  <button type="button" className="t13-pill t13-pill-solid" onClick={recheck}>
                    Check again
                  </button>
                ) : null}
                {order.payment === "failed" ? (
                  <Link className="t13-pill t13-pill-solid" href={`${shopHref(baseUrl)}/checkout`}>
                    Try again
                  </Link>
                ) : null}
                <Link className={order.payment === "paid" ? "t13-pill t13-pill-solid" : "t13-pill t13-pill-glass"} href={shopHref(baseUrl)}>
                  Continue shopping
                </Link>
              </div>
              {order.payment === "refund_pending" || order.payment === "cancelled" || order.payment === "pending" ? contacts : null}
            </>
          ) : errorText ? (
            <>
              <span className="t13-order-ico" data-kind="bad">
                <IconAlert size={30} />
              </span>
              <h1 className="t13-order-title">We could not check this order</h1>
              <p className="t13-muted">{errorText}</p>
              <div className="t13-actions t13-actions-center">
                <button type="button" className="t13-pill t13-pill-solid" onClick={recheck} disabled={polling}>
                  {polling ? "Checking" : "Try again"}
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="t13-order-ico" data-kind="wait">
                <IconClock size={30} />
              </span>
              <h1 className="t13-order-title">Confirming your payment</h1>
              <p className="t13-muted">Checking with Paystack. This usually takes a few seconds.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

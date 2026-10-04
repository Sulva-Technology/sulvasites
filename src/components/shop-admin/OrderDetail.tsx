"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { formatNaira } from "@/lib/shop/money";
import { allowedTransitions, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/shop/orderStatus";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import { btnCls, btnDangerCls, cardCls, errMsg, Notice, type ShopAdminProps } from "./common";
import { OrderFlags, StatusBadge } from "./OrderInbox";
import ShopAdminTabs from "./ShopAdminTabs";

type Order = {
  id: string;
  reference: string;
  status: OrderStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_method: "delivery" | "pickup";
  delivery_address: string | null;
  notes: string | null;
  subtotal_kobo: number;
  delivery_kobo: number;
  total_kobo: number;
  payment_mode: string | null;
  paystack_reference: string | null;
  paid_at: string | null;
  stock_issue: boolean;
  amount_mismatch: boolean;
  paid_after_cancel: boolean;
  created_at: string;
};
type Item = {
  id: string;
  name: string;
  variant_label: string | null;
  unit_price_kobo: number;
  quantity: number;
  line_total_kobo: number;
};

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  fulfilled: "Mark fulfilled",
  cancelled: "Cancel order",
  refunded: "Mark refunded",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 py-1 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words text-gray-900">{children}</dd>
    </div>
  );
}

export default function OrderDetail(props: ShopAdminProps & { orderId: string }) {
  const { siteId, basePath, orderId, role } = props;
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const db = await getAuthenticatedClient();
      const [o, it] = await Promise.all([
        db.from("orders").select("*").eq("id", orderId).eq("site_id", siteId).maybeSingle(),
        db.from("order_items").select("id, name, variant_label, unit_price_kobo, quantity, line_total_kobo").eq("order_id", orderId).eq("site_id", siteId),
      ]);
      if (o.error) throw o.error;
      if (it.error) throw it.error;
      if (!o.data) {
        setErr("Order not found.");
      } else {
        const d = o.data as Order;
        setOrder({ ...d, subtotal_kobo: Number(d.subtotal_kobo), delivery_kobo: Number(d.delivery_kobo), total_kobo: Number(d.total_kobo) });
      }
      setItems(
        ((it.data ?? []) as Item[]).map((x) => ({
          ...x,
          unit_price_kobo: Number(x.unit_price_kobo),
          line_total_kobo: Number(x.line_total_kobo),
        })),
      );
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoaded(true);
    }
  }, [siteId, orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(next: OrderStatus) {
    if (!order) return;
    const warn =
      next === "cancelled"
        ? "Cancel this order? Stock is not restored automatically."
        : next === "refunded"
          ? "Mark this order refunded? Refund the customer in Paystack first; this only records it."
          : null;
    if (warn && !window.confirm(warn)) return;
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      // The user's own session client: RLS and the order status guard decide what is allowed.
      const db = await getAuthenticatedClient();
      const { data, error } = await db.from("orders").update({ status: next }).eq("id", order.id).eq("site_id", siteId).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("The order could not be updated.");
      setOk(`Order marked ${ORDER_STATUS_LABEL[next].toLowerCase()}.`);
      await load();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const actions = order ? allowedTransitions(order, role) : [];

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Shop</h1>
      <ShopAdminTabs {...props} active="orders" />
      <div className="mb-3">
        <Link href={`${basePath}/orders`} className="text-sm text-blue-700 underline">
          Back to orders
        </Link>
      </div>
      {err ? (
        <div className="mb-3">
          <Notice kind="error">{err}</Notice>
        </div>
      ) : null}
      {ok ? (
        <div className="mb-3">
          <Notice kind="ok">{ok}</Notice>
        </div>
      ) : null}
      {!loaded ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : order ? (
        <div className="space-y-4">
          {order.paid_after_cancel ? (
            <Notice kind="error">
              Paid after cancel – refund required. The customer paid {formatNaira(order.total_kobo)} for an order that was already
              cancelled. Refund them in Paystack{order.paystack_reference ? ` (reference ${order.paystack_reference})` : ""}.
            </Notice>
          ) : null}
          {order.amount_mismatch ? (
            <Notice kind="error">The amount Paystack reported does not match this order total, so it was not marked paid. Check the payment in Paystack before acting.</Notice>
          ) : null}
          {order.stock_issue ? (
            <Notice kind="warn">Stock issue: some items did not have enough stock when this order was paid. Contact the customer or restock.</Notice>
          ) : null}

          <section className={cardCls}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-sm font-semibold text-gray-900">{order.reference}</h2>
              <StatusBadge status={order.status} />
              <OrderFlags o={order} />
            </div>
            <dl>
              <Row label="Placed">{new Date(order.created_at).toLocaleString()}</Row>
              <Row label="Paid">{order.paid_at ? new Date(order.paid_at).toLocaleString() : "Not paid"}</Row>
              <Row label="Paystack ref">{order.paystack_reference ?? "—"}</Row>
              <Row label="Payment mode">{order.payment_mode === "own_keys" ? "Shop's own Paystack" : order.payment_mode === "platform" ? "Sulvatech Paystack" : "—"}</Row>
            </dl>
          </section>

          <section className={cardCls}>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Customer</h2>
            <dl>
              <Row label="Name">{order.customer_name}</Row>
              <Row label="Email">{order.customer_email}</Row>
              <Row label="Phone">{order.customer_phone}</Row>
              <Row label="Delivery">{order.delivery_method === "pickup" ? "Pickup" : "Delivery"}</Row>
              {order.delivery_address ? <Row label="Address"><span className="whitespace-pre-wrap">{order.delivery_address}</span></Row> : null}
              {order.notes ? <Row label="Notes"><span className="whitespace-pre-wrap">{order.notes}</span></Row> : null}
            </dl>
          </section>

          <section className={cardCls}>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-1 pr-3">Item</th>
                    <th className="py-1 pr-3">Price</th>
                    <th className="py-1 pr-3">Qty</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-t border-gray-100">
                      <td className="py-2 pr-3 text-gray-900">
                        {i.name}
                        {i.variant_label ? <span className="text-gray-500"> ({i.variant_label})</span> : null}
                      </td>
                      <td className="py-2 pr-3">{formatNaira(i.unit_price_kobo)}</td>
                      <td className="py-2 pr-3">{i.quantity}</td>
                      <td className="py-2 text-right">{formatNaira(i.line_total_kobo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-3 ml-auto max-w-xs text-sm">
              <div className="flex justify-between py-0.5"><dt className="text-gray-500">Subtotal</dt><dd>{formatNaira(order.subtotal_kobo)}</dd></div>
              <div className="flex justify-between py-0.5"><dt className="text-gray-500">Delivery</dt><dd>{formatNaira(order.delivery_kobo)}</dd></div>
              <div className="flex justify-between border-t border-gray-200 py-1 font-semibold text-gray-900"><dt>Total</dt><dd>{formatNaira(order.total_kobo)}</dd></div>
            </dl>
          </section>

          <section className={cardCls}>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Actions</h2>
            {actions.length === 0 ? (
              <p className="text-sm text-gray-600">No status changes are available for this order.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {actions.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={a === "cancelled" || a === "refunded" ? btnDangerCls : btnCls}
                    disabled={busy}
                    onClick={() => setStatus(a)}
                  >
                    {ACTION_LABEL[a] ?? ORDER_STATUS_LABEL[a]}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-gray-500">
              Refunds are made in Paystack by hand; &quot;Mark refunded&quot; only records it here.
              {role === "staff" ? " Only the shop owner can mark an order refunded." : ""}
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}

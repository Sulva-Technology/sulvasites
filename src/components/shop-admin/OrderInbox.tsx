"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatNaira } from "@/lib/shop/money";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/shop/orderStatus";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import { Badge, btnGhostCls, cardCls, errMsg, inputCls, Notice, type ShopAdminProps } from "./common";
import ShopAdminTabs from "./ShopAdminTabs";

export type OrderRow = {
  id: string;
  reference: string;
  status: OrderStatus;
  customer_name: string;
  customer_email: string;
  total_kobo: number;
  paid_at: string | null;
  stock_issue: boolean;
  amount_mismatch: boolean;
  paid_after_cancel: boolean;
  created_at: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const LIMIT = 300;

export function OrderFlags({ o }: { o: Pick<OrderRow, "stock_issue" | "amount_mismatch" | "paid_after_cancel"> }) {
  return (
    <>
      {o.paid_after_cancel ? <Badge tone="red">Paid after cancel – refund required</Badge> : null}
      {o.stock_issue ? <Badge tone="amber">Stock issue</Badge> : null}
      {o.amount_mismatch ? <Badge tone="red">Amount mismatch</Badge> : null}
    </>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const tone = status === "paid" ? "green" : status === "fulfilled" ? "blue" : status === "pending" ? "gray" : "amber";
  return <Badge tone={tone}>{ORDER_STATUS_LABEL[status]}</Badge>;
}

export default function OrderInbox(props: ShopAdminProps) {
  const { siteId, basePath } = props;
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "all" | OrderStatus>("active");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    try {
      const db = await getAuthenticatedClient();
      const { data, error } = await db
        .from("orders")
        .select("id, reference, status, customer_name, customer_email, total_kobo, paid_at, stock_issue, amount_mismatch, paid_after_cancel, created_at")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false })
        .limit(LIMIT);
      if (error) throw error;
      setOrders(((data ?? []) as OrderRow[]).map((o) => ({ ...o, total_kobo: Number(o.total_kobo) })));
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoaded(true);
    }
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const now = Date.now();
    return orders.filter((o) => {
      if (filter === "active") {
        // Abandoned checkouts (still awaiting payment after a day) are hidden by default.
        if (o.status === "pending" && now - new Date(o.created_at).getTime() > DAY_MS) return false;
      } else if (filter !== "all" && o.status !== filter) {
        return false;
      }
      return (
        !needle ||
        o.reference.toLowerCase().includes(needle) ||
        o.customer_name.toLowerCase().includes(needle) ||
        o.customer_email.toLowerCase().includes(needle)
      );
    });
  }, [orders, filter, q]);

  const attention = orders.filter((o) => o.paid_after_cancel || o.stock_issue || o.amount_mismatch).length;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight text-koi-ink">Shop</h1>
      <ShopAdminTabs {...props} active="orders" />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[12rem] flex-1 text-sm font-medium text-koi-ink/80">
          Search
          <input className={inputCls} value={q} placeholder="Reference, name or email" onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="text-sm font-medium text-koi-ink/80">
          Status
          <select className={inputCls} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="active">Active (hides old unpaid)</option>
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="pending">Awaiting payment</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>
        <button type="button" className={btnGhostCls} onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {attention > 0 ? (
        <div className="mb-3">
          <Notice kind="warn">{attention} order(s) need attention (flagged below).</Notice>
        </div>
      ) : null}
      {err ? (
        <div className="mb-3">
          <Notice kind="error">{err}</Notice>
        </div>
      ) : null}
      <section className={cardCls}>
        {!loaded ? (
          <div className="text-sm text-koi-ink/60">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-koi-ink/60">No orders to show.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs uppercase text-koi-ink/55">
                <tr>
                  <th className="py-1 pr-3">Order</th>
                  <th className="py-1 pr-3">Customer</th>
                  <th className="py-1 pr-3">Total</th>
                  <th className="py-1 pr-3">Status</th>
                  <th className="py-1">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-t border-koi-ink/5 align-top">
                    <td className="py-2 pr-3">
                      <Link href={`${basePath}/orders/${o.id}`} className="font-mono text-xs font-medium text-blue-800 hover:underline">
                        {o.reference}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="text-koi-ink">{o.customer_name}</div>
                      <div className="text-xs text-koi-ink/55">{o.customer_email}</div>
                    </td>
                    <td className="py-2 pr-3 font-medium text-koi-ink">{formatNaira(o.total_kobo)}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge status={o.status} />
                        <OrderFlags o={o} />
                      </div>
                    </td>
                    <td className="py-2 text-xs text-koi-ink/55">{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {orders.length >= LIMIT ? <p className="mt-3 text-xs text-koi-ink/55">Showing the latest {LIMIT} orders.</p> : null}
      </section>
    </div>
  );
}

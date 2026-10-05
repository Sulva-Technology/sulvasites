"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getAuthenticatedClient } from "@/lib/supabase/browser";
import {
  apiFetch, btnCls, cardCls, errMsg, inputCls, NairaInput, NoAccess, Notice, type ShopAdminProps,
} from "./common";
import ShopAdminTabs from "./ShopAdminTabs";

type Settings = { enabled: boolean; delivery_fee_kobo: number; pickup_enabled: boolean; pickup_note: string };
type PaymentStatus = {
  mode: string | null;
  platform: { subaccount: boolean; bank: string | null; accountLast4: string | null };
  ownKeys: { publicKey: string | null; secretLast4: string | null };
};

const DEFAULTS: Settings = { enabled: false, delivery_fee_kobo: 0, pickup_enabled: false, pickup_note: "" };

export default function ShopOverview(props: ShopAdminProps) {
  if (props.role === "staff") return <NoAccess />;
  return <Inner {...props} />;
}

function Inner(props: ShopAdminProps) {
  const { siteId, basePath, role } = props;
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pay, setPay] = useState<PaymentStatus | null>(null);
  const [payErr, setPayErr] = useState(false);
  const [counts, setCounts] = useState<{ products: number; paid: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const db = await getAuthenticatedClient();
      const { data, error } = await db
        .from("shop_settings")
        .select("enabled, delivery_fee_kobo, pickup_enabled, pickup_note")
        .eq("site_id", siteId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setS({
          enabled: Boolean(data.enabled),
          delivery_fee_kobo: Number(data.delivery_fee_kobo),
          pickup_enabled: Boolean(data.pickup_enabled),
          pickup_note: data.pickup_note ?? "",
        });
      }
      const [p, o] = await Promise.all([
        db.from("products").select("id", { count: "exact", head: true }).eq("site_id", siteId),
        db.from("orders").select("id", { count: "exact", head: true }).eq("site_id", siteId).eq("status", "paid"),
      ]);
      setCounts({ products: p.count ?? 0, paid: o.count ?? 0 });
      if (role === "admin") {
        const res = await apiFetch<PaymentStatus>(`/api/admin/sites/${encodeURIComponent(siteId)}/shop/payment`);
        if (res.ok) setPay(res.data);
        else setPayErr(true);
      } else {
        setPayErr(true);
      }
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoaded(true);
    }
  }, [siteId, role]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const db = await getAuthenticatedClient();
      const { error } = await db.from("shop_settings").upsert(
        {
          site_id: siteId,
          enabled: s.enabled,
          delivery_fee_kobo: s.delivery_fee_kobo,
          pickup_enabled: s.pickup_enabled,
          pickup_note: s.pickup_note.trim() || null,
        },
        { onConflict: "site_id" },
      );
      if (error) throw error;
      setOk("Saved.");
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const payReady =
    pay?.mode === "platform"
      ? pay.platform.subaccount
      : pay?.mode === "own_keys"
        ? Boolean(pay.ownKeys.secretLast4 && pay.ownKeys.publicKey)
        : false;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Shop</h1>
      <ShopAdminTabs {...props} active="overview" />
      {!loaded ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section className={cardCls}>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Shop settings</h2>
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} />
              Shop enabled (visible to customers once the site is published)
            </label>
            <div className="mt-3 text-sm font-medium text-gray-800">
              <label htmlFor="delivery-fee">Delivery fee (₦)</label>
              <NairaInput
                id="delivery-fee"
                valueKobo={s.delivery_fee_kobo}
                onChange={(k) => setS({ ...s, delivery_fee_kobo: k ?? 0 })}
              />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={s.pickup_enabled}
                onChange={(e) => setS({ ...s, pickup_enabled: e.target.checked })}
              />
              Offer pickup
            </label>
            {s.pickup_enabled ? (
              <label className="mt-3 block text-sm font-medium text-gray-800">
                Pickup note
                <input
                  className={inputCls}
                  value={s.pickup_note}
                  maxLength={300}
                  placeholder="e.g. Collect from our store, 10am to 6pm"
                  onChange={(e) => setS({ ...s, pickup_note: e.target.value })}
                />
              </label>
            ) : null}
            <div className="mt-4 flex items-center gap-3">
              <button type="button" className={btnCls} disabled={busy} onClick={save}>
                {busy ? "Saving…" : "Save"}
              </button>
              {ok ? <span className="text-sm text-green-700">{ok}</span> : null}
            </div>
            {err ? (
              <div className="mt-3">
                <Notice kind="error">{err}</Notice>
              </div>
            ) : null}
          </section>

          <section className={cardCls}>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Payments</h2>
            {payErr ? (
              <p className="text-sm text-gray-600">
                {role === "admin"
                  ? "Payment status is not available for your account."
                  : "Payment setup is managed by Sulvatech. Contact us to change it."}
              </p>
            ) : pay ? (
              <div className="space-y-2 text-sm text-gray-800">
                <div>
                  Mode:{" "}
                  <b>
                    {pay.mode === "platform"
                      ? "Sulvatech Paystack (settles to your bank)"
                      : pay.mode === "own_keys"
                        ? "Your own Paystack keys"
                        : "Not set up"}
                  </b>
                </div>
                {pay.mode === "platform" && pay.platform.subaccount ? (
                  <div>
                    Settlement account ending {pay.platform.accountLast4 ?? "••••"}
                    {pay.platform.bank ? ` (${pay.platform.bank})` : ""}
                  </div>
                ) : null}
                {pay.mode === "own_keys" && pay.ownKeys.secretLast4 ? (
                  <div>Secret key saved (ending {pay.ownKeys.secretLast4})</div>
                ) : null}
                {s.enabled && !payReady ? (
                  <Notice kind="warn">The shop is enabled but payments are not set up, so customers cannot check out.</Notice>
                ) : null}
              </div>
            ) : null}
            {role === "admin" ? (
              <div className="mt-3">
                <Link className="text-sm font-medium text-blue-700 underline" href={`${basePath}/payments`}>
                  Manage payment settings
                </Link>
              </div>
            ) : null}
            {counts ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500">Products</dt>
                  <dd className="font-semibold text-gray-900">{counts.products}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Paid, to fulfil</dt>
                  <dd className="font-semibold text-gray-900">{counts.paid}</dd>
                </div>
              </dl>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}

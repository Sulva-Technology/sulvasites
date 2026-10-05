"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import InsightsChart from "@/components/insights/InsightsChart";
import { cardCls, errMsg, Notice } from "@/components/shop-admin/common";
import {
  deviceLabel, hasTraffic, parseOverview, shareOf, type Overview,
} from "@/lib/insights/overview";
import {
  DEFAULT_PERIOD, formatChange, formatCount, parsePeriod, percentChange, periodLabel, PERIODS, type Period,
} from "@/lib/insights/period";
import { formatNaira } from "@/lib/shop/money";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import { templateSupportsShop } from "@/templates/meta";

function Tile({ label, value, change, note }: { label: string; value: string; change?: number | null; note?: string }) {
  const tone = change === null || change === undefined ? "text-gray-500" : change > 0 ? "text-green-700" : change < 0 ? "text-red-700" : "text-gray-500";
  return (
    <div className={cardCls}>
      <div className="text-xs font-medium text-gray-600">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</div>
      {change !== undefined ? (
        <div className={`mt-1 text-xs ${tone}`}>
          {formatChange(change)} <span className="text-gray-500">vs previous period</span>
        </div>
      ) : null}
      {note ? <div className="mt-1 text-xs text-gray-500">{note}</div> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={cardCls} aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-gray-500">{children}</p>;
}

/** Bar-backed table row list: label, value and a proportional bar (value is also text, so colour is not required). */
function BarRows({ rows, total, caption }: { rows: { key: string; label: string; value: number; extra?: string }[]; total: number; caption: string }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Views</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-gray-100 first:border-t-0">
            <td className="max-w-0 py-1.5 pr-3">
              <div className="truncate text-gray-900" title={r.label}>{r.label}</div>
              <div aria-hidden className="mt-1 h-1 rounded bg-gray-100">
                <div className="h-1 rounded bg-blue-600" style={{ width: `${Math.max(2, shareOf(r.value, total))}%` }} />
              </div>
            </td>
            <td className="whitespace-nowrap py-1.5 text-right tabular-nums text-gray-700">
              {formatCount(r.value)}
              {r.extra ? <span className="ml-1 text-xs text-gray-500">{r.extra}</span> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function friendlyError(e: unknown): string {
  const msg = errMsg(e);
  const raw = typeof e === "object" && e ? JSON.stringify(e) : String(e);
  if (/insights_overview|PGRST202|42883/.test(raw)) {
    return "Insights are not set up yet. Ask Sulvatech to run the insights migration (011).";
  }
  if (/42501|Not allowed/i.test(raw)) return "Your role does not have access to Insights.";
  return msg;
}

/** Site analytics for one site. Shared by /dashboard/[siteId]/insights and /admin/sites/[siteId]/insights. */
export default function InsightsView({ siteId }: { siteId: string }) {
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [data, setData] = useState<Overview | null>(null);
  const [isShop, setIsShop] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (days: Period) => {
      setLoading(true);
      setErr(null);
      try {
        const db = await getAuthenticatedClient();
        const [{ data: json, error }, { data: site }] = await Promise.all([
          db.rpc("insights_overview", { p_site: siteId, p_days: days }),
          db.from("sites").select("template_key").eq("id", siteId).maybeSingle(),
        ]);
        if (error) throw error;
        setData(parseOverview(json));
        setIsShop(templateSupportsShop(String(site?.template_key ?? "")));
      } catch (e) {
        setData(null);
        setErr(friendlyError(e));
      } finally {
        setLoading(false);
      }
    },
    [siteId],
  );

  useEffect(() => {
    void load(period);
  }, [load, period]);

  const o = data;
  const traffic = o ? hasTraffic(o) : false;
  const topPageViews = o ? o.topPages.reduce((m, p) => Math.max(m, p.views), 0) : 0;
  const topRefViews = o ? o.topReferrers.reduce((m, p) => Math.max(m, p.views), 0) : 0;
  const deviceTotal = o ? o.devices.reduce((s, d) => s + d.views, 0) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Insights</h2>
          <p className="text-sm text-gray-600">How visitors use your website. No cookies, no personal data.</p>
        </div>
        <div role="group" aria-label="Period" className="inline-flex overflow-hidden rounded-md shadow-sm ring-1 ring-gray-200">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setPeriod(parsePeriod(p))}
              className={`px-3 py-1.5 text-sm font-medium ${period === p ? "bg-gray-900 text-white" : "bg-white text-gray-800 hover:bg-gray-50"}`}
            >
              {p} days
            </button>
          ))}
        </div>
      </div>

      {err ? <Notice kind="error">{err}</Notice> : null}
      {loading && !o ? <div className="text-sm text-gray-600">Loading…</div> : null}

      {o ? (
        <div className={loading ? "space-y-4 opacity-60" : "space-y-4"} aria-busy={loading}>
          <p className="sr-only" aria-live="polite">{periodLabel(o.days)}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Page views" value={formatCount(o.totals.views)} change={percentChange(o.totals.views, o.totals.prevViews)} />
            <Tile
              label="Visitors"
              value={formatCount(o.totals.visitors)}
              change={percentChange(o.totals.visitors, o.totals.prevVisitors)}
              note="Counted per day"
            />
            <Tile
              label="Views per visitor"
              value={o.totals.visitors > 0 ? (o.totals.views / o.totals.visitors).toFixed(1) : "0"}
            />
            <Tile
              label="Enquiries and bookings"
              value={formatCount(o.inbox.enquiries + o.inbox.bookings)}
              note={`${formatCount(o.inbox.enquiries)} enquiries, ${formatCount(o.inbox.bookings)} bookings${o.inbox.unread > 0 ? `, ${formatCount(o.inbox.unread)} unread` : ""}`}
            />
          </div>

          <Panel title="Views and visitors per day">
            {traffic ? (
              <InsightsChart daily={o.daily} />
            ) : (
              <Empty>
                No visits recorded yet for this period. Views appear here once people open your published website
                (visitors who enable Do Not Track, and automated crawlers, are not counted).
              </Empty>
            )}
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Top pages">
              {o.topPages.length === 0 ? (
                <Empty>No pages viewed yet.</Empty>
              ) : (
                <BarRows
                  caption="Most viewed pages"
                  total={topPageViews}
                  rows={o.topPages.map((p) => ({ key: p.path, label: p.path, value: p.views }))}
                />
              )}
            </Panel>
            <Panel title="Top referrers">
              {o.topReferrers.length === 0 ? (
                <Empty>No referring websites yet. Direct visits and visits from your own site are not listed.</Empty>
              ) : (
                <BarRows
                  caption="Websites that sent visitors"
                  total={topRefViews}
                  rows={o.topReferrers.map((r) => ({ key: r.host, label: r.host, value: r.views }))}
                />
              )}
            </Panel>
          </div>

          <Panel title="Devices">
            {o.devices.length === 0 ? (
              <Empty>No device data yet.</Empty>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-3">
                {o.devices.map((d) => (
                  <li key={d.device} className="rounded border border-gray-200 p-3">
                    <div className="text-xs text-gray-600">{deviceLabel(d.device)}</div>
                    <div className="text-xl font-semibold tabular-nums text-gray-900">{shareOf(d.views, deviceTotal)}%</div>
                    <div className="text-xs text-gray-500">{formatCount(d.views)} views</div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {isShop ? (
            <Panel title="Shop">
              <div className="grid gap-3 sm:grid-cols-3">
                <Tile label="Revenue" value={formatNaira(o.shop.revenueKobo)} change={percentChange(o.shop.revenueKobo, o.shop.prevRevenueKobo)} />
                <Tile label="Paid orders" value={formatCount(o.shop.orders)} change={percentChange(o.shop.orders, o.shop.prevOrders)} />
                <Tile
                  label="Average order"
                  value={o.shop.orders > 0 ? formatNaira(Math.round(o.shop.revenueKobo / o.shop.orders)) : formatNaira(0)}
                  note="Paid and fulfilled orders"
                />
              </div>
              <h3 className="mb-2 mt-4 text-sm font-medium text-gray-900">Top products</h3>
              {o.shop.topProducts.length === 0 ? (
                <Empty>No paid orders in this period yet.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-gray-600">
                      <tr>
                        <th scope="col" className="py-1 pr-3 font-medium">Product</th>
                        <th scope="col" className="py-1 pr-3 text-right font-medium">Sold</th>
                        <th scope="col" className="py-1 text-right font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.shop.topProducts.map((p) => (
                        <tr key={p.name} className="border-t border-gray-100">
                          <td className="py-1.5 pr-3 text-gray-900">{p.name}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{formatCount(p.quantity)}</td>
                          <td className="py-1.5 text-right tabular-nums">{formatNaira(p.revenueKobo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          ) : null}

          <p className="text-xs text-gray-500">
            Visits are stored for 90 days. Visitors are anonymous and counted once per day; the same person on two
            days counts twice.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Defensive parser for the jsonb returned by public.insights_overview (migration 011). */
import { parsePeriod, type Period } from "./period.ts";

export type DailyPoint = { day: string; views: number; visitors: number };
export type PageRow = { path: string; views: number; visitors: number };
export type ReferrerRow = { host: string; views: number };
export type DeviceRow = { device: "desktop" | "mobile" | "tablet"; views: number };
export type ShopDaily = { day: string; orders: number; revenueKobo: number };
export type ProductRow = { name: string; quantity: number; revenueKobo: number };

export type Overview = {
  days: Period;
  totals: { views: number; visitors: number; prevViews: number; prevVisitors: number };
  daily: DailyPoint[];
  topPages: PageRow[];
  topReferrers: ReferrerRow[];
  devices: DeviceRow[];
  shop: {
    orders: number;
    revenueKobo: number;
    prevOrders: number;
    prevRevenueKobo: number;
    daily: ShopDaily[];
    topProducts: ProductRow[];
  };
  inbox: { enquiries: number; bookings: number; unread: number };
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEVICES = ["desktop", "mobile", "tablet"] as const;

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function arr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.map(rec) : [];
}
function num(v: unknown): number {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : 0;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function parseOverview(raw: unknown): Overview {
  const o = rec(raw);
  const t = rec(o.totals);
  const s = rec(o.shop);
  const i = rec(o.inbox);

  const daily: DailyPoint[] = [];
  for (const r of arr(o.daily)) {
    const day = str(r.day);
    if (day && DAY_RE.test(day)) daily.push({ day, views: num(r.views), visitors: num(r.visitors) });
  }
  const topPages: PageRow[] = [];
  for (const r of arr(o.top_pages)) {
    const path = str(r.path);
    if (path) topPages.push({ path, views: num(r.views), visitors: num(r.visitors) });
  }
  const topReferrers: ReferrerRow[] = [];
  for (const r of arr(o.top_referrers)) {
    const host = str(r.host);
    if (host) topReferrers.push({ host, views: num(r.views) });
  }
  const devices: DeviceRow[] = [];
  for (const r of arr(o.devices)) {
    const d = DEVICES.find((x) => x === r.device);
    if (d) devices.push({ device: d, views: num(r.views) });
  }
  const shopDaily: ShopDaily[] = [];
  for (const r of arr(s.daily)) {
    const day = str(r.day);
    if (day && DAY_RE.test(day)) shopDaily.push({ day, orders: num(r.orders), revenueKobo: num(r.revenue_kobo) });
  }
  const topProducts: ProductRow[] = [];
  for (const r of arr(s.top_products)) {
    const name = str(r.name);
    if (name) topProducts.push({ name, quantity: num(r.quantity), revenueKobo: num(r.revenue_kobo) });
  }

  return {
    days: parsePeriod(o.days),
    totals: { views: num(t.views), visitors: num(t.visitors), prevViews: num(t.prev_views), prevVisitors: num(t.prev_visitors) },
    daily,
    topPages,
    topReferrers,
    devices,
    shop: {
      orders: num(s.orders),
      revenueKobo: num(s.revenue_kobo),
      prevOrders: num(s.prev_orders),
      prevRevenueKobo: num(s.prev_revenue_kobo),
      daily: shopDaily,
      topProducts,
    },
    inbox: { enquiries: num(i.enquiries), bookings: num(i.bookings), unread: num(i.unread) },
  };
}

export function hasTraffic(o: Overview): boolean {
  return o.totals.views > 0;
}

export function shareOf(part: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.round((part / total) * 100);
}

export function deviceLabel(d: DeviceRow["device"]): string {
  return d === "mobile" ? "Mobile" : d === "tablet" ? "Tablet" : "Desktop";
}

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PERIODS, parsePeriod, percentChange, formatCount, formatChange, shortDay, lagosDay, periodLabel,
} from "../src/lib/insights/period.ts";
import { parseOverview, shareOf, deviceLabel, hasTraffic } from "../src/lib/insights/overview.ts";

test("parsePeriod", () => {
  assert.deepEqual(PERIODS, [7, 30, 90]);
  assert.equal(parsePeriod("7"), 7);
  assert.equal(parsePeriod(90), 90);
  assert.equal(parsePeriod("15"), 30);
  assert.equal(parsePeriod(null), 30);
  assert.equal(periodLabel(7), "Last 7 days");
});

test("percentChange", () => {
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(50, 100), -50);
  assert.equal(percentChange(10, 0), null);
  assert.equal(percentChange(0, 0), null);
  assert.equal(percentChange(100, 100), 0);
});

test("formatCount / formatChange", () => {
  assert.equal(formatCount(0), "0");
  assert.equal(formatCount(999), "999");
  assert.equal(formatCount(1234), "1,234");
  assert.equal(formatCount(-5), "0");
  assert.equal(formatCount(Number.NaN), "0");
  assert.equal(formatChange(50), "+50%");
  assert.equal(formatChange(-12.4), "-12%");
  assert.equal(formatChange(0), "0%");
  assert.equal(formatChange(null), "n/a");
});

test("shortDay / lagosDay", () => {
  assert.equal(shortDay("2026-10-05"), "5 Oct");
  assert.equal(shortDay("garbage"), "garbage");
  // 23:30 UTC on 5 Oct is already 6 Oct in Lagos (UTC+1).
  assert.equal(lagosDay(new Date("2026-10-05T23:30:00Z")), "2026-10-06");
  assert.equal(lagosDay(new Date("2026-10-05T10:00:00Z")), "2026-10-05");
});

test("parseOverview is defensive", () => {
  const empty = parseOverview(null);
  assert.equal(empty.totals.views, 0);
  assert.deepEqual(empty.daily, []);
  assert.equal(hasTraffic(empty), false);

  const o = parseOverview({
    days: 7,
    totals: { views: "10", visitors: 4, prev_views: 5, prev_visitors: "2" },
    daily: [{ day: "2026-10-04", views: 3, visitors: 2 }, { day: 5, views: 7 }, { day: "2026-10-05", views: 7, visitors: 2 }],
    top_pages: [{ path: "/", views: 6, visitors: 3 }, { views: 1 }],
    top_referrers: [{ host: "google.com", views: 4 }],
    devices: [{ device: "mobile", views: 8 }, { device: "desktop", views: 2 }, { device: "weird", views: 1 }],
    shop: { orders: 2, revenue_kobo: "1500000", prev_orders: 1, prev_revenue_kobo: 500000,
      daily: [{ day: "2026-10-05", orders: 2, revenue_kobo: 1500000 }],
      top_products: [{ name: "Shirt", quantity: 3, revenue_kobo: 900000 }] },
    inbox: { enquiries: 3, bookings: 1, unread: 2 },
  });
  assert.equal(o.days, 7);
  assert.equal(o.totals.views, 10);
  assert.equal(o.totals.prevVisitors, 2);
  assert.equal(o.daily.length, 2); // malformed day dropped
  assert.equal(o.topPages.length, 1);
  assert.equal(o.topReferrers[0].host, "google.com");
  assert.deepEqual(o.devices.map((d) => d.device), ["mobile", "desktop"]);
  assert.equal(o.shop.revenueKobo, 1500000);
  assert.equal(o.shop.topProducts[0].name, "Shirt");
  assert.equal(o.inbox.unread, 2);
  assert.equal(hasTraffic(o), true);
});

test("shareOf / deviceLabel", () => {
  assert.equal(shareOf(1, 4), 25);
  assert.equal(shareOf(1, 0), 0);
  assert.equal(shareOf(3, 3), 100);
  assert.equal(deviceLabel("mobile"), "Mobile");
  assert.equal(deviceLabel("tablet"), "Tablet");
  assert.equal(deviceLabel("desktop"), "Desktop");
});

import { niceMax, axisTicks, labelIndexes } from "../src/lib/insights/chart.ts";

test("chart helpers", () => {
  assert.equal(niceMax(0), 4);
  assert.equal(niceMax(3), 4);
  assert.equal(niceMax(7), 8);
  assert.equal(niceMax(23), 40);
  assert.equal(niceMax(45), 80);
  assert.ok(axisTicks(niceMax(45)).every(Number.isInteger));
  assert.equal(niceMax(120), 200);
  assert.equal(niceMax(1000), 1000);
  assert.deepEqual(axisTicks(40), [0, 10, 20, 30, 40]);
  assert.deepEqual(labelIndexes(0), []);
  assert.deepEqual(labelIndexes(5), [0, 1, 2, 3, 4]);
  const idx = labelIndexes(30);
  assert.equal(idx[0], 0);
  assert.equal(idx[idx.length - 1], 29);
  assert.ok(idx.length <= 6);
});

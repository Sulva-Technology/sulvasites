import { test } from "node:test";
import assert from "node:assert/strict";
import { formatNaira, toKobo, platformFeeKobo } from "../src/lib/shop/money.ts";

test("formatNaira whole naira", () => {
  assert.equal(formatNaira(150000), "₦1,500");
  assert.equal(formatNaira(100), "₦1");
});

test("formatNaira kobo remainder uses 2 decimals", () => {
  assert.equal(formatNaira(150050), "₦1,500.50");
  assert.equal(formatNaira(5), "₦0.05");
  assert.equal(formatNaira(199), "₦1.99");
});

test("formatNaira zero and large numbers", () => {
  assert.equal(formatNaira(0), "₦0");
  assert.equal(formatNaira(123456789000), "₦1,234,567,890");
  assert.equal(formatNaira(100000000), "₦1,000,000");
});

test("formatNaira rounds fractional kobo and handles negatives/garbage", () => {
  assert.equal(formatNaira(150000.4), "₦1,500");
  assert.equal(formatNaira(-150050), "-₦1,500.50");
  assert.equal(formatNaira(Number.NaN), "₦0");
});

test("toKobo rounds", () => {
  assert.equal(toKobo(1500), 150000);
  assert.equal(toKobo(19.99), 1999);
  assert.equal(toKobo(0.1 + 0.2), 30);
  assert.equal(toKobo(0), 0);
});

test("platformFeeKobo floors and respects bps bounds", () => {
  assert.equal(platformFeeKobo(10000, 250), 250);
  assert.equal(platformFeeKobo(999, 250), 24);
  assert.equal(platformFeeKobo(10000, 0), 0);
  assert.equal(platformFeeKobo(10000, 10000), 10000);
  assert.equal(platformFeeKobo(10000, -5), 0);
  assert.equal(platformFeeKobo(10000, 20000), 10000);
  assert.equal(platformFeeKobo(0, 250), 0);
});

import { test } from "node:test";
import assert from "node:assert/strict";

import { isBillingReference, newBillingReference } from "../src/lib/billing/reference.ts";
import { addInterval, isBillingWebhook, parseBillingEvent, subscriptionStartDate } from "../src/lib/billing/webhookEvents.ts";

const REF = newBillingReference(Date.parse("2026-11-10T00:00:00Z"), () => 0);

test("billing references", () => {
  assert.match(REF, /^SB-[0-9A-Z]+-AAAAAA$/);
  assert.ok(isBillingReference(REF));
  assert.equal(isBillingReference("SV-ABC123-ABCDEF"), false);
  assert.equal(isBillingReference(null), false);
});

test("routing: billing vs shop", () => {
  assert.ok(isBillingWebhook({ event: "charge.success", data: { reference: REF } }));
  assert.ok(isBillingWebhook({ event: "charge.success", data: { reference: "x", metadata: JSON.stringify({ kind: "subscription" }) } }));
  assert.ok(isBillingWebhook({ event: "invoice.update", data: {} }));
  assert.ok(isBillingWebhook({ event: "subscription.disable", data: {} }));
  assert.equal(isBillingWebhook({ event: "charge.success", data: { reference: "SV-ABC123-ABCDEF" } }), false);
  assert.equal(isBillingWebhook({ event: "transfer.success", data: {} }), false);
  assert.equal(isBillingWebhook(null), false);
});

test("first charge", () => {
  const ev = parseBillingEvent({
    event: "charge.success",
    data: {
      reference: REF, amount: 350000, currency: "NGN",
      customer: { customer_code: "CUS_1", email: "ada@example.com" },
      authorization: { authorization_code: "AUTH_1", reusable: true },
      metadata: { kind: "subscription", siteId: "site-1", planId: "starter-monthly-launch" },
    },
  });
  assert.deepEqual(ev, {
    kind: "first_charge", reference: REF, amountKobo: 350000, currency: "NGN", customerCode: "CUS_1",
    authorizationCode: "AUTH_1", reusable: true, siteId: "site-1", planId: "starter-monthly-launch", email: "ada@example.com",
  });
});

test("subscription lifecycle events", () => {
  assert.deepEqual(
    parseBillingEvent({ event: "invoice.update", data: { paid: true, invoice_code: "INV_1", amount: 700000, subscription: { subscription_code: "SUB_1", next_payment_date: "2026-12-10T00:00:00.000Z" } } }),
    { kind: "invoice_paid", key: "invoice:INV_1", subscriptionCode: "SUB_1", nextPaymentDate: "2026-12-10T00:00:00.000Z", amountKobo: 700000 },
  );
  assert.equal(parseBillingEvent({ event: "invoice.update", data: { paid: false, subscription: { subscription_code: "SUB_1" } } }).kind, "ignore");
  assert.deepEqual(
    parseBillingEvent({ event: "invoice.payment_failed", data: { invoice_code: "INV_2", subscription: { subscription_code: "SUB_1" } } }),
    { kind: "payment_failed", key: "failed:INV_2", subscriptionCode: "SUB_1" },
  );
  assert.deepEqual(parseBillingEvent({ event: "subscription.not_renew", data: { subscription_code: "SUB_1" } }), { kind: "not_renew", key: "not_renew:SUB_1", subscriptionCode: "SUB_1" });
  assert.deepEqual(parseBillingEvent({ event: "subscription.disable", data: { subscription_code: "SUB_1" } }), { kind: "disabled", key: "disable:SUB_1", subscriptionCode: "SUB_1" });
  assert.equal(parseBillingEvent({ event: "subscription.create", data: { subscription_code: "SUB_1" } }).kind, "ignore");
  assert.equal(parseBillingEvent({ event: "charge.success", data: { reference: "nope" } }).kind, "ignore");
});

test("paid period starts after trial or paid time", () => {
  const now = new Date("2026-11-10T00:00:00Z");
  assert.equal(addInterval(now, "monthly").toISOString(), "2026-12-10T00:00:00.000Z");
  assert.equal(addInterval(now, "annually").toISOString(), "2027-11-10T00:00:00.000Z");
  assert.equal(subscriptionStartDate(now, "2026-11-14T00:00:00Z", null, "monthly").toISOString(), "2026-12-14T00:00:00.000Z");
  assert.equal(subscriptionStartDate(now, "2026-11-01T00:00:00Z", null, "monthly").toISOString(), "2026-12-10T00:00:00.000Z");
  assert.equal(subscriptionStartDate(now, null, "2026-11-30T00:00:00Z", "monthly").toISOString(), "2026-12-30T00:00:00.000Z");
});

test("invoice keys stay unique without invoice_code or period_end", () => {
  assert.deepEqual(
    parseBillingEvent({ event: "invoice.update", data: { paid: true, id: 991, amount: 700000, subscription: { subscription_code: "SUB_1" } } }),
    { kind: "invoice_paid", key: "invoice:SUB_1:991", subscriptionCode: "SUB_1", nextPaymentDate: null, amountKobo: 700000 },
  );
  assert.equal(parseBillingEvent({ event: "invoice.payment_failed", data: { subscription: { subscription_code: "SUB_1" } } }).kind, "ignore");
  assert.equal(parseBillingEvent({ event: "invoice.update", data: { status: "success", id: 992, subscription: { subscription_code: "SUB_1" } } }).kind, "invoice_paid");
});

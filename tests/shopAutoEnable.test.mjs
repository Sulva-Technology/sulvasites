import { test } from "node:test";
import assert from "node:assert/strict";

import { ensureShopEnabled, shopEnableWrite, shopOnByDefault } from "../src/lib/shop/autoEnable.ts";

test("online-store templates start with the shop on; others do not", () => {
  assert.equal(shopOnByDefault("t13"), true);
  assert.equal(shopOnByDefault("t14"), true);
  assert.equal(shopOnByDefault("t7"), false);
  assert.equal(shopOnByDefault("t1"), false);
});

test("what to write: missing row is created; an off shop is turned on only when products are added", () => {
  assert.equal(shopEnableWrite(null, "new_site"), "insert");
  assert.equal(shopEnableWrite(null, "products"), "insert");
  assert.equal(shopEnableWrite({ enabled: true }, "products"), null);
  assert.equal(shopEnableWrite({ enabled: false }, "new_site"), null);
  assert.equal(shopEnableWrite({ enabled: false }, "products"), "update");
});

function fakeDb(row, fail = false) {
  const writes = [];
  const chain = (result) => {
    const c = { eq: () => c, maybeSingle: async () => result, then: (r) => r(result) };
    return c;
  };
  return {
    writes,
    from: () => ({
      select: () => chain({ data: row, error: null }),
      insert: async (v) => (writes.push(["insert", v]), { error: fail ? { message: "x" } : null }),
      update: (v) => (writes.push(["update", v]), chain({ error: null })),
    }),
  };
}

test("ensureShopEnabled inserts, updates or leaves alone", async () => {
  let db = fakeDb(null);
  assert.equal(await ensureShopEnabled(db, "s1", "new_site"), true);
  assert.deepEqual(db.writes, [["insert", { site_id: "s1", enabled: true }]]);

  db = fakeDb({ enabled: false });
  assert.equal(await ensureShopEnabled(db, "s1", "products"), true);
  assert.deepEqual(db.writes, [["update", { enabled: true }]]);

  db = fakeDb({ enabled: true });
  assert.equal(await ensureShopEnabled(db, "s1", "products"), true);
  assert.deepEqual(db.writes, []);
});

test("ensureShopEnabled never throws and skips templates without a shop", async () => {
  assert.equal(await ensureShopEnabled(fakeDb(null, true), "s1", "new_site"), false);
  assert.equal(await ensureShopEnabled({ from: () => { throw new Error("boom"); } }, "s1", "products"), false);
  const db = fakeDb(null);
  assert.equal(await ensureShopEnabled(db, "s1", "products", "t1"), false);
  assert.deepEqual(db.writes, []);
});

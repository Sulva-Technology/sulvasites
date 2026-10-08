import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { RESERVED_SLUGS } from "../src/lib/reservedSlugs.ts";
import { SUB_STATUSES } from "../src/lib/billing/subscriptionState.ts";

const sql = readFileSync(new URL("../supabase/migrations/019_billing.sql", import.meta.url), "utf8");

test("every reserved slug is in the DB check constraint", () => {
  const m = sql.match(/sites_slug_not_reserved[\s\S]*?array\[([\s\S]*?)\]/);
  assert.ok(m, "constraint not found");
  const inSql = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
  assert.deepEqual(inSql, [...RESERVED_SLUGS].sort());
});

test("status check matches the TypeScript statuses", () => {
  const m = sql.match(/status text not null check \(status in \(([^)]*)\)\)/);
  assert.ok(m);
  const inSql = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
  assert.deepEqual(inSql, [...SUB_STATUSES].sort());
});

test("RPC is callable by visitors and backfill keeps existing sites manual", () => {
  assert.match(sql, /grant execute on function public\.site_billing_state\(uuid\) to anon, authenticated/);
  assert.match(sql, /'commerce', 'manual'/);
});

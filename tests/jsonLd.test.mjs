import { test } from "node:test";
import assert from "node:assert/strict";

import { serializeJsonLd } from "../src/lib/jsonLd.ts";

test("cannot break out of the script tag", () => {
  const out = serializeJsonLd({ name: "Evil </script><script>alert(1)</script>" });
  assert.ok(!out.includes("<"), out);
});

test("round-trips to the same data", () => {
  const data = { name: "A <b> &   line", n: 1, nested: { ok: true } };
  const out = serializeJsonLd(data);
  assert.ok(!out.includes(" "));
  assert.deepEqual(JSON.parse(out), data);
});

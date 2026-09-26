import { test } from "node:test";
import assert from "node:assert/strict";

import { defaultPageData, isPageKey, validatePageData } from "../src/lib/pageSchema.ts";

test("isPageKey", () => {
  assert.ok(isPageKey("home") && isPageKey("about") && isPageKey("contact"));
  assert.ok(!isPageKey("pricing"));
});

test("default page data is valid for every core page", () => {
  for (const key of ["home", "about", "contact"]) {
    const v = validatePageData(defaultPageData(key));
    assert.ok(v.ok, `${key}: ${v.error}`);
  }
});

test("rejects garbage", () => {
  assert.ok(!validatePageData(null).ok);
  assert.ok(!validatePageData({ sections: "nope" }).ok);
});

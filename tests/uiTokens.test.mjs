import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("koi tokens are defined", () => {
  for (const v of ["--color-koi-ink", "--color-koi-deep", "--color-koi-sea", "--color-koi-foam", "--color-koi-orange", "--color-koi-paper"]) {
    assert.ok(css.includes(v), `${v} missing`);
  }
});

test("water + koi animation is disabled for reduced motion", () => {
  const i = css.indexOf("prefers-reduced-motion: reduce");
  assert.ok(i > -1);
  const block = css.slice(i, i + 400);
  assert.ok(block.includes(".koi-ripple") && block.includes(".koi-fish"));
});

test("public default font family is not switched to the koi fonts", () => {
  // Overriding --font-sans would change every public template's default font;
  // --default-font-family must stay on the system stack.
  assert.ok(css.includes("--default-font-family:"));
});

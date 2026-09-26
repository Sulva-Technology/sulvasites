import { test } from "node:test";
import assert from "node:assert/strict";

import { sanitizeThemeStyle } from "../src/templates/shared/theme.ts";

test("drops legacy dark-theme text/bg overrides, keeps accents", () => {
  const legacy = {
    "--t6-accent": "#22c55e",
    "--t6-ink": "rgba(255, 255, 255, 0.92)",
    "--t6-muted": "rgba(255, 255, 255, 0.66)",
    "--t6-bg": "#070a12",
    "--t6-surface": "rgba(255, 255, 255, 0.06)",
  };
  // White text on the new light default bg would be unreadable → dropped.
  const out = sanitizeThemeStyle({ "--t6-accent": "#22c55e", "--t6-ink": "#ffffff" }, "t6");
  assert.deepEqual(out, { "--t6-accent": "#22c55e" });
  // Full legacy dark set: translucent light ink over dark bg → dropped too (template is light now).
  assert.deepEqual(sanitizeThemeStyle(legacy, "t6"), { "--t6-accent": "#22c55e" });
});

test("keeps readable custom palettes", () => {
  const ok = { "--t3-accent": "#b4532a", "--t3-ink": "#1b1a17", "--t3-bg": "#f4efe7" };
  assert.deepEqual(sanitizeThemeStyle(ok, "t3"), ok);
  assert.equal(sanitizeThemeStyle(undefined, "t3"), undefined);
});

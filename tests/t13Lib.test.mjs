import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesQuery, typewriterStep, typewriterText, litCount, pickMarquee, initials, splitChars } from "../src/templates/template13/lib.ts";

test("matchesQuery: every word must hit name, description or category", () => {
  const p = { name: "Linen co-ord set", description: "Breathable two-piece" };
  assert.equal(matchesQuery(p, "Sets", "linen"), true);
  assert.equal(matchesQuery(p, "Sets", "linen two"), true);
  assert.equal(matchesQuery(p, null, "silk"), false);
  assert.equal(matchesQuery(p, null, "   "), true);
  assert.equal(matchesQuery(p, "Sets", "SETS"), true);
});

test("typewriter types, holds, deletes, then moves to next phrase", () => {
  const phrases = ["ab", "c"];
  let s = { i: 0, len: 0, dir: 1, hold: 0 };
  s = typewriterStep(s, phrases); assert.equal(typewriterText(s, phrases), "a");
  s = typewriterStep(s, phrases); assert.equal(typewriterText(s, phrases), "ab");
  s = typewriterStep(s, phrases); assert.equal(typewriterText(s, phrases), "ab"); // holding
  let guard = 0;
  while (s.i !== 1 && guard++ < 100) s = typewriterStep(s, phrases); // finish hold, delete, advance
  assert.equal(s.i, 1);
  assert.equal(s.len, 0);
  assert.ok(guard < 100);
});

test("typewriter survives an empty list", () => {
  const s = typewriterStep({ i: 0, len: 0, dir: 1, hold: 0 }, []);
  assert.equal(typewriterText(s, []), "");
});

test("litCount clamps and rounds", () => {
  assert.equal(litCount(-1, 10), 0);
  assert.equal(litCount(0.5, 10), 5);
  assert.equal(litCount(2, 10), 10);
});

test("pickMarquee puts featured first and repeats to reach the minimum", () => {
  const items = [{ id: "a", featured: false }, { id: "b", featured: true }, { id: "c", featured: false }];
  const out = pickMarquee(items, 8);
  assert.equal(out[0].id, "b");
  assert.ok(out.length >= 8);
  assert.deepEqual(pickMarquee([], 8), []);
});

test("initials and splitChars", () => {
  assert.equal(initials("Ada Obi"), "AO");
  assert.equal(initials("  zara "), "Z");
  assert.equal(initials(""), "·");
  assert.deepEqual(splitChars("a b"), ["a", " ", "b"]);
});

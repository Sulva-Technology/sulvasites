import { test } from "node:test";
import assert from "node:assert/strict";

import { GroqError, extractJson, groqChat } from "../src/lib/ai/groq.server.ts";

const ok = (text) =>
  new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
const status = (code, body = "", headers = {}) => new Response(body, { status: code, headers });

function harness(responses, env = { GROQ_API_KEY: "k" }) {
  const calls = [];
  const sleeps = [];
  const queue = [...responses];
  return {
    calls,
    sleeps,
    deps: {
      env,
      sleep: async (ms) => void sleeps.push(ms),
      fetch: async (_url, init) => {
        calls.push(JSON.parse(init.body));
        const next = queue.shift();
        if (!next) throw new Error("no more responses");
        return next;
      },
    },
  };
}

test("missing key throws not_configured", async () => {
  const h = harness([], {});
  await assert.rejects(groqChat({ user: "hi" }, h.deps), (e) => e.code === "not_configured");
  assert.equal(h.calls.length, 0);
});

test("returns text on success and sets json mode", async () => {
  const h = harness([ok("hello")]);
  assert.equal(await groqChat({ user: "hi", json: true, system: "s" }, h.deps), "hello");
  assert.deepEqual(h.calls[0].response_format, { type: "json_object" });
  assert.equal(h.calls[0].messages[0].role, "system");
});

test("retries a 429 on the same model, honouring retry-after", async () => {
  const h = harness([status(429, "", { "retry-after": "2" }), ok("fine")]);
  assert.equal(await groqChat({ user: "hi" }, h.deps), "fine");
  assert.equal(h.calls[0].model, h.calls[1].model);
  assert.deepEqual(h.sleeps, [2000]);
});

test("falls back to the second model after retries are exhausted", async () => {
  const h = harness([status(500), status(500), ok("from fallback")], {
    GROQ_API_KEY: "k",
    GROQ_MODEL: "primary",
    GROQ_FALLBACK_MODEL: "backup",
  });
  assert.equal(await groqChat({ user: "hi" }, h.deps), "from fallback");
  assert.deepEqual(h.calls.map((c) => c.model), ["primary", "primary", "backup"]);
});

test("401 does not retry or fall back", async () => {
  const h = harness([status(401, "nope")]);
  await assert.rejects(groqChat({ user: "hi" }, h.deps), (e) => e instanceof GroqError && e.code === "bad_key");
  assert.equal(h.calls.length, 1);
});

test("rate limited everywhere surfaces rate_limited", async () => {
  const h = harness([status(429), status(429), status(429), status(429)]);
  await assert.rejects(groqChat({ user: "hi" }, h.deps), (e) => e.code === "rate_limited");
  assert.equal(h.calls.length, 4);
});

test("reasoning_effort only sent to gpt-oss models", async () => {
  const h = harness([status(500), status(500), ok("x")], {
    GROQ_API_KEY: "k",
    GROQ_MODEL: "openai/gpt-oss-120b",
    GROQ_FALLBACK_MODEL: "llama-3.3-70b-versatile",
  });
  await groqChat({ user: "hi", reasoningEffort: "low" }, h.deps);
  assert.equal(h.calls[0].reasoning_effort, "low");
  assert.equal(h.calls[2].reasoning_effort, undefined);
});

test("extractJson strips fences and surrounding text", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Sure! {"a":{"b":2}} done'), { a: { b: 2 } });
  assert.throws(() => extractJson("no json here"), SyntaxError);
});

import { test } from "node:test";
import assert from "node:assert/strict";

import { GroqError } from "../src/lib/ai/groq.server.ts";
import { aiChat, aiChatWithInfo } from "../src/lib/ai/llm.server.ts";
import {
  DEFAULT_OPENROUTER_FALLBACK_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  openRouterBody,
  openRouterChat,
} from "../src/lib/ai/openrouter.server.ts";

function ok(text) {
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
}

/** Fake fetch: answers in order, records each call's url and body. */
function harness(env, ...answers) {
  const calls = [];
  return {
    calls,
    deps: {
      env,
      sleep: async () => {},
      fetch: async (url, init) => {
        calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
        const a = answers.shift();
        if (typeof a === "function") return a(init);
        return a ?? ok("default");
      },
    },
  };
}

test("body: default free Inkling, hidden reasoning, JSON mode", () => {
  const b = openRouterBody(DEFAULT_OPENROUTER_MODEL, { system: "s", user: "u", json: true, reasoningEffort: "low", maxTokens: 999 });
  assert.equal(b.model, "thinkingmachines/inkling:free");
  assert.equal(b.models, undefined);
  assert.equal(b.provider, undefined);
  assert.deepEqual(b.reasoning, { effort: "low", exclude: true });
  assert.deepEqual(b.response_format, { type: "json_object" });
  assert.equal(b.max_tokens, 999);
  assert.deepEqual(b.messages.map((m) => m.role), ["system", "user"]);
});

test("body: a paid model routes to no-logging providers only; :free is not restricted", () => {
  assert.deepEqual(openRouterBody("nvidia/nemotron-3-ultra-550b-a55b", { user: "u" }).provider, { data_collection: "deny" });
  assert.equal(openRouterBody("nvidia/nemotron-3-ultra-550b-a55b:free", { user: "u" }).provider, undefined);
});

test("OpenRouter is used first when its key is set", async () => {
  const h = harness({ OPENROUTER_API_KEY: "or", GROQ_API_KEY: "g" }, ok("from openrouter"));
  const r = await aiChatWithInfo({ user: "hi" }, h.deps);
  assert.deepEqual(r, { text: "from openrouter", provider: "openrouter", model: DEFAULT_OPENROUTER_MODEL });
  assert.match(h.calls[0].url, /openrouter\.ai/);
  assert.equal(h.calls[0].headers.Authorization, "Bearer or");
});

test("Nemotron Ultra is OpenRouter's own fallback for text; OPENROUTER_FALLBACK_MODEL=off removes it", async () => {
  const h = harness({ OPENROUTER_API_KEY: "or" }, ok("x"));
  await aiChat({ user: "hi" }, h.deps);
  assert.deepEqual(h.calls[0].body.models, ["thinkingmachines/inkling:free", DEFAULT_OPENROUTER_FALLBACK_MODEL]);
  assert.equal(h.calls[0].body.provider, undefined);
  const h2 = harness({ OPENROUTER_API_KEY: "or", OPENROUTER_FALLBACK_MODEL: "off" }, ok("x"));
  await aiChat({ user: "hi" }, h2.deps);
  assert.equal(h2.calls[0].body.models, undefined);
});

test("OPENROUTER_MODEL overrides the model", async () => {
  const h = harness({ OPENROUTER_API_KEY: "or", OPENROUTER_MODEL: "nvidia/nemotron-3.5-lightning" }, ok("x"));
  await aiChat({ user: "hi" }, h.deps);
  assert.equal(h.calls[0].body.model, "nvidia/nemotron-3.5-lightning");
});

test("falls back to Groq when OpenRouter fails", async () => {
  const h = harness(
    { OPENROUTER_API_KEY: "or", GROQ_API_KEY: "g" },
    new Response("down", { status: 503 }),
    new Response("down", { status: 503 }),
    ok("from groq"),
  );
  const r = await aiChatWithInfo({ user: "hi" }, h.deps);
  assert.equal(r.provider, "groq");
  assert.equal(r.text, "from groq");
  assert.match(h.calls[2].url, /groq\.com/);
});

test("no credit or bad key: no retry, straight to Groq", async () => {
  const h = harness({ OPENROUTER_API_KEY: "or", GROQ_API_KEY: "g" }, new Response("pay", { status: 402 }), ok("from groq"));
  assert.equal(await aiChat({ user: "hi" }, h.deps), "from groq");
  assert.equal(h.calls.length, 2);
});

test("without Groq, OpenRouter errors surface with the existing error codes", async () => {
  const h = harness({ OPENROUTER_API_KEY: "or" }, new Response("slow down", { status: 429 }), new Response("slow down", { status: 429 }));
  await assert.rejects(aiChat({ user: "hi" }, h.deps), (e) => e instanceof GroqError && e.code === "rate_limited");
  const h2 = harness({ OPENROUTER_API_KEY: "bad" }, new Response("no", { status: 401 }));
  await assert.rejects(openRouterChat({ user: "hi" }, h2.deps), (e) => e.code === "bad_key");
});

test("a slow answer is abandoned so the Groq fallback has time to answer", async () => {
  const hang = (init) =>
    new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));
  const h = harness({ OPENROUTER_API_KEY: "or", GROQ_API_KEY: "g", OPENROUTER_TIMEOUT_MS: "30" }, hang, ok("from groq"));
  const r = await aiChatWithInfo({ user: "hi" }, h.deps);
  assert.equal(r.provider, "groq");
  assert.equal(h.calls.length, 2, "timeout is not retried on OpenRouter");
});

test("empty answer is retried once", async () => {
  const h = harness({ OPENROUTER_API_KEY: "or" }, ok(""), ok("second try"));
  assert.equal(await aiChat({ user: "hi" }, h.deps), "second try");
});

test("no OpenRouter key: plain Groq as before", async () => {
  const h = harness({ GROQ_API_KEY: "g" }, ok("groq"));
  const r = await aiChatWithInfo({ user: "hi" }, h.deps);
  assert.equal(r.provider, "groq");
  assert.match(h.calls[0].url, /groq\.com/);
});

test("no keys at all: a clear 'not configured' error naming OpenRouter", async () => {
  const h = harness({});
  await assert.rejects(
    aiChat({ user: "hi" }, h.deps),
    (e) => e.code === "not_configured" && /OPENROUTER_API_KEY/.test(e.message) && /GEMINI_API_KEY/.test(e.message),
  );
});

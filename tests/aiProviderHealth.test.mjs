import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";

import { GroqError } from "../src/lib/ai/groq.server.ts";
import { aiChatWithInfo } from "../src/lib/ai/llm.server.ts";
import {
  cooldownMsFor,
  isCooling,
  noteFailure,
  noteSuccess,
  resetProviderHealth,
} from "../src/lib/ai/providerHealth.ts";

beforeEach(() => resetProviderHealth());

const openai = (text) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
const tooMany = () => new Response("quota", { status: 429 });

function harness(env, ...answers) {
  const urls = [];
  return {
    urls,
    deps: {
      env,
      sleep: async () => {},
      fetch: async (url) => {
        urls.push(String(url));
        return answers.shift() ?? openai("default");
      },
    },
  };
}

test("cooldown: rate limits wait the advertised time, capped at 5 minutes", () => {
  assert.equal(cooldownMsFor(new GroqError("rate_limited", "x", 429, "Please try again in 12.5s")), 12500);
  assert.equal(cooldownMsFor(new GroqError("rate_limited", "x", 429)), 30000);
  assert.equal(cooldownMsFor(new GroqError("rate_limited", "x", 429, "try again in 9999s")), 300000);
});

test("cooldown: timeouts, server errors and network errors cool for 10s; bad requests do not", () => {
  assert.equal(cooldownMsFor(new GroqError("upstream", "x", 408)), 10000);
  assert.equal(cooldownMsFor(new GroqError("upstream", "x", 503)), 10000);
  assert.equal(cooldownMsFor(new GroqError("upstream", "x", 0)), 10000);
  assert.equal(cooldownMsFor(new TypeError("fetch failed")), 10000);
  assert.equal(cooldownMsFor(new GroqError("upstream", "x", 400)), 0);
  assert.equal(cooldownMsFor(new GroqError("bad_key", "x", 401)), 0);
  assert.equal(cooldownMsFor(new GroqError("empty", "x", 200)), 0);
});

test("noteFailure / isCooling / noteSuccess", () => {
  noteFailure("gemini", new GroqError("rate_limited", "x", 429), 1000);
  assert.equal(isCooling("gemini", 1000 + 29999), true);
  assert.equal(isCooling("gemini", 1000 + 30000), false);
  noteSuccess("gemini");
  assert.equal(isCooling("gemini", 1001), false);
  assert.equal(isCooling("groq", 1001), false);
});

test("a provider that just hit its quota is skipped on the next request", async () => {
  const env = { GEMINI_API_KEY: "g", GROQ_API_KEY: "q" };
  const first = harness(env, tooMany(), openai("from groq"));
  assert.equal((await aiChatWithInfo({ user: "hi" }, first.deps)).provider, "groq");
  assert.match(first.urls[0], /generativelanguage/);

  const second = harness(env, openai("groq again"));
  const r = await aiChatWithInfo({ user: "hi" }, second.deps);
  assert.equal(r.provider, "groq");
  assert.equal(second.urls.length, 1);
  assert.match(second.urls[0], /api\.groq\.com/);
});

test("when every provider is cooling, they are all tried anyway", async () => {
  const env = { GEMINI_API_KEY: "g" };
  noteFailure("gemini", new GroqError("rate_limited", "x", 429));
  const h = harness(env, new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), { status: 200 }));
  const r = await aiChatWithInfo({ user: "hi" }, h.deps);
  assert.equal(r.text, "ok");
  assert.equal(isCooling("gemini"), false);
});

test("Groq failures are recorded too", async () => {
  const env = { GROQ_API_KEY: "q" };
  const h = harness(env, tooMany(), tooMany(), tooMany(), tooMany());
  await assert.rejects(aiChatWithInfo({ user: "hi" }, h.deps));
  assert.equal(isCooling("groq"), true);
});

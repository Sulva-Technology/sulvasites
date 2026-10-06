import { test } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_GEMINI_MODEL, geminiBody, geminiChat } from "../src/lib/ai/gemini.server.ts";
import { GroqError } from "../src/lib/ai/groq.server.ts";
import { aiChat, aiChatWithInfo, aiVisionChat, visionConfigured } from "../src/lib/ai/llm.server.ts";
import { pickWithVision } from "../src/lib/ai/productImages.server.ts";

const gemini = (text, extra = {}) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "thinking...", thought: true }, { text }] } }], ...extra }), { status: 200 });
const openai = (text) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
const hang = (init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));

/** Fake fetch: answers in order, records each call's url, body and headers. */
function harness(env, ...answers) {
  const calls = [];
  return {
    calls,
    deps: {
      env,
      sleep: async () => {},
      fetch: async (url, init = {}) => {
        calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null, headers: init.headers ?? {} });
        const a = answers.shift();
        if (typeof a === "function") return a(init);
        return a ?? openai("default");
      },
    },
  };
}

test("body: system instruction, JSON mode, thinking level, token budget", () => {
  const b = geminiBody({ system: "s", user: "u", json: true, reasoningEffort: "high", maxTokens: 999, temperature: 0.2 });
  assert.deepEqual(b.systemInstruction, { parts: [{ text: "s" }] });
  assert.deepEqual(b.contents, [{ role: "user", parts: [{ text: "u" }] }]);
  assert.deepEqual(b.generationConfig, {
    temperature: 0.2,
    maxOutputTokens: 999,
    responseMimeType: "application/json",
    thinkingConfig: { thinkingLevel: "high" },
  });
  assert.equal(geminiBody({ user: "u" }).generationConfig.thinkingConfig, undefined);
  assert.equal(geminiBody({ user: "u" }).systemInstruction, undefined);
});

test("Gemini answers first when its key is set; the key goes in a header, thoughts are dropped", async () => {
  const h = harness({ GEMINI_API_KEY: "gk", OPENROUTER_API_KEY: "or", GROQ_API_KEY: "g" }, gemini("from gemini"));
  const r = await aiChatWithInfo({ user: "hi" }, h.deps);
  assert.deepEqual(r, { text: "from gemini", provider: "gemini", model: DEFAULT_GEMINI_MODEL });
  assert.equal(h.calls.length, 1);
  assert.match(h.calls[0].url, /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.8-flash:generateContent$/);
  assert.equal(h.calls[0].headers["x-goog-api-key"], "gk");
  assert.doesNotMatch(h.calls[0].url, /key=/);
});

test("GEMINI_MODEL overrides the model", async () => {
  const h = harness({ GEMINI_API_KEY: "gk", GEMINI_MODEL: "gemini-3.5-flash-lite" }, gemini("x"));
  await aiChat({ user: "hi" }, h.deps);
  assert.match(h.calls[0].url, /models\/gemini-3\.5-flash-lite:generateContent/);
});

test("Gemini out of quota: straight on to OpenRouter, no waiting or retry", async () => {
  const h = harness({ GEMINI_API_KEY: "gk", OPENROUTER_API_KEY: "or", GROQ_API_KEY: "g" }, new Response("quota", { status: 429 }), openai("from openrouter"));
  const r = await aiChatWithInfo({ user: "hi" }, h.deps);
  assert.equal(r.provider, "openrouter");
  assert.equal(h.calls.length, 2);
  assert.match(h.calls[1].url, /openrouter\.ai/);
});

test("Gemini and OpenRouter both down: Groq answers", async () => {
  const h = harness(
    { GEMINI_API_KEY: "gk", OPENROUTER_API_KEY: "or", GROQ_API_KEY: "g" },
    new Response("bad key", { status: 400, statusText: "API_KEY_INVALID" }),
    new Response("pay", { status: 402 }),
    openai("from groq"),
  );
  const r = await aiChatWithInfo({ user: "hi" }, h.deps);
  assert.equal(r.provider, "groq");
  assert.match(h.calls[2].url, /groq\.com/);
});

test("Gemini alone: its own errors surface with the shared error codes", async () => {
  const h = harness({ GEMINI_API_KEY: "gk" }, new Response("quota", { status: 429 }));
  await assert.rejects(aiChat({ user: "hi" }, h.deps), (e) => e instanceof GroqError && e.code === "rate_limited");
  const h2 = harness({ GEMINI_API_KEY: "gk" }, new Response('{"error":{"status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}', { status: 400 }));
  await assert.rejects(geminiChat({ user: "hi" }, h2.deps), (e) => e.code === "bad_key");
});

test("server errors and empty answers are retried once", async () => {
  const h = harness({ GEMINI_API_KEY: "gk" }, new Response("oops", { status: 503 }), gemini("second try"));
  assert.equal(await aiChat({ user: "hi" }, h.deps), "second try");
  const h2 = harness({ GEMINI_API_KEY: "gk" }, gemini(""), gemini("filled"));
  assert.equal(await aiChat({ user: "hi" }, h2.deps), "filled");
});

test("a model that rejects the thinking level is asked again without it", async () => {
  const h = harness({ GEMINI_API_KEY: "gk" }, new Response("thinking_level is not supported for this model", { status: 400 }), gemini("ok"));
  assert.equal(await aiChat({ user: "hi", reasoningEffort: "medium" }, h.deps), "ok");
  assert.deepEqual(h.calls[0].body.generationConfig.thinkingConfig, { thinkingLevel: "medium" });
  assert.equal(h.calls[1].body.generationConfig.thinkingConfig, undefined);
});

test("a blocked prompt is not retried", async () => {
  const h = harness({ GEMINI_API_KEY: "gk", GROQ_API_KEY: "g" }, gemini("", { promptFeedback: { blockReason: "SAFETY" } }), openai("from groq"));
  const r = await aiChatWithInfo({ user: "hi" }, h.deps);
  assert.equal(r.provider, "groq");
  assert.equal(h.calls.length, 2);
});

test("a slow Gemini is abandoned in time for OpenRouter to answer", async () => {
  const h = harness({ GEMINI_API_KEY: "gk", GEMINI_TIMEOUT_MS: "30", OPENROUTER_API_KEY: "or" }, hang, openai("from openrouter"));
  const r = await aiChatWithInfo({ user: "hi", timeoutMs: 10_000 }, h.deps);
  assert.equal(r.provider, "openrouter");
  assert.equal(h.calls.length, 2, "the timeout is not retried on Gemini");
});

test("AI_PROVIDERS puts OpenRouter first", async () => {
  const h = harness({ GEMINI_API_KEY: "gk", OPENROUTER_API_KEY: "or", AI_PROVIDERS: "openrouter,gemini" }, new Response("down", { status: 503 }), new Response("down", { status: 503 }), gemini("from gemini"));
  const r = await aiChatWithInfo({ user: "hi" }, h.deps);
  assert.equal(r.provider, "gemini");
  assert.match(h.calls[0].url, /openrouter\.ai/);
});

test("vision: Gemini sees photos inline, downloading https ones", async () => {
  const png = Buffer.from("fake-png");
  const h = harness(
    { GEMINI_API_KEY: "gk" },
    new Response(png, { status: 200, headers: { "content-type": "image/png" } }),
    gemini('{"ok":true}'),
  );
  const text = await aiVisionChat({ user: "look", images: ["https://img.example/a.png", "data:image/jpeg;base64,QUJD"] }, h.deps);
  assert.equal(text, '{"ok":true}');
  const parts = h.calls[1].body.contents[0].parts;
  assert.deepEqual(parts, [
    { text: "look" },
    { inlineData: { mimeType: "image/png", data: png.toString("base64") } },
    { inlineData: { mimeType: "image/jpeg", data: "QUJD" } },
  ]);
});

test("vision: Gemini failing hands the photos to OpenRouter's vision model", async () => {
  const h = harness({ GEMINI_API_KEY: "gk", OPENROUTER_API_KEY: "or" }, new Response("quota", { status: 429 }), openai("seen"));
  assert.equal(await aiVisionChat({ user: "look", images: ["data:image/jpeg;base64,QUJD"], timeoutMs: 5000 }, h.deps), "seen");
  assert.equal(h.calls[1].body.model, "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free");
});

test("vision is on with only a Gemini key, and off with AI_VISION=off", async () => {
  assert.equal(visionConfigured({ GEMINI_API_KEY: "gk" }), true);
  assert.equal(visionConfigured({ GEMINI_API_KEY: "gk", AI_VISION: "off" }), false);
  assert.equal(visionConfigured({ GROQ_API_KEY: "g" }), false);
  const cands = [1, 2].map((n) => ({ url: `https://images.pexels.com/${n}.jpg`, thumb: `data:image/jpeg;base64,QQ${n}`, alt: "", credit: null, source: "pexels", why: null }));
  const h = harness({ GEMINI_API_KEY: "gk" }, gemini(JSON.stringify({ picks: [{ image: 2, why: "Shows the bag" }] })));
  const out = await pickWithVision({ name: "Bag", description: "", query: "bag" }, cands, h.deps);
  assert.deepEqual(out.map((c) => c.url), [cands[1].url]);
});

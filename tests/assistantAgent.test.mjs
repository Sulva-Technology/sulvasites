// The "Ask AI" agent layer: tool registry, both answer paths, the tool loop, provider plumbing,
// attachments and owner-facing errors.
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";

import { cleanAttachments, guessAttachmentKind, attachmentUrlPrefix } from "../src/lib/ai/agent/attachments.ts";
import { friendlyError, GENERIC_ERROR } from "../src/lib/ai/agent/friendlyErrors.ts";
import { runToolLoop } from "../src/lib/ai/agent/loop.ts";
import { openAiMessages, openAiToolBody, parseOpenAiToolTurn } from "../src/lib/ai/agent/openaiTools.ts";
import { buildAgentPrompt } from "../src/lib/ai/agent/prompt.ts";
import { READ_TOOLS, readToolSpecs, runReadTool } from "../src/lib/ai/agent/readTools.ts";
import { runAssistantTurn } from "../src/lib/ai/agent/run.server.ts";
import { ProposalCollector, WRITE_TOOLS, jsonActionShape, parseAssistantOutput, writeToolSpecs } from "../src/lib/ai/agent/writeTools.ts";
import { aiChatWithInfo, aiToolChat, assistantSeesImages, taskModel, toolCallingModel } from "../src/lib/ai/llm.server.ts";
import { resetProviderHealth } from "../src/lib/ai/providerHealth.ts";
import { CASES, fixtureSite } from "./eval/assistantCases.mjs";

beforeEach(() => resetProviderHealth());

const SITE = "11111111-2222-3333-4444-555555555555";
const SUPA = "https://proj.supabase.co";
const OR_ENV = { OPENROUTER_API_KEY: "k", AI_MODEL_ASSISTANT: "openrouter:anthropic/claude-test" };

const readEnv = (snapshot = fixtureSite(), traffic = async () => null) => ({ snapshot, traffic });

// ---------- registry ----------

test("every proposal type has exactly one write tool with a sane schema", () => {
  const names = Object.keys(WRITE_TOOLS);
  assert.deepEqual(
    names.sort(),
    ["add_blog_post", "add_page", "add_product", "add_section", "edit_section", "move_section", "remove_section", "set_seo", "set_stock", "update_product", "update_profile"],
  );
  for (const [key, tool] of Object.entries(WRITE_TOOLS)) {
    assert.equal(tool.name, key);
    assert.equal(tool.parameters.type, "object");
    for (const r of tool.parameters.required ?? []) assert.ok(r in tool.parameters.properties, `${key} requires unknown ${r}`);
    assert.ok(tool.description.length > 10);
    assert.match(tool.jsonShape, new RegExp(`"type": "${key}"`));
  }
  const reads = readToolSpecs().map((t) => t.name);
  for (const r of reads) assert.ok(!names.includes(r), `${r} is both a read and a write tool`);
  assert.equal(writeToolSpecs().length, names.length);
});

test("the JSON shape lists every write tool", () => {
  const shape = jsonActionShape();
  for (const name of Object.keys(WRITE_TOOLS)) assert.match(shape, new RegExp(`"type": "${name}"`));
});

test("the JSON path and tool calls produce identical proposals", () => {
  const snap = fixtureSite();
  const said = "change our phone number to 0803 555 1234";
  const json = parseAssistantOutput({ reply: "ok", actions: [{ type: "update_profile", fields: { phone: "0803 555 1234" } }] }, snap, said);
  const collector = new ProposalCollector(snap, said);
  const r = collector.propose("update_profile", { fields: { phone: "0803 555 1234" } });
  assert.ok(r.ok);
  assert.deepEqual(collector.result("ok").actions, json.actions);
});

test("collector rejects unknown tools, invented details and duplicate edits with a reason", () => {
  const c = new ProposalCollector(fixtureSite(), "update our phone please");
  const unknown = c.propose("delete_site", {});
  assert.equal(unknown.ok, false);
  // A number nobody typed (e.g. copied from a visitor's message) is never proposed.
  const invented = c.propose("update_profile", { fields: { phone: "0700 000 0000" } });
  assert.equal(invented.ok, false);
  assert.match(invented.reason, /did not give/);
  const first = c.propose("remove_section", { page: "home", section: 2 });
  assert.ok(first.ok);
  assert.equal(c.propose("remove_section", { page: "home", section: 2 }).ok, false);
});

test("collector caps site changes per answer", () => {
  const c = new ProposalCollector(fixtureSite(), "");
  let made = 0;
  for (let i = 0; i < 9; i++) if (c.propose("add_page", { name: `Page ${i}` }).ok) made++;
  assert.equal(made, 6);
  assert.match(c.propose("add_page", { name: "One more" }).reason, /as many changes as one answer/);
});

// ---------- read tools ----------

test("get_page reads one page in full and names the pages when the key is wrong", async () => {
  const env = readEnv();
  assert.match(await runReadTool("get_page", { page: "about" }, env), /Our story/);
  assert.match(await runReadTool("get_page", { page: "nope" }, env), /Pages: home, about, contact, menu/);
});

test("get_traffic asks for the requested window and survives a failing loader", async () => {
  const asked = [];
  const env = readEnv(fixtureSite(), async (days) => {
    asked.push(days);
    return null;
  });
  assert.match(await runReadTool("get_traffic", { days: 7 }, env), /not available/);
  await runReadTool("get_traffic", { days: 12 }, env);
  assert.deepEqual(asked, [7, 30]);
  const broken = readEnv(fixtureSite(), async () => {
    throw new Error("db down");
  });
  assert.match(await runReadTool("get_traffic", {}, broken), /could not be loaded/);
  assert.ok(READ_TOOLS.get_traffic.preload === "always");
});

// ---------- the tool loop ----------

function scriptedChat(turns) {
  const seen = [];
  const chat = async (req) => {
    seen.push({ ...req, messages: [...req.messages] });
    const next = turns.shift();
    if (next instanceof Error) throw next;
    return next ?? { text: "Done.", calls: [] };
  };
  return { chat, seen };
}

const userTurn = { role: "user", content: "make the about page shorter" };

test("loop: reads run at once, writes become proposals, then the model replies", async () => {
  const snap = fixtureSite();
  const collector = new ProposalCollector(snap, "make the about page shorter");
  const { chat, seen } = scriptedChat([
    { text: "", calls: [{ id: "c1", name: "get_page", args: { page: "about" } }] },
    { text: "", calls: [{ id: "c2", name: "edit_section", args: { page: "about", section: 0, content: { headline: "A family kitchen in Lekki", subtext: "Cooking for neighbours and parties." } } }] },
    { text: "I've drafted a shorter about page. Review and apply it.", calls: [] },
  ]);
  const out = await runToolLoop({ user: userTurn, collector, readEnv: readEnv(snap), chat, deadline: Date.now() + 60_000 });
  assert.equal(out.steps, 3);
  assert.deepEqual(out.reads, ["get_page"]);
  assert.equal(collector.actions.length, 1);
  assert.equal(collector.actions[0].type, "edit_section");
  // Read results go back delimited as data; proposals are acknowledged, not applied.
  const toolMsgs = seen[2].messages.filter((m) => m.role === "tool");
  assert.match(toolMsgs[0].content, /OWNER_DATA label="result of get_page"/);
  assert.match(toolMsgs[1].content, /Proposed as change a1.*not applied yet/);
  assert.match(out.reply, /shorter about page/);
});

test("loop: the last allowed step must answer in text", async () => {
  const collector = new ProposalCollector(fixtureSite(), "");
  const again = { text: "", calls: [{ id: "x", name: "get_page", args: { page: "home" } }] };
  const { chat, seen } = scriptedChat([again, again, { text: "Here is what I found.", calls: [again.calls[0]] }]);
  const out = await runToolLoop({ user: userTurn, collector, readEnv: readEnv(), chat, deadline: Date.now() + 60_000, maxSteps: 3 });
  assert.equal(seen.length, 3);
  assert.equal(seen[2].final, true);
  assert.equal(out.stopped, "steps");
  assert.equal(out.reply, "Here is what I found.");
});

test("loop: stops before the deadline and keeps proposals when a later turn fails", async () => {
  const collector = new ProposalCollector(fixtureSite(), "");
  const late = await runToolLoop({ user: userTurn, collector, readEnv: readEnv(), chat: scriptedChat([]).chat, deadline: Date.now() + 1000 });
  assert.equal(late.stopped, "time");
  assert.equal(late.steps, 0);

  await assert.rejects(() =>
    runToolLoop({ user: userTurn, collector, readEnv: readEnv(), chat: scriptedChat([new Error("down")]).chat, deadline: Date.now() + 60_000 }),
  );

  const c2 = new ProposalCollector(fixtureSite(), "");
  const { chat } = scriptedChat([{ text: "", calls: [{ id: "a", name: "remove_section", args: { page: "home", section: 3 } }] }, new Error("down")]);
  const kept = await runToolLoop({ user: userTurn, collector: c2, readEnv: readEnv(), chat, deadline: Date.now() + 60_000 });
  assert.equal(kept.stopped, "error");
  assert.equal(c2.actions.length, 1);
});

test("loop: unknown tools get a note, not a crash", async () => {
  const collector = new ProposalCollector(fixtureSite(), "");
  const { chat, seen } = scriptedChat([{ text: "", calls: [{ id: "z", name: "drop_tables", args: {} }] }, { text: "ok", calls: [] }]);
  await runToolLoop({ user: userTurn, collector, readEnv: readEnv(), chat, deadline: Date.now() + 60_000 });
  assert.match(seen[1].messages.at(-1).content, /no tool called "drop_tables"/);
  assert.equal(collector.actions.length, 0);
});

test("tool prompt: compact pages, tool rules, visitor-text rule, delimited request", () => {
  const { system, user } = buildAgentPrompt({
    snapshot: fixtureSite(),
    messages: [{ role: "user", content: "here is my logo" }],
    attachments: [{ kind: "logo" }],
  });
  assert.match(system, /calling its change tool/);
  assert.match(system, /written by website visitors or customers/);
  assert.match(system, /Ask ONE short clarifying question/);
  assert.match(system, /call get_traffic/);
  assert.doesNotMatch(system, /ONE valid JSON object/);
  assert.match(user, /1\. logo/);
  assert.match(user, /OWNER_DATA label="request"/);
});

// ---------- OpenAI-format tool calling ----------

test("tool body: auto tool choice, no custom temperature, private routing for paid models", () => {
  const req = { system: "s", messages: [{ role: "user", content: "hi", images: ["https://x/logo.png"] }], tools: writeToolSpecs() };
  const b = openAiToolBody("anthropic/claude-test", req);
  assert.equal(b.tool_choice, "auto");
  assert.equal(b.temperature, undefined);
  assert.deepEqual(b.provider, { data_collection: "deny" });
  assert.equal(b.tools[0].type, "function");
  assert.equal(b.messages[1].content[1].image_url.url, "https://x/logo.png");
  assert.equal(openAiToolBody("m", { ...req, final: true }).tool_choice, "none");
  assert.equal(openAiToolBody("m:free", req).provider, undefined);
});

test("tool messages round-trip calls, results and reasoning details", () => {
  const msgs = openAiMessages("sys", [
    { role: "user", content: "u" },
    { role: "assistant", content: "", calls: [{ id: "c1", name: "get_page", args: { page: "home" } }], providerData: { reasoning_details: [{ t: 1 }] } },
    { role: "tool", callId: "c1", name: "get_page", content: "data" },
  ]);
  assert.equal(msgs[2].content, null);
  assert.equal(msgs[2].tool_calls[0].function.arguments, '{"page":"home"}');
  assert.deepEqual(msgs[2].reasoning_details, [{ t: 1 }]);
  assert.deepEqual(msgs[3], { role: "tool", tool_call_id: "c1", content: "data" });
});

test("tool turn parsing: calls, broken arguments, cut-off answers", () => {
  const turn = parseOpenAiToolTurn({
    choices: [
      {
        finish_reason: "length",
        message: {
          content: [{ type: "text", text: " Checking " }],
          tool_calls: [
            { id: "c1", function: { name: "get_page", arguments: '{"page":"about"}' } },
            { function: { name: "set_seo", arguments: "{not json" } },
            { function: {} },
          ],
          reasoning_details: [{ r: 1 }],
        },
      },
    ],
  });
  assert.equal(turn.text, "Checking");
  assert.deepEqual(turn.calls, [
    { id: "c1", name: "get_page", args: { page: "about" } },
    { id: "call_2", name: "set_seo", args: {} },
  ]);
  assert.equal(turn.truncated, true);
  assert.deepEqual(turn.providerData, { reasoning_details: [{ r: 1 }] });
  assert.equal(parseOpenAiToolTurn({}), null);
});

// ---------- model routing ----------

test("per-task models come from env and need their provider's key", () => {
  assert.deepEqual(taskModel("assistant", OR_ENV), { provider: "openrouter", model: "anthropic/claude-test" });
  assert.deepEqual(taskModel("assistant", { OPENROUTER_API_KEY: "k", AI_MODEL_ASSISTANT: "openai/gpt-x" }), { provider: "openrouter", model: "openai/gpt-x" });
  assert.deepEqual(taskModel("small", { GEMINI_API_KEY: "g", AI_MODEL_SMALL: "gemini:gemini-small" }), { provider: "gemini", model: "gemini-small" });
  assert.equal(taskModel("assistant", { AI_MODEL_ASSISTANT: "openrouter:x" }), null);
  assert.equal(taskModel("assistant", {}), null);
  assert.deepEqual(toolCallingModel(OR_ENV), { provider: "openrouter", model: "anthropic/claude-test" });
  assert.equal(toolCallingModel({ ...OR_ENV, AI_ASSISTANT_TOOLS: "off" }), null);
  assert.equal(toolCallingModel({ GEMINI_API_KEY: "g", AI_MODEL_ASSISTANT: "gemini:x" }), null);
  assert.equal(assistantSeesImages(OR_ENV), true);
  assert.equal(assistantSeesImages({ ...OR_ENV, AI_ASSISTANT_VISION: "off" }), false);
});

function fakeFetch(handler) {
  const calls = [];
  const f = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url: String(url), body });
    return handler(String(url), body, calls.length);
  };
  f.calls = calls;
  return f;
}
const json = (v, status = 200) => new Response(JSON.stringify(v), { status });
const textReply = (text) => json({ choices: [{ message: { content: text } }] });

test("the task model answers first; the free chain takes over when it fails", async () => {
  const env = { ...OR_ENV, GROQ_API_KEY: "q" };
  const good = fakeFetch(() => textReply("from claude"));
  const r1 = await aiChatWithInfo({ user: "hi", task: "assistant" }, { env, fetch: good, sleep: async () => {} });
  assert.equal(r1.model, "anthropic/claude-test");
  assert.equal(good.calls[0].body.model, "anthropic/claude-test");

  const flaky = fakeFetch((url, body) => (body.model === "anthropic/claude-test" ? json({ error: "nope" }, 401) : textReply("from free chain")));
  const r2 = await aiChatWithInfo({ user: "hi", task: "assistant" }, { env, fetch: flaky, sleep: async () => {} });
  assert.notEqual(r2.model, "anthropic/claude-test");
  assert.equal(r2.text, "from free chain");
});

test("aiToolChat returns the turn and rests a model that just failed", async () => {
  const ok = fakeFetch(() => json({ choices: [{ message: { content: "", tool_calls: [{ id: "1", function: { name: "get_page", arguments: "{}" } }] } }] }));
  const turn = await aiToolChat({ system: "s", messages: [{ role: "user", content: "u" }], tools: readToolSpecs() }, { env: OR_ENV, fetch: ok });
  assert.equal(turn.calls[0].name, "get_page");
  assert.equal(turn.model, "anthropic/claude-test");

  const down = fakeFetch(() => json({}, 503));
  const req = { system: "s", messages: [{ role: "user", content: "u" }], tools: [] };
  await assert.rejects(() => aiToolChat(req, { env: OR_ENV, fetch: down, sleep: async () => {} }));
  await assert.rejects(() => aiToolChat(req, { env: OR_ENV, fetch: ok }), /resting/);
  await assert.rejects(() => aiToolChat(req, { env: {}, fetch: ok }), /No tool-calling model/);
});

// ---------- a whole turn ----------

test("turn: tool-calling path when configured, JSON path when it fails", async () => {
  const snap = fixtureSite();
  const messages = [{ role: "user", content: "change our phone number to 0803 555 1234" }];
  const toolFetch = fakeFetch((url, body, n) =>
    n === 1
      ? json({ choices: [{ message: { content: "", tool_calls: [{ id: "1", function: { name: "update_profile", arguments: '{"fields":{"phone":"0803 555 1234"}}' } }] } }] })
      : json({ choices: [{ message: { content: "I've prepared the new number. Review and apply it." } }] }),
  );
  const viaTools = await runAssistantTurn({ snapshot: snap, messages, readEnv: readEnv(snap), deadline: Date.now() + 60_000, env: OR_ENV, fetch: toolFetch, skipProductPhotos: true });
  assert.equal(viaTools.meta.path, "tools");
  assert.equal(viaTools.actions[0].type, "update_profile");
  assert.ok(toolFetch.calls[0].body.tools.length > 5);

  const fallback = fakeFetch((url, body) =>
    body.tools ? json({ error: "bad" }, 401) : textReply(JSON.stringify({ reply: "Ready.", actions: [{ type: "update_profile", fields: { phone: "0803 555 1234" } }] })),
  );
  const viaJson = await runAssistantTurn({ snapshot: snap, messages, readEnv: readEnv(snap), deadline: Date.now() + 60_000, env: OR_ENV, fetch: fallback, skipProductPhotos: true });
  assert.equal(viaJson.meta.path, "json");
  assert.equal(viaJson.meta.fellBack, true);
  assert.deepEqual(viaJson.actions, viaTools.actions);
});

test("turn: free-tier JSON path is unchanged when no tool model is set", async () => {
  const snap = fixtureSite();
  const f = fakeFetch(() => textReply(JSON.stringify({ reply: "Done", actions: [{ type: "remove_section", page: "home", section: 2 }] })));
  const out = await runAssistantTurn({
    snapshot: snap,
    messages: [{ role: "user", content: "remove the team section from the homepage" }],
    readEnv: readEnv(snap),
    deadline: Date.now() + 60_000,
    env: { OPENROUTER_API_KEY: "k" },
    fetch: f,
    skipProductPhotos: true,
  });
  assert.equal(out.meta.path, "json");
  assert.equal(f.calls[0].body.tools, undefined);
  assert.match(f.calls[0].body.messages[1].content, /Site traffic:/);
  assert.equal(out.actions[0].type, "remove_section");
});

// ---------- attachments ----------

test("attachments: only this site's assistant folder, known kinds, at most three", () => {
  const prefix = attachmentUrlPrefix(SUPA, SITE);
  const good = { kind: "logo", url: `${prefix}1700-abc-logo.png`, name: "logo.png" };
  const list = cleanAttachments(
    [
      good,
      { kind: "photo", url: `${attachmentUrlPrefix(SUPA, "99999999-2222-3333-4444-555555555555")}x.jpg` },
      { kind: "photo", url: `${prefix}../other/x.jpg` },
      { kind: "photo", url: `${prefix}sub/x.jpg` },
      { kind: "virus", url: `${prefix}a.jpg` },
      { kind: "photo", url: "https://evil.example/x.jpg" },
      { kind: "photo", url: `${prefix}b.jpg` },
      { kind: "document", url: `${prefix}c.jpg` },
      { kind: "photo", url: `${prefix}d.jpg` },
    ],
    SITE,
    SUPA,
  );
  assert.deepEqual(list.map((a) => a.url.slice(prefix.length)), ["1700-abc-logo.png", "b.jpg", "c.jpg"]);
  assert.equal(list[0].kind, "logo");
  assert.deepEqual(cleanAttachments([good], "not-a-uuid", SUPA), []);
  assert.deepEqual(cleanAttachments([good], SITE, undefined), []);
});

test("attachment kind guess", () => {
  assert.equal(guessAttachmentKind("mamas-logo.png"), "logo");
  assert.equal(guessAttachmentKind("IMG_2231.jpg", "here's our logo"), "logo");
  assert.equal(guessAttachmentKind("menu.jpg"), "document");
  assert.equal(guessAttachmentKind("IMG_2231.jpg", "add this dress"), "photo");
});

// ---------- owner-facing errors ----------

test("technical errors become plain words with a next step", () => {
  assert.match(friendlyError('new row violates row-level security policy for table "products"'), /permission/);
  assert.match(friendlyError(new TypeError("Failed to fetch")), /internet connection/);
  assert.match(friendlyError("JWT expired"), /sign in again/);
  assert.match(friendlyError("Only Sulvatech can change this setting."), /support/);
  assert.equal(friendlyError('null value in column "slug" violates not-null constraint'), GENERIC_ERROR);
  const own = "This product changed after I suggested the edit, so I didn't overwrite it. Ask me again for a fresh suggestion.";
  assert.equal(friendlyError(own), own);
  assert.equal(friendlyError(""), GENERIC_ERROR);
});

test("evaluation cases still parse through the registry", () => {
  assert.ok(CASES.length >= 20);
});

// Regression: a long pasted personal bio failed with "Not enough information to build a site".
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { guessBriefFromText } from "../src/lib/ai/brief.ts";
import { runAssistantTurn } from "../src/lib/ai/assistant.ts";
import { planSite } from "../src/lib/ai/siteBuilder.ts";

const BIO = readFileSync(new URL("./fixtures/titanBio.txt", import.meta.url), "utf8");

test("the whole pasted bio reaches the model, not just the first 1,500 characters", async () => {
  let seen = "";
  await runAssistantTurn(
    { messages: [{ role: "user", content: BIO }] },
    { chat: async (o) => ((seen = o.user + o.system), JSON.stringify({ reply: "ok", state: {}, ready: false })) },
  );
  assert.match(seen, /What comes next/);
  assert.match(seen, /A person counts as the business/);
});

test("model returns garbage: the bio's first two lines still give a name and a role", async () => {
  const plan = await planSite(
    { messages: [{ role: "user", content: BIO }] },
    { chat: async () => "sorry, I cannot help" },
  );
  assert.equal(plan.brief.businessName, 'Iyiola "Titan" Ogunjobi');
  assert.equal(plan.brief.whatTheyDo, "Builder, founder, problem solver");
});

test("model returns an over-cautious empty brief: same fallback", async () => {
  const turn = await runAssistantTurn(
    { messages: [{ role: "user", content: BIO }] },
    { chat: async () => JSON.stringify({ reply: "What is your business called?", state: { businessName: "", whatTheyDo: "" }, ready: false }) },
  );
  assert.equal(turn.state.businessName, 'Iyiola "Titan" Ogunjobi');
  assert.equal(turn.ready, true);
});

test("the model's own reading wins when it gives one", async () => {
  const turn = await runAssistantTurn(
    { messages: [{ role: "user", content: BIO }] },
    {
      chat: async () =>
        JSON.stringify({ reply: "ok", state: { businessName: "Titan Ogunjobi", whatTheyDo: "Founder of Sulva Technology and full-stack developer" }, ready: true }),
    },
  );
  assert.equal(turn.state.businessName, "Titan Ogunjobi");
});

test("guess is conservative: greetings, sentences and single lines are not names", () => {
  assert.deepEqual(guessBriefFromText("Hi\nI want a website"), {});
  assert.deepEqual(guessBriefFromText("We sell bread in Lagos."), {});
  assert.deepEqual(guessBriefFromText("Bakery"), {});
  assert.deepEqual(guessBriefFromText("Kings Bakery\nFresh bread and custom cakes in Ikeja"), {
    businessName: "Kings Bakery",
    whatTheyDo: "Fresh bread and custom cakes in Ikeja",
  });
  assert.deepEqual(guessBriefFromText("# Kings Bakery\nWe bake fresh bread every morning in Ikeja. Order by WhatsApp."), {
    businessName: "Kings Bakery",
    whatTheyDo: "We bake fresh bread every morning in Ikeja",
  });
});

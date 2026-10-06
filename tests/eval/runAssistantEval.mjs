// Runs the "Ask AI" evaluation set against the live model and prints a pass/fail table.
//   OPENROUTER_API_KEY=... GROQ_API_KEY=... npm run eval:assistant   (all cases, the live setup:
//                                                    OpenRouter first, Groq if it fails)
//   npm run eval:assistant -- phone hours           (only these ids)
//   npm run eval:assistant -- --groq                (Groq only, to compare models)
//   OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning npm run eval:assistant   (try another model)
// Exits 1 when fewer than 85% of cases pass. Each run makes one model call per case.
import { writeFileSync } from "node:fs";

import { extractJson } from "../../src/lib/ai/groq.server.ts";
import { aiChatWithInfo } from "../../src/lib/ai/llm.server.ts";
import { SAMPLING } from "../../src/lib/ai/prompts/rules.ts";
import { buildAssistantPrompt, parseAssistantOutput } from "../../src/lib/ai/siteAssistant.ts";
import { CASES, checkCase, fixtureSite } from "./assistantCases.mjs";

const PASS_BAR = 0.85;
const args = process.argv.slice(2);
const groqOnly = args.includes("--groq");
const only = args.filter((a) => !a.startsWith("--"));
const cases = only.length ? CASES.filter((c) => only.includes(c.id)) : CASES;
const env = groqOnly ? { ...process.env, OPENROUTER_API_KEY: "" } : process.env;

if (!env.OPENROUTER_API_KEY && !env.GROQ_API_KEY) {
  console.error("Set OPENROUTER_API_KEY and/or GROQ_API_KEY to run the evaluation.");
  process.exit(2);
}

const rows = [];
for (const c of cases) {
  const snapshot = fixtureSite();
  const messages = [{ role: "user", content: c.request }];
  let result = null;
  let problems;
  let served = "";
  const started = Date.now();
  try {
    const { system, user } = buildAssistantPrompt({ snapshot, messages, focusPage: c.focusPage });
    const reply = await aiChatWithInfo({ system, user, json: true, ...SAMPLING.assistant }, { env });
    const text = reply.text;
    served = `${reply.provider}:${reply.model}`;
    result = parseAssistantOutput(extractJson(text), snapshot, c.request);
    problems = checkCase(c, result);
  } catch (e) {
    problems = [`error: ${e instanceof Error ? e.message : String(e)}`];
  }
  const row = { id: c.id, pass: problems.length === 0, seconds: (Date.now() - started) / 1000, served, problems, request: c.request, result };
  rows.push(row);
  console.log(`${row.pass ? "PASS" : "FAIL"}  ${c.id.padEnd(20)} ${row.seconds.toFixed(1).padStart(5)}s  ${served.padEnd(48)} ${problems.join("; ")}`);
}

const passed = rows.filter((r) => r.pass).length;
const rate = passed / rows.length;
const avg = rows.reduce((t, r) => t + r.seconds, 0) / rows.length;
const fellBack = rows.filter((r) => r.served.startsWith("groq")).length;
console.log(`\n${passed}/${rows.length} passed (${Math.round(rate * 100)}%), average ${avg.toFixed(1)}s per answer`);
if (!groqOnly && env.OPENROUTER_API_KEY && fellBack) console.log(`Note: ${fellBack} answers came from the Groq fallback, not OpenRouter.`);
const out = new URL("./last-assistant-eval.json", import.meta.url);
writeFileSync(out, JSON.stringify({ when: new Date().toISOString(), groqOnly, passed, total: rows.length, averageSeconds: avg, rows }, null, 2));
console.log(`Full answers saved to ${out.pathname}`);
process.exit(rate >= PASS_BAR ? 0 : 1);

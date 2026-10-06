// Runs the "Ask AI" evaluation set against the live model and prints a pass/fail table.
//   GROQ_API_KEY=... npm run eval:assistant            (all cases)
//   GROQ_API_KEY=... npm run eval:assistant -- phone hours   (only these ids)
// Exits 1 when fewer than 85% of cases pass. Each run makes one model call per case.
import { writeFileSync } from "node:fs";

import { extractJson, groqChat } from "../../src/lib/ai/groq.server.ts";
import { SAMPLING } from "../../src/lib/ai/prompts/rules.ts";
import { buildAssistantPrompt, parseAssistantOutput } from "../../src/lib/ai/siteAssistant.ts";
import { CASES, checkCase, fixtureSite } from "./assistantCases.mjs";

const PASS_BAR = 0.85;
const only = process.argv.slice(2);
const cases = only.length ? CASES.filter((c) => only.includes(c.id)) : CASES;

if (!process.env.GROQ_API_KEY) {
  console.error("Set GROQ_API_KEY (and optionally GROQ_MODEL) to run the evaluation.");
  process.exit(2);
}

const rows = [];
for (const c of cases) {
  const snapshot = fixtureSite();
  const messages = [{ role: "user", content: c.request }];
  let result = null;
  let problems;
  const started = Date.now();
  try {
    const { system, user } = buildAssistantPrompt({ snapshot, messages, focusPage: c.focusPage });
    const text = await groqChat({ system, user, json: true, ...SAMPLING.assistant });
    result = parseAssistantOutput(extractJson(text), snapshot, c.request);
    problems = checkCase(c, result);
  } catch (e) {
    problems = [`error: ${e instanceof Error ? e.message : String(e)}`];
  }
  const row = { id: c.id, pass: problems.length === 0, seconds: (Date.now() - started) / 1000, problems, request: c.request, result };
  rows.push(row);
  console.log(`${row.pass ? "PASS" : "FAIL"}  ${c.id.padEnd(20)} ${row.seconds.toFixed(1)}s  ${problems.join("; ")}`);
}

const passed = rows.filter((r) => r.pass).length;
const rate = passed / rows.length;
console.log(`\n${passed}/${rows.length} passed (${Math.round(rate * 100)}%) — model ${process.env.GROQ_MODEL || "default"}`);
const out = new URL("./last-assistant-eval.json", import.meta.url);
writeFileSync(out, JSON.stringify({ when: new Date().toISOString(), model: process.env.GROQ_MODEL || "default", passed, total: rows.length, rows }, null, 2));
console.log(`Full answers saved to ${out.pathname}`);
process.exit(rate >= PASS_BAR ? 0 : 1);

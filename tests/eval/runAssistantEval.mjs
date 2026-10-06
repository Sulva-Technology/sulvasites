// Run against the live models with `npm run eval:assistant` (loads keys from .env.local). `-- --delay=0` turns pacing off.
//   npm run eval:assistant                          (all cases)
//   npm run eval:assistant -- phone hours           (only these ids)
//   npm run eval:assistant -- --gemini              (one provider only, to compare them:
//                       --openrouter / --groq        run each and compare the scores)
//   OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning npm run eval:assistant -- --openrouter   (try another model)
// Exits 1 when fewer than 85% of cases pass. Each run makes one model call per case.
import { writeFileSync } from "node:fs";

import { extractJson } from "../../src/lib/ai/groq.server.ts";
import { aiChatWithInfo } from "../../src/lib/ai/llm.server.ts";
import { SAMPLING } from "../../src/lib/ai/prompts/rules.ts";
import { buildAssistantPrompt, parseAssistantOutput } from "../../src/lib/ai/siteAssistant.ts";
import { CASES, checkCase, fixtureSite } from "./assistantCases.mjs";

const PASS_BAR = 0.85;
const args = process.argv.slice(2);
const KEYS = { gemini: "GEMINI_API_KEY", openrouter: "OPENROUTER_API_KEY", groq: "GROQ_API_KEY" };
const soloProvider = Object.keys(KEYS).find((p) => args.includes(`--${p}`)) ?? null;
const only = args.filter((a) => !a.startsWith("--"));
const delayArg = args.find((a) => a.startsWith("--delay="));
// Free tiers allow only a few requests per minute; pace the run unless told otherwise.
let DELAY_MS = 4000;
if (delayArg) {
  const delayValue = Number(delayArg.slice("--delay=".length));
  if (!Number.isFinite(delayValue) || delayValue < 0) {
    console.error("--delay must be a number of milliseconds, e.g. --delay=4000");
    process.exit(2);
  }
  DELAY_MS = Math.min(delayValue, 60000);
}
const cases = only.length ? CASES.filter((c) => only.includes(c.id)) : CASES;
// One provider only: blank the other keys so nothing falls back to them.
const env = soloProvider
  ? { ...process.env, ...Object.fromEntries(Object.entries(KEYS).filter(([p]) => p !== soloProvider).map(([, k]) => [k, ""])) }
  : process.env;

if (!Object.values(KEYS).some((k) => env[k])) {
  console.error(`Set ${soloProvider ? KEYS[soloProvider] : "GEMINI_API_KEY, OPENROUTER_API_KEY and/or GROQ_API_KEY"} to run the evaluation.`);
  process.exit(2);
}

const rows = [];
for (const c of cases) {
  if (rows.length && DELAY_MS) await new Promise((r) => setTimeout(r, DELAY_MS));
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
const firstChoice = soloProvider ?? Object.keys(KEYS).find((p) => env[KEYS[p]]);
const fellBack = rows.filter((r) => r.served && !r.served.startsWith(firstChoice)).length;
console.log(`\n${passed}/${rows.length} passed (${Math.round(rate * 100)}%), average ${avg.toFixed(1)}s per answer`);
if (fellBack) console.log(`Note: ${fellBack} answers came from a fallback provider, not ${firstChoice}.`);
const out = new URL(`./last-assistant-eval${soloProvider ? `-${soloProvider}` : ""}.json`, import.meta.url);
writeFileSync(out, JSON.stringify({ when: new Date().toISOString(), provider: soloProvider ?? "all", passed, total: rows.length, averageSeconds: avg, rows }, null, 2));
console.log(`Full answers saved to ${out.pathname}`);
process.exit(rate >= PASS_BAR ? 0 : 1);

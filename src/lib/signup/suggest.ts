// Three template suggestions for the signup wizard, with no AI call. Pure: relative imports only.
import { scoreTemplates } from "../ai/templateChoice.ts";
import { briefFromAnswers, type SignupAnswers } from "./fallbackSite.ts";

const DEFAULTS = ["t1", "t5", "t14"];
const SHOPS = ["t14", "t13"];

export function suggestTemplates(a: SignupAnswers): string[] {
  const scored = scoreTemplates(briefFromAnswers(a, ""))
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((s) => s.key);
  const ordered = [...scored, ...(a.sellOnline ? SHOPS : []), ...DEFAULTS];
  return [...new Set(ordered)].slice(0, 3);
}

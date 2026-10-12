// Three template suggestions for the signup wizard, with no AI call. Pure: relative imports only.
import { scoreTemplates } from "../ai/templateChoice.ts";
import { briefFromAnswers, type SignupAnswers } from "./fallbackSite.ts";

const DEFAULTS = ["t1", "t3", "t4"];
const SHOPS = ["t14", "t13"];

/**
 * The closest other designs for each template, by audience and feel. They fill the picks after the
 * keyword matches, so a blogger sees Folio, Journal and Atelier rather than a corporate and a salon site.
 */
export const RELATED: Record<string, string[]> = {
  t1: ["t3", "t4"],
  t2: ["t17", "t3"],
  t3: ["t2", "t17"],
  t4: ["t1", "t3"],
  t5: ["t9", "t11"],
  t6: ["t12", "t1"],
  t7: ["t11", "t5"],
  t8: ["t9", "t1"],
  t9: ["t8", "t5"],
  t10: ["t16", "t1"],
  t11: ["t7", "t5"],
  t12: ["t6", "t15"],
  t13: ["t14", "t2"],
  t14: ["t13", "t4"],
  t15: ["t12", "t6"],
  t16: ["t10", "t17"],
  t17: ["t2", "t3"],
};

export function suggestTemplates(a: SignupAnswers): string[] {
  const scores = scoreTemplates(briefFromAnswers(a, ""));
  const matched = scores
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((s) => s.key);
  // A related shop design only when they sell online or the design it relates to is a shop itself.
  const related = matched.flatMap((k) => (RELATED[k] ?? []).filter((r) => !SHOPS.includes(r) || a.sellOnline || SHOPS.includes(k)));
  const ordered = [...matched, ...(a.sellOnline ? SHOPS : []), ...related, ...DEFAULTS];
  return [...new Set(ordered)].slice(0, 3);
}

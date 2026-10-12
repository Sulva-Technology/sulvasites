// Does the business on a site belong to the industry its design was made for? Pure; relative imports only.
import { emptyBrief } from "./ai/brief.ts";
import { TEMPLATE_KEYS, scoreTemplates } from "./ai/templateChoice.ts";
import { getIndustry } from "./ai/prompts/industries.ts";

type ProfileText = { business_name?: string | null; tagline?: string | null; description?: string | null } | null | undefined;

/**
 * False only on positive evidence: the profile names another industry (a tech firm on the car design)
 * and nothing of this design's own. Then the design swaps its industry wording ("Book a test drive",
 * "Reserve a table") for neutral lines. A profile that says little keeps the design's own wording.
 */
export function businessFitsTemplate(profile: ProfileText, templateKey: string): boolean {
  const own = getIndustry(templateKey);
  if (!TEMPLATE_KEYS.includes(templateKey) || own.shop) return true;
  const brief = {
    ...emptyBrief(),
    businessName: profile?.business_name ?? "",
    whatTheyDo: [profile?.tagline, profile?.description].filter(Boolean).join(" "),
  };
  const scores = scoreTemplates(brief);
  if ((scores.find((s) => s.key === templateKey)?.score ?? 0) > 0) return true;
  return !scores.some((s) => s.key !== templateKey && s.score > 0 && !getIndustry(s.key).shop);
}

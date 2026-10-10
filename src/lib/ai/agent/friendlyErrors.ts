// Turns technical failures (database, network, auth) into owner language with a next step. Messages
// the app already wrote for owners pass through unchanged. Pure; relative imports only.

const RULES: Array<[RegExp, string]> = [
  [/only sulvatech can change/i, "Only Sulvatech can change this setting for now. Message support and we'll do it for you."],
  [/row-level security|permission denied|42501|not allowed|forbidden|\b403\b/i, "You don't have permission to change this. Ask the site owner, or contact Sulvatech support."],
  [/jwt|session (has )?expired|not authenticated|refresh token|\b401\b|sign in again/i, "Your sign-in has expired. Refresh the page, sign in again, then try once more."],
  [/failed to fetch|networkerror|network error|load failed|err_internet|offline/i, "Couldn't reach the server. Check your internet connection and try again."],
  [/duplicate key|23505|already exists/i, "Something with that name already exists. Try a slightly different name."],
  [/timed? ?out|took longer|408|504/i, "That took too long to finish. Please try again."],
  [/rate limit|429|too many requests/i, "The assistant is busy right now. Wait a minute, then try again."],
];

/** Words that only show up in raw technical errors. */
const TECHNICAL = /violates|constraint|column|relation|null value|syntax|undefined|exception|stack|PGRST|\bat [A-Za-z_.]+ \(|[{}<>]|\bstatus code\b/i;

export const GENERIC_ERROR = "Something went wrong saving this change. Please try again. If it keeps happening, contact Sulvatech support.";

export function friendlyError(raw: unknown): string {
  const msg = (raw instanceof Error ? raw.message : typeof raw === "string" ? raw : "").trim();
  if (!msg) return GENERIC_ERROR;
  for (const [re, text] of RULES) if (re.test(msg)) return text;
  if (TECHNICAL.test(msg) || msg.length > 300) return GENERIC_ERROR;
  return msg;
}

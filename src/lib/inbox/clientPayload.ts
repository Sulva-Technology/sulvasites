/** Builds the public inbox API payload from a form's entries. Pure (unit-tested). */
export type InboxPayload = {
  kind: "enquiry" | "booking";
  fields: Record<string, string>;
  website: string;
  sourcePage?: string;
};

export function buildInboxPayload(entries: Array<[string, string]>, sourcePage: string): InboxPayload {
  const fields: Record<string, string> = {};
  let website = "";
  for (const [k, v] of entries) {
    if (k === "website") website = v;
    else fields[k] = v;
  }
  const payload: InboxPayload = { kind: fields.date ? "booking" : "enquiry", fields, website };
  if (sourcePage) payload.sourcePage = sourcePage.slice(0, 200);
  return payload;
}

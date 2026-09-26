/**
 * Serialize data for an inline `<script type="application/ld+json">`.
 *
 * Plain JSON.stringify is unsafe here: a value containing "</script>" would
 * close the tag and let the rest run as HTML. Escaping "<" (and the JS line
 * separators) keeps the output valid JSON that can't break out of the script.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

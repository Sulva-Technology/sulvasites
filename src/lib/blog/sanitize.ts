/**
 * Allowlist HTML sanitiser for blog post bodies (pure, no DOM, unit-tested).
 * Keeps simple article markup, drops every other tag and attribute, removes the contents of
 * script-like elements, and only lets safe URLs through on links and images.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li",
  "blockquote", "figure", "figcaption", "img", "hr", "code", "pre",
]);
const VOID_TAGS = new Set(["br", "img", "hr"]);
/** Elements dropped together with everything inside them. */
const DROP_WITH_CONTENT = new Set([
  "script", "style", "iframe", "object", "embed", "noscript", "template", "svg", "math",
  "textarea", "select", "title", "head", "frameset", "frame", "noembed", "xmp",
]);
/** Headings above h2 become h2 (the post title is the page's h1). */
const RENAME: Record<string, string> = { h1: "h2", h5: "h4", h6: "h4", div: "p" };

function escapeAttr(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeEntities(v: string): string {
  return v
    .replace(/&#x([0-9a-f]+);?/gi, (_, h: string) => String.fromCodePoint(Math.min(parseInt(h, 16), 0x10ffff)))
    .replace(/&#([0-9]+);?/g, (_, d: string) => String.fromCodePoint(Math.min(Number(d), 0x10ffff)))
    .replace(/&colon;/gi, ":")
    .replace(/&tab;/gi, "\t")
    .replace(/&newline;/gi, "\n")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** http(s), mailto, tel, site-relative and in-page links; images must be https. */
export function safeUrl(raw: string, kind: "href" | "src"): string | null {
  // Browsers ignore control characters and whitespace inside a scheme ("java\tscript:").
  const v = decodeEntities(raw).replace(/[\u0000-\u0020\u007f-\u009f]/g, "");
  if (!v || v.length > 2000) return null;
  if (kind === "src") return /^https:\/\//i.test(v) ? v : null;
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null; // any other scheme (javascript:, data:, vbscript:...)
  if (v.startsWith("//")) return null; // protocol-relative: treat as off-site, unverifiable
  return v; // relative path, #anchor or ?query
}

function parseAttrs(src: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const name = m[1]!.toLowerCase();
    if (!out.has(name)) out.set(name, m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
}

function openTag(tag: string, attrSrc: string): string {
  const attrs = parseAttrs(attrSrc);
  let out = `<${tag}`;
  if (tag === "a") {
    const href = safeUrl(attrs.get("href") ?? "", "href");
    if (href) {
      out += ` href="${escapeAttr(href)}"`;
      if (/^https?:/i.test(href)) out += ' target="_blank" rel="noopener noreferrer nofollow"';
    }
  } else if (tag === "img") {
    const src = safeUrl(attrs.get("src") ?? "", "src");
    if (!src) return "";
    out += ` src="${escapeAttr(src)}" alt="${escapeAttr(decodeEntities(attrs.get("alt") ?? "").slice(0, 300))}" loading="lazy"`;
  } else if (tag === "ol") {
    const start = attrs.get("start");
    if (start && /^[0-9]{1,4}$/.test(start)) out += ` start="${start}"`;
  }
  return `${out}>`;
}

/** Escapes stray angle brackets in a text run (entities already in the text are kept). */
function cleanText(t: string): string {
  return t.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function sanitizePostHtml(html: string): string {
  const src = String(html ?? "").slice(0, 400_000);
  const tagRe = /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<![^>]*>|<\?[^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  const open: string[] = [];
  let out = "";
  let last = 0;
  let dropUntil: string | null = null;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(src))) {
    const text = src.slice(last, m.index);
    last = tagRe.lastIndex;
    if (dropUntil) {
      if (m[1] === "/" && m[2]?.toLowerCase() === dropUntil) dropUntil = null;
      continue;
    }
    out += cleanText(text);
    if (!m[2]) continue; // comment, doctype, CDATA, processing instruction
    const isClose = m[1] === "/";
    const raw = m[2].toLowerCase();
    if (DROP_WITH_CONTENT.has(raw)) {
      if (!isClose && !/\/\s*$/.test(m[3] ?? "")) dropUntil = raw;
      continue;
    }
    const tag = RENAME[raw] ?? raw;
    if (!ALLOWED_TAGS.has(tag)) continue;
    if (isClose) {
      if (VOID_TAGS.has(tag)) continue;
      const at = open.lastIndexOf(tag);
      if (at === -1) continue;
      while (open.length > at) out += `</${open.pop()}>`;
      continue;
    }
    const t = openTag(tag, m[3] ?? "");
    if (!t) continue;
    out += t;
    if (!VOID_TAGS.has(tag)) open.push(tag);
  }
  if (!dropUntil) out += cleanText(src.slice(last));
  while (open.length) out += `</${open.pop()}>`;
  return out;
}

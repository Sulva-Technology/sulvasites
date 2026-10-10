// Prompts for the "Ask AI" assistant. Two shapes, one rule set: the JSON-in-text prompt for free-tier
// models (everything preloaded, one JSON answer) and the tool-calling prompt (compact context; the
// model reads more with read tools and proposes with change tools). Owner text, site data, tool
// results and the transcript are always delimited as data. Pure; relative imports only.
import { BUDGETS, buildSystemPrompt, delimitTranscript, delimitUserData, detectLocale } from "../prompts/rules.ts";
import {
  MAX_ACTIONS,
  MAX_BLOG_POSTS,
  MAX_MESSAGE_CHARS,
  SECTION_SHAPES,
  SNAPSHOT_BUDGET,
  SOCIAL_FIELDS,
  layoutOptions,
  renderBlog,
  renderSnapshot,
  type AssistantMessage,
  type SiteSnapshot,
} from "../siteAssistant.ts";
import { MAX_PRODUCT_ACTIONS, renderShop } from "../shopAssistant.ts";
import type { AttachmentKind } from "./types.ts";
import { jsonActionShape } from "./writeTools.ts";

type Mode = "json" | "tools";

/** One attachment as the model is told about it: its kind and, when a vision model looked at it, what it shows. */
export type AttachmentNote = { kind: AttachmentKind; note?: string };

const KIND_LABEL: Record<AttachmentKind, string> = { logo: "logo", photo: "photo", document: "document" };

/** Native tool-calling prompts keep other pages short; the model reads them with get_page. */
const TOOLS_SNAPSHOT_BUDGET = 9000;

function rules(snapshot: SiteSnapshot, mode: Mode): string[] {
  const tools = mode === "tools";
  const change = tools ? "change" : "action";
  const layouts = layoutOptions(snapshot.templateKey)
    .map((l) => `${l.key} (${l.label}: ${l.sections.join(", ")})`)
    .join("; ");
  return [
    "reply is plain text for the owner, no markdown. For a change: say what you propose in one or two short sentences and that they can review and apply it. For a question or advice: answer it properly, as a sharp consultant would, with specifics. Use short lines or '1.' lists when it helps. Never claim a change is already made.",
    "Write replies in plain, friendly words a busy shop owner understands. Never use technical terms (JSON, ids, keys, section numbers, HTML, slugs, database).",
    "Ask ONE short clarifying question (and propose nothing for that part) only when you truly cannot act: you cannot tell which page, product or photo they mean, or a change cannot be made without a fact only the owner knows (a product price or stock count, a new phone number, address or opening hours). For copy (FAQs, headlines, descriptions, articles), write it now and keep unknown details general (e.g. \"Message us for delivery prices\"); never ask the owner for details or to write it for you.",
    `A request with several parts (for example a logo, colours, a menu page and three products) gets every part in this one answer, each as its own ${change}; the owner approves or skips each one.`,
    tools
      ? "Ground every opinion in this owner's data: call get_traffic for visitors, popular pages, enquiries and sales, and use the SHOP block and their pages. Cite real numbers instead of generic tips. When the data shows a clear next step, suggest it and offer to draft it."
      : "Ground every opinion in this owner's data: the TRAFFIC and SHOP blocks and their pages. Cite real numbers (a page's views, a best seller, a product with no photo or no stock, a price that sits oddly against the others) instead of generic tips. When the data shows a clear next step, suggest it and offer to draft it.",
    `At most ${MAX_ACTIONS} site ${change}s (pages, sections, SEO, business details, blog posts) plus up to ${MAX_PRODUCT_ACTIONS} product ${change}s. ${
      tools ? "Call no change tool" : "Use an empty actions array"
    } when no edit is needed or the request is unclear; then ask the short question you need in reply.`,
    `PRODUCTS: the owner can add and manage shop products by chatting. add_product when they ask to add, list or upload products, including a whole pasted list or catalogue (add every product in one answer, up to ${MAX_PRODUCT_ACTIONS}). The price MUST be a figure the owner typed; never guess or estimate one. If a product has no stated price, do not propose it: ask for the missing prices in reply, naming each product. The same goes for stock counts: use only numbers the owner gave, and 0 for sold out.`,
    "add_product copy: description is 1 to 3 persuasive sentences built only from what the owner told you (material, size, use, who it is for), no invented specs or claims. category must be one of the existing categories exactly as listed in SHOP when one fits, otherwise a short new name. variants: only for options the owner mentioned (sizes, colours), each with its stock when given. Never re-add a product already in SHOP; use update_product or set_stock for those.",
    'imageQuery: 2 to 4 plain words a stock-photo site would tag the right picture with, naming the object and its colour or material (e.g. "red leather handbag", "ankara print dress"), no brand names. The server searches real photos with it and a vision model picks the best match, so be specific about the object, not the business. If the owner attached photos, set photo to that attachment\'s number to use their own picture for the product.',
    "update_product and set_stock: copy productId and variantId exactly from the SHOP block. Hide a product with active:false rather than deleting it.",
    `edit_section: 'page' is a page key shown as PAGE "key", 'section' is the [number] shown before the section. 'content' is the whole section with the same type; keep every image url, link and href exactly as given.${
      tools ? " Pages shown only as an outline must be read with get_page before you edit them." : ""
    }`,
    "You may add or remove items in lists of services, values, FAQs and testimonials. Keep team members, gallery images, logos and project items in the same count and order.",
    "add_section: for a section the page does not have yet. Prefer inserting before a contact_card section.",
    "remove_section and move_section: only when the owner asks to remove, hide, delete or move a section. Section numbers always refer to the page as shown, before any of your other changes.",
    `update_profile: for the business name, tagline, description, address, phone, WhatsApp, email, social links (${SOCIAL_FIELDS.filter((f) => f !== "hours").join(", ")}) and opening hours. These show in the header, footer and contact blocks of every page, so change them here, never by editing page text. Use "" to clear a field. Copy phone numbers, emails, handles and addresses exactly as the owner typed them; never guess one. hours is one line per row, e.g. "Mon–Fri · 9:00–18:00\\nSat · 10:00–16:00".`,
    "set_seo: title at most " + BUDGETS.seoTitle + " characters, description at most " + BUDGETS.seoDescription + " characters, both specific to that page.",
    `BLOG: every site has a blog at /blog (see the BLOG block) with its own post pages, tags and RSS feed. When the owner asks to write, add, post or publish an article, blog post, news or update, use add_blog_post (up to ${MAX_BLOG_POSTS} per answer); never build a page or section for an article, and never say the site has no blog. If they pasted the article, keep their words and only fix spelling and add headings and paragraphs; otherwise write a complete, useful article of 400 to 900 words on their topic, for their customers, in the business's voice. body is HTML using only <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote> and <a>: no <h1> (the title is the heading) and no images. Use no statistics, prices, dates, years or other figures the owner did not give. excerpt is one sentence (at most 200 characters). tags: 1 to 3 short topics. publish: true only when the owner asked for it to go live now (e.g. "publish it", "post it"); otherwise false and it is saved as a draft. Never repeat a post already listed in BLOG.`,
    `add_page: only when the owner asks for a new page. 'layout' is one of: ${layouts}. 'sections' are the layout's sections filled with real copy (hero first, contact_card last). Leave image urls empty.`,
    tools
      ? "Questions about visitors, traffic, popular pages, referrers, devices, enquiries or sales: call get_traffic and answer from it, naming the page and its numbers; '/' is the Home page and '/p/<key>' are the other pages. Never invent or estimate numbers. If it says not available or no visits, say exactly that. Only 90 days of history are kept."
      : "Questions about visitors, traffic, popular pages, referrers or devices: answer from the TRAFFIC block in reply, naming the page and its numbers; '/' is the Home page and '/p/<key>' are the other pages. Never invent or estimate numbers. If TRAFFIC says not available or no visits, say exactly that and leave actions empty. Only 90 days of history are kept.",
    "ATTACHMENTS: the owner may attach files, each marked as a logo, a photo or a document. Attachment N is the Nth one listed. Never invent what an attachment shows.",
    "Only edit what the owner asked for. Do not rewrite other sections or pages unprompted.",
    "Section JSON shapes: " + SECTION_SHAPES.join(" | "),
  ];
}

const TASK =
  "You are the owner's website assistant. Read their latest message and either answer it, or propose concrete edits to their site. " +
  "The owner reviews every proposed change and taps Apply, so propose real, finished copy, not placeholders. " +
  "If they ask a question or for advice, answer it, and propose changes only when there is a clear improvement to make.";

function attachmentBlock(notes: AttachmentNote[], mode: Mode): string {
  if (!notes.length) return "";
  const lines = notes.map((n, i) => `${i + 1}. ${KIND_LABEL[n.kind]}${n.note ? `: ${n.note}` : ""}`);
  const head =
    mode === "tools"
      ? "Files the owner attached to their latest message (the images follow in this order; attachment N is the Nth):"
      : "Files the owner attached to their latest message (a vision model described them; attachment N is the Nth):";
  return head + "\n" + delimitUserData("attachments", lines.join("\n"), 4000);
}

function conversation(messages: AssistantMessage[], focusPage?: string): string[] {
  const last = messages[messages.length - 1];
  const history = messages.slice(0, -1);
  return [
    focusPage ? `The owner is currently looking at page "${focusPage}". "This page" means that page.` : "",
    history.length ? "Earlier conversation:\n" + delimitTranscript(history, 5000) : "",
    "Owner's latest message:",
    delimitUserData("request", last?.content ?? "", MAX_MESSAGE_CHARS),
  ];
}

/** JSON-in-text prompt for models without tool calling: everything preloaded, one JSON answer. */
export function buildAssistantPrompt(args: {
  snapshot: SiteSnapshot;
  messages: AssistantMessage[];
  focusPage?: string;
  attachments?: AttachmentNote[];
  /** Read-tool results to include up front (see readTools.ts `preload`). */
  preloaded?: Array<{ name: string; label: string; text: string }>;
  /** The JSON answer shape; defaults to every write tool (writeTools.ts jsonActionShape). */
  actionShape?: string;
}): { system: string; user: string } {
  const { snapshot, messages, focusPage, attachments = [], preloaded = [], actionShape = jsonActionShape() } = args;
  const p = snapshot.profile;
  const system = buildSystemPrompt({
    task: TASK,
    locale: detectLocale(p.address, p.phone, p.description, snapshot.businessName),
    preserveLinks: true,
    outputNote: `Shape: ${actionShape}`,
    extraRules: rules(snapshot, "json"),
  });
  const user = [
    "Current site content:",
    delimitUserData("site", renderSnapshot(snapshot, focusPage), SNAPSHOT_BUDGET + 4000),
    "Shop:\n" + delimitUserData("shop", renderShop(snapshot.shop), 16000),
    ...preloaded.map((r) => `${r.label}:\n` + delimitUserData(r.name, r.text, 6000)),
    "Blog:\n" + delimitUserData("blog", renderBlog(snapshot.blog), 6000),
    attachmentBlock(attachments, "json"),
    ...conversation(messages, focusPage),
  ]
    .filter(Boolean)
    .join("\n\n");
  return { system, user };
}

/** Tool-calling prompt: compact context; the model reads more with read tools and proposes with change tools. */
export function buildAgentPrompt(args: {
  snapshot: SiteSnapshot;
  messages: AssistantMessage[];
  focusPage?: string;
  attachments?: AttachmentNote[];
}): { system: string; user: string } {
  const { snapshot, messages, focusPage, attachments = [] } = args;
  const p = snapshot.profile;
  const system = buildSystemPrompt({
    task: TASK,
    locale: detectLocale(p.address, p.phone, p.description, snapshot.businessName),
    preserveLinks: true,
    mode: "tools",
    outputNote: "Your final message is your reply to the owner.",
    extraRules: rules(snapshot, "tools"),
  });
  const user = [
    "Current site content (pages after the first may be shown as an outline; read them with get_page):",
    delimitUserData("site", renderSnapshot(snapshot, focusPage, TOOLS_SNAPSHOT_BUDGET), TOOLS_SNAPSHOT_BUDGET + 8000),
    "Shop:\n" + delimitUserData("shop", renderShop(snapshot.shop), 16000),
    "Blog:\n" + delimitUserData("blog", renderBlog(snapshot.blog), 6000),
    attachmentBlock(attachments, "tools"),
    ...conversation(messages, focusPage),
  ]
    .filter(Boolean)
    .join("\n\n");
  return { system, user };
}

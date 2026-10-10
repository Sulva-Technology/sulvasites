// Write tools of the "Ask AI" assistant. Each entry is one kind of change the owner can approve: its
// schema (shown to tool-calling models), its line in the JSON shape (shown to free-tier models) and its
// validator, which turns the model's arguments into a safe AssistantAction proposal or rejects them.
// Both the native tool-calling path and the JSON-in-text path go through ProposalCollector, so they
// produce identical proposals. Nothing here writes: the owner applies proposals from the panel
// (assistantApply.ts holds the applier and undo for each type; its maps are typed to cover them all).
// Pure; relative imports only (Node test runner).
import { defaultSection, type PageData, type Section } from "../../pageSchema.ts";
import { slugify } from "../../slugify.ts";
import { buildPresetPageData, uniquePageKey } from "../../../templates/pagePresets.ts";
import { BUDGETS } from "../prompts/rules.ts";
import { cleanCopyField, fitSentence, type CopyFacts } from "../quality.ts";
import {
  MAX_ACTIONS,
  MAX_BLOG_POSTS,
  MAX_REPLY_CHARS,
  SECTION_LABEL_FOR,
  assistantFacts,
  clip,
  findPage,
  isRecord,
  isSectionType,
  layoutOptions,
  pageRef,
  polishSection,
  profileFieldLabel,
  sameJson,
  shapeBlogPost,
  shapeEditedSection,
  shapeNewSection,
  shapeProfileUpdate,
  type AssistantAction,
  type AssistantResult,
  type SiteSnapshot,
} from "../siteAssistant.ts";
import { MAX_PRODUCT_ACTIONS, describeProduct, shapeNewProduct, shapeProductUpdate, shapeStockUpdate } from "../shopAssistant.ts";
import type { JsonSchema, ToolSpec } from "./types.ts";

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
/** A proposal before the collector numbers it. */
export type ActionDraft = DistributiveOmit<AssistantAction, "id">;
export type ActionType = AssistantAction["type"];

/** Everything a validator may consult. Only `ownerText` (the owner's own messages) can vouch for new facts. */
export type ProposalState = {
  snapshot: SiteSnapshot;
  ownerText: string;
  facts: CopyFacts;
  takenKeys: string[];
  editedSections: Set<string>;
  takenSlugs: string[];
  takenNames: string[];
  touchedProducts: Set<string>;
  takenPostSlugs: string[];
  takenPostTitles: string[];
  postCount: number;
  hasProfileUpdate: boolean;
};

export type WriteTool = {
  name: ActionType;
  /** Shop changes have their own, larger cap. */
  group: "site" | "shop";
  description: string;
  /** This tool's arguments as one line of the JSON-in-text shape. */
  jsonShape: string;
  parameters: JsonSchema;
  /** The validated proposal, or null when it is invalid, unsafe or changes nothing. */
  propose: (args: Record<string, unknown>, st: ProposalState, summary: string) => ActionDraft | null;
};

const str = (description: string): JsonSchema => ({ type: "string", description });
const num = (description: string): JsonSchema => ({ type: "number", description });
const bool = (description: string): JsonSchema => ({ type: "boolean", description });
const obj = (description: string): JsonSchema => ({ type: "object", description, additionalProperties: true });
const SUMMARY = str("A short plain-words label for the owner, e.g. \"Stronger homepage headline\".");
const PAGE = str("Page key, as shown in PAGE \"key\".");
const SECTION = { type: "integer", description: "The [number] shown before the section." } as const satisfies JsonSchema;

function params(properties: Record<string, JsonSchema>, required: string[]): JsonSchema {
  return { type: "object", properties: { ...properties, summary: SUMMARY }, required, additionalProperties: false };
}

const editSection: WriteTool = {
  name: "edit_section",
  group: "site",
  description: "Rewrite the text of one existing section. Images, links and the section type stay as they are.",
  jsonShape: '{ "type": "edit_section", "page": page key, "section": section number, "content": full section JSON with your new text, "summary": string }',
  parameters: params({ page: PAGE, section: SECTION, content: obj("The whole section with the same type and your new text.") }, ["page", "section", "content"]),
  propose(a, st, summary) {
    const page = findPage(st.snapshot, a.page);
    const index = Number(a.section);
    const before = page?.data.sections?.[index];
    if (!page || !Number.isInteger(index) || !before) return null;
    const slot = `${page.key}:${index}`;
    if (st.editedSections.has(slot)) return null;
    if (isRecord(a.content) && a.content.type !== undefined && a.content.type !== before.type) return null;
    const after = polishSection(shapeEditedSection(before, a.content), before, st.facts);
    if (sameJson(before, after)) return null;
    st.editedSections.add(slot);
    return { type: "edit_section", ...pageRef(st.snapshot, page), sectionIndex: index, before, after, summary: summary || `Update a ${before.type} section` };
  },
};

const addSection: WriteTool = {
  name: "add_section",
  group: "site",
  description: "Add a new section to a page.",
  jsonShape: '{ "type": "add_section", "page": page key, "position": section number to insert before (or -1 for the end), "content": full section JSON, "summary": string }',
  parameters: params(
    { page: PAGE, position: { type: "integer", description: "Section number to insert before, or -1 for the end." }, content: obj("The full section JSON, including its type.") },
    ["page", "content"],
  ),
  propose(a, st, summary) {
    const page = findPage(st.snapshot, a.page);
    const content = isRecord(a.content) ? a.content : null;
    if (!page || !content || !isSectionType(content.type)) return null;
    const section = polishSection(shapeNewSection(content.type, content), null, st.facts);
    if (sameJson(section, defaultSection(content.type))) return null;
    const len = page.data.sections?.length ?? 0;
    const pos = Number(a.position);
    const position = Number.isInteger(pos) && pos >= 0 && pos <= len ? pos : len;
    return { type: "add_section", ...pageRef(st.snapshot, page), position, section, summary: summary || `Add a ${content.type} section` };
  },
};

function removeOrMove(kind: "remove_section" | "move_section"): WriteTool["propose"] {
  return (a, st, summary) => {
    const page = findPage(st.snapshot, a.page);
    const index = Number(a.section);
    const before = page?.data.sections?.[index];
    if (!page || !Number.isInteger(index) || !before) return null;
    const slot = `${page.key}:${index}`;
    if (st.editedSections.has(slot)) return null;
    const label = SECTION_LABEL_FOR[before.type];
    if (kind === "remove_section") {
      st.editedSections.add(slot);
      return { type: "remove_section", ...pageRef(st.snapshot, page), sectionIndex: index, before, summary: summary || `Remove the ${label} section` };
    }
    const last = page.data.sections.length - 1;
    const to = Math.min(Math.max(Number(a.to), 0), last);
    if (!Number.isInteger(to) || to === index) return null;
    st.editedSections.add(slot);
    return { type: "move_section", ...pageRef(st.snapshot, page), sectionIndex: index, to, before, summary: summary || `Move the ${label} section` };
  };
}

const removeSection: WriteTool = {
  name: "remove_section",
  group: "site",
  description: "Remove (hide) a section from a page. Only when the owner asks to remove, hide or delete it.",
  jsonShape: '{ "type": "remove_section", "page": page key, "section": section number, "summary": string }',
  parameters: params({ page: PAGE, section: SECTION }, ["page", "section"]),
  propose: removeOrMove("remove_section"),
};

const moveSection: WriteTool = {
  name: "move_section",
  group: "site",
  description: "Move a section to a new position on its page.",
  jsonShape: '{ "type": "move_section", "page": page key, "section": section number, "to": new section number, "summary": string }',
  parameters: params({ page: PAGE, section: SECTION, to: { type: "integer", description: "New section number." } }, ["page", "section", "to"]),
  propose: removeOrMove("move_section"),
};

const setSeo: WriteTool = {
  name: "set_seo",
  group: "site",
  description: "Set a page's Google title and description.",
  jsonShape: '{ "type": "set_seo", "page": page key, "title": string, "description": string, "summary": string }',
  parameters: params({ page: PAGE, title: str(`At most ${BUDGETS.seoTitle} characters.`), description: str(`At most ${BUDGETS.seoDescription} characters.`) }, ["page"]),
  propose(a, st, summary) {
    const page = findPage(st.snapshot, a.page);
    if (!page) return null;
    const before = { title: page.data.seo?.title ?? "", description: page.data.seo?.description ?? "" };
    const title = fitSentence(cleanCopyField(clip(a.title, 200), "title", st.facts), BUDGETS.seoTitle);
    const description = fitSentence(cleanCopyField(clip(a.description, 400), "description", st.facts), BUDGETS.seoDescription);
    const after = { title: title || before.title, description: description || before.description };
    if (sameJson(before, after)) return null;
    return { type: "set_seo", ...pageRef(st.snapshot, page), before, after, summary: summary || "Improve search title and description" };
  },
};

const updateProfile: WriteTool = {
  name: "update_profile",
  group: "site",
  description: "Change business details shown across the site: name, tagline, description, address, phone, WhatsApp, email, social links, opening hours.",
  jsonShape: '{ "type": "update_profile", "fields": { only the business details to change, e.g. "phone": string, "hours": string }, "summary": string }',
  parameters: params(
    {
      fields: {
        type: "object",
        description: "Only the details to change. Use \"\" to clear one.",
        properties: {
          business_name: str("Business name"), tagline: str("Tagline"), description: str("About the business"), address: str("Address"),
          phone: str("Phone, exactly as the owner typed it"), whatsapp: str("WhatsApp number, exactly as typed"), email: str("Email, exactly as typed"),
          instagram: str("Instagram handle or link"), facebook: str("Facebook link"), twitter: str("X / Twitter handle"), tiktok: str("TikTok handle"),
          hours: str("Opening hours, one line per row"),
        },
        additionalProperties: false,
      },
    },
    ["fields"],
  ),
  propose(a, st, summary) {
    if (st.hasProfileUpdate) return null;
    const fields = isRecord(a.fields) ? a.fields : a;
    const change = shapeProfileUpdate(fields, st.snapshot.profile, st.ownerText, st.facts);
    if (!change) return null;
    st.hasProfileUpdate = true;
    const names = Object.keys(change.after).map((f) => profileFieldLabel(f).toLowerCase());
    return { type: "update_profile", ...change, summary: summary || `Update ${names.join(", ")}` };
  },
};

const addPage: WriteTool = {
  name: "add_page",
  group: "site",
  description: "Create a new page (saved as a hidden draft). Only when the owner asks for a new page.",
  jsonShape: '{ "type": "add_page", "name": string, "layout": layout key, "sections": [full section JSON, ...], "summary": string }',
  parameters: params(
    {
      name: str("Page name for the menu, e.g. \"Catering\"."),
      layout: str("A layout key from the list in the instructions."),
      sections: { type: "array", description: "The layout's sections filled with real copy; hero first, contact_card last.", items: obj("A section JSON") },
    },
    ["name"],
  ),
  propose(a, st, summary) {
    const label = clip(a.name, 40);
    const base = slugify(label);
    if (!label || !base) return null;
    const key = uniquePageKey(base, st.takenKeys);
    const layouts = layoutOptions(st.snapshot.templateKey);
    const layout = layouts.find((l) => l.key === a.layout) ?? layouts.find((l) => l.key === "page")!;
    const fromModel = Array.isArray(a.sections)
      ? a.sections
          .filter((s): s is Record<string, unknown> => isRecord(s) && isSectionType(s.type))
          .slice(0, 10)
          .map((s) => polishSection(shapeNewSection(s.type as Section["type"], s), null, st.facts))
      : [];
    const data: PageData =
      fromModel.length > 0 ? { seo: { title: label, description: "" }, sections: fromModel } : buildPresetPageData({ ...layout, label, headline: label });
    st.takenKeys.push(key);
    return { type: "add_page", key, label, data, summary: summary || `Add a "${label}" page` };
  },
};

const addBlogPost: WriteTool = {
  name: "add_blog_post",
  group: "site",
  description: "Write a new blog post (draft unless the owner asked to publish it now).",
  jsonShape:
    '{ "type": "add_blog_post", "title": string, "excerpt": string, "body": article html string, "tags": [string], "seoTitle": string, "seoDescription": string, "publish": boolean, "summary": string }',
  parameters: params(
    {
      title: str("Post title"),
      excerpt: str("One sentence, at most 200 characters."),
      body: str("Article HTML using only p, h2, h3, ul, ol, li, strong, em, blockquote, a."),
      tags: { type: "array", items: { type: "string" }, description: "1 to 3 short topics." },
      seoTitle: str("Google title"),
      seoDescription: str("Google description"),
      publish: bool("True only when the owner asked for it to go live now."),
    },
    ["title", "body"],
  ),
  propose(a, st, summary) {
    if (!st.snapshot.blog || st.postCount >= MAX_BLOG_POSTS) return null;
    const post = shapeBlogPost(a, st.facts, st.takenPostSlugs);
    if (!post || st.takenPostTitles.includes(post.title.toLowerCase())) return null;
    st.takenPostSlugs.push(post.slug);
    st.takenPostTitles.push(post.title.toLowerCase());
    st.postCount++;
    return { type: "add_blog_post", post, summary: summary || `Blog post: “${post.title}”` };
  },
};

const addProduct: WriteTool = {
  name: "add_product",
  group: "shop",
  description: "Add a product to the shop. The price must be one the owner typed.",
  jsonShape:
    '{ "type": "add_product", "name": string, "price": number in naira, "compareAtPrice": number|null, "description": string, "category": string, "stock": number (only for a product with no options), "variants": [{ "options": { "Size": "M", "Colour": "Red" }, "stock": number, "price": number }], "featured": boolean, "imageQuery": string, "photo": number, "summary": string }',
  parameters: params(
    {
      name: str("Product name"),
      price: num("Price in naira, exactly as the owner stated it."),
      compareAtPrice: { type: ["number", "null"], description: "Old price in naira, if the owner gave one." },
      description: str("1 to 3 sentences built only from what the owner said."),
      category: str("An existing category name, or a short new one."),
      stock: num("Stock count, only for a product with no options."),
      variants: {
        type: "array",
        description: "Only options the owner mentioned.",
        items: {
          type: "object",
          properties: { options: obj("e.g. {\"Size\": \"M\"}"), stock: num("Stock for this option"), price: num("Price in naira if different") },
          additionalProperties: false,
        },
      },
      featured: bool("Show it first in the shop."),
      imageQuery: str("2 to 4 words to search a stock photo, e.g. \"red leather handbag\"."),
      photo: { type: "integer", description: "Number of the owner's attached photo to use, if any." },
    },
    ["name", "price"],
  ),
  propose(a, st, summary) {
    if (!st.snapshot.shop) return null;
    const made = shapeNewProduct(a, st.snapshot.shop, st.ownerText, st.facts, st.takenSlugs, st.takenNames);
    if (!made) return null;
    st.takenSlugs.push(made.product.slug);
    st.takenNames.push(made.product.name.toLowerCase());
    return { type: "add_product", product: made.product, categoryIsNew: made.categoryIsNew, imageOptions: [], summary: summary || describeProduct(made.product) };
  },
};

const updateProduct: WriteTool = {
  name: "update_product",
  group: "shop",
  description: "Change an existing product (name, description, price, category, visibility, featured). Hide with active:false instead of deleting.",
  jsonShape:
    '{ "type": "update_product", "productId": id from the SHOP block, "newName": string, "description": string, "price": number, "compareAtPrice": number|null, "category": string, "active": boolean, "featured": boolean, "summary": string }',
  parameters: params(
    {
      productId: str("Id exactly as shown in the SHOP block."),
      newName: str("New name"),
      description: str("New description"),
      price: num("New price in naira, as the owner stated it."),
      compareAtPrice: { type: ["number", "null"], description: "Old price in naira." },
      category: str("Category name"),
      active: bool("False hides it from the shop."),
      featured: bool("Show it first in the shop."),
    },
    ["productId"],
  ),
  propose(a, st, summary) {
    if (!st.snapshot.shop) return null;
    const change = shapeProductUpdate(a, st.snapshot.shop, st.ownerText, st.facts);
    if (!change || st.touchedProducts.has(`u:${change.product.id}`)) return null;
    st.touchedProducts.add(`u:${change.product.id}`);
    return {
      type: "update_product", productId: change.product.id, productName: change.product.name,
      before: change.before, after: change.after, categoryIsNew: change.categoryIsNew,
      summary: summary || `Update “${change.product.name}”`,
    };
  },
};

const setStock: WriteTool = {
  name: "set_stock",
  group: "shop",
  description: "Set stock counts for an existing product. Use only numbers the owner gave (0 = sold out).",
  jsonShape:
    '{ "type": "set_stock", "productId": id from the SHOP block, "changes": [{ "variantId": id from the SHOP block or null when the product has no options, "stock": number }], "summary": string }',
  parameters: params(
    {
      productId: str("Id exactly as shown in the SHOP block."),
      changes: {
        type: "array",
        items: {
          type: "object",
          properties: { variantId: { type: ["string", "null"], description: "Option id from the SHOP block, or null when the product has no options." }, stock: num("New stock count") },
          additionalProperties: false,
        },
      },
    },
    ["productId", "changes"],
  ),
  propose(a, st, summary) {
    if (!st.snapshot.shop) return null;
    const change = shapeStockUpdate(a, st.snapshot.shop, st.ownerText);
    if (!change || st.touchedProducts.has(`s:${change.product.id}`)) return null;
    st.touchedProducts.add(`s:${change.product.id}`);
    return { type: "set_stock", productId: change.product.id, productName: change.product.name, changes: change.changes, summary: summary || `Update stock for “${change.product.name}”` };
  },
};

/** Every write tool, keyed by the proposal type it produces. Adding a capability starts here. */
export const WRITE_TOOLS: { [K in ActionType]: WriteTool & { name: K } } = {
  edit_section: editSection as WriteTool & { name: "edit_section" },
  add_section: addSection as WriteTool & { name: "add_section" },
  remove_section: removeSection as WriteTool & { name: "remove_section" },
  move_section: moveSection as WriteTool & { name: "move_section" },
  set_seo: setSeo as WriteTool & { name: "set_seo" },
  update_profile: updateProfile as WriteTool & { name: "update_profile" },
  add_page: addPage as WriteTool & { name: "add_page" },
  add_blog_post: addBlogPost as WriteTool & { name: "add_blog_post" },
  add_product: addProduct as WriteTool & { name: "add_product" },
  update_product: updateProduct as WriteTool & { name: "update_product" },
  set_stock: setStock as WriteTool & { name: "set_stock" },
};

export function writeToolList(): WriteTool[] {
  return Object.values(WRITE_TOOLS);
}

export function isWriteTool(name: unknown): name is ActionType {
  return typeof name === "string" && Object.hasOwn(WRITE_TOOLS, name);
}

/** Write tools as specs for a tool-calling model. */
export function writeToolSpecs(): ToolSpec[] {
  return writeToolList().map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }));
}

/** The JSON-in-text answer shape for models without tool calling. */
export function jsonActionShape(): string {
  return `{\n  "reply": string,\n  "actions": [\n${writeToolList().map((t) => `    ${t.jsonShape}`).join(",\n")}\n  ]\n}`;
}

export type ProposeResult = { ok: true; action: AssistantAction } | { ok: false; reason: string };

/**
 * Validates proposals from either path, numbers them and enforces the per-answer caps. A proposal
 * is only ever a suggestion: the owner applies it from the panel.
 */
export class ProposalCollector {
  readonly actions: AssistantAction[] = [];
  private readonly st: ProposalState;
  private siteCount = 0;
  private shopCount = 0;

  constructor(snapshot: SiteSnapshot, ownerText: string) {
    this.st = {
      snapshot,
      ownerText,
      facts: assistantFacts(snapshot, ownerText),
      takenKeys: snapshot.pages.map((p) => p.key),
      editedSections: new Set(),
      takenSlugs: (snapshot.shop?.products ?? []).map((x) => x.slug),
      takenNames: (snapshot.shop?.products ?? []).map((x) => x.name.trim().toLowerCase()),
      touchedProducts: new Set(),
      takenPostSlugs: (snapshot.blog?.posts ?? []).map((x) => x.slug),
      takenPostTitles: (snapshot.blog?.posts ?? []).map((x) => x.title.trim().toLowerCase()),
      postCount: 0,
      hasProfileUpdate: false,
    };
  }

  propose(name: unknown, args: unknown): ProposeResult {
    if (!isWriteTool(name)) return { ok: false, reason: `There is no change called "${String(name).slice(0, 40)}".` };
    const tool: WriteTool = WRITE_TOOLS[name];
    const a = isRecord(args) ? args : {};
    if (tool.group === "shop" ? this.shopCount >= MAX_PRODUCT_ACTIONS : this.siteCount >= MAX_ACTIONS) {
      return { ok: false, reason: "That is as many changes as one answer can hold. Tell the owner to apply these first, then ask for the rest." };
    }
    const draft = tool.propose(a, this.st, clip(a.summary, 160));
    if (!draft) {
      return {
        ok: false,
        reason:
          "Not proposed: it pointed at something that does not exist, changed nothing, repeated another change, or used a detail (price, number, contact) the owner did not give. Check the ids and numbers, or ask the owner.",
      };
    }
    if (tool.group === "shop") this.shopCount++;
    else this.siteCount++;
    const action = { ...draft, id: `a${this.actions.length + 1}` } as AssistantAction;
    this.actions.push(action);
    return { ok: true, action };
  }

  result(reply: unknown): AssistantResult {
    const text = typeof reply === "string" ? reply.replace(/[*_`#]+/g, "").trim().slice(0, MAX_REPLY_CHARS) : "";
    const fallback = this.actions.length
      ? "Here is what I suggest. Review each change and tap Apply on the ones you like."
      : "I could not work out a change to make. Could you tell me a bit more about what you want?";
    return { reply: text || fallback, actions: [...this.actions] };
  }
}

/**
 * Turns a JSON-in-text answer into validated actions. Anything malformed, pointing at a page or
 * section that does not exist, or making no change is dropped rather than shown to the owner.
 */
export function parseAssistantOutput(raw: unknown, snapshot: SiteSnapshot, ownerText = ""): AssistantResult {
  const collector = new ProposalCollector(snapshot, ownerText);
  const obj = isRecord(raw) ? raw : {};
  const rawActions = Array.isArray(obj.actions) ? obj.actions.slice(0, (MAX_ACTIONS + MAX_PRODUCT_ACTIONS) * 2) : [];
  for (const a of rawActions) if (isRecord(a)) collector.propose(a.type, a);
  return collector.result(obj.reply);
}

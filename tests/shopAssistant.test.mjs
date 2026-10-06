import { test } from "node:test";
import assert from "node:assert/strict";

import { openRouterBody } from "../src/lib/ai/openrouter.server.ts";
import {
  enrichProductImages,
  libraryMatches,
  mapPexels,
  mapUnsplash,
  parsePicks,
  pickWithVision,
  searchProductPhotos,
} from "../src/lib/ai/productImages.server.ts";
import {
  cleanOwnerPhotos,
  fieldsToColumns,
  isAllowedProductImageUrl,
  ownerNumbers,
  priceToKobo,
  productMatches,
  renderShop,
  shapeNewProduct,
  shapeProductUpdate,
  shapeStockUpdate,
  shopFromRows,
  uniqueProductSlug,
} from "../src/lib/ai/shopAssistant.ts";
import { assistantFacts, buildAssistantPrompt, effortFor, parseAssistantOutput } from "../src/lib/ai/siteAssistant.ts";

const shop = () =>
  shopFromRows({
    categories: [{ id: "c1", name: "Dresses" }],
    products: [
      { id: "p1", name: "Ankara Dress", slug: "ankara-dress", description: "Bold print", images: [], price_kobo: 1850000, compare_at_kobo: null, category_id: "c1", active: true, featured: false },
      { id: "p2", name: "Tote Bag", slug: "tote-bag", description: "", images: [{ url: "x" }], price_kobo: 800000, compare_at_kobo: 1000000, category_id: null, active: false, featured: true },
    ],
    variants: [
      { id: "v1", product_id: "p1", options: { Size: "M" }, price_kobo: null, stock: 5 },
      { id: "v2", product_id: "p1", options: { Size: "L" }, price_kobo: null, stock: 0 },
    ],
  });

const facts = (s, text = "") => assistantFacts({ templateKey: "t14", businessName: "Shop", profile: {}, pages: [], shop: s }, text);
const snap = (s = shop()) => ({ templateKey: "t14", businessName: "Shop", profile: {}, pages: [], shop: s });

test("ownerNumbers understands the ways owners write amounts", () => {
  const n = ownerNumbers("Price ₦12,500, was 15k, bulk 2m, sizes 5 each, 18500.50");
  for (const v of [12500, 15, 15000, 2, 2_000_000, 5, 18500.5]) assert.ok(n.has(v), String(v));
});

test("priceToKobo converts naira and rejects junk", () => {
  assert.equal(priceToKobo(12500), 1250000);
  assert.equal(priceToKobo("₦12,500"), 1250000);
  assert.equal(priceToKobo("18500.50"), 1850050);
  for (const bad of [0, -5, "free", null, "12.345", 1e12]) assert.equal(priceToKobo(bad), null);
});

test("a new product needs a price the owner actually stated", () => {
  const raw = { name: "Silk Scarf", price: 9000, description: "Soft silk scarf." };
  assert.equal(shapeNewProduct(raw, shop(), "add a silk scarf", facts(shop()), [], []), null);
  const ok = shapeNewProduct(raw, shop(), "add a silk scarf at 9,000", facts(shop(), "9,000"), [], []);
  assert.equal(ok.product.priceKobo, 900000);
  assert.equal(ok.product.slug, "silk-scarf");
});

test("new product: stock only from the owner, standard variant for simple stock, categories matched", () => {
  const said = "Add Straw Hat 4500, 12 in stock, in Dresses";
  const a = shapeNewProduct({ name: "Straw Hat", price: 4500, stock: 12, category: "dresses" }, shop(), said, facts(shop(), said), [], []);
  assert.deepEqual(a.product.variants, [{ options: { Option: "Standard" }, priceKobo: null, stock: 12 }]);
  assert.equal(a.product.category, "Dresses");
  assert.equal(a.categoryIsNew, false);

  const invented = shapeNewProduct({ name: "Straw Hat", price: 4500, stock: 40 }, shop(), said, facts(shop(), said), [], []);
  assert.deepEqual(invented.product.variants, []);

  const fresh = shapeNewProduct({ name: "Straw Hat", price: 4500, category: "Accessories" }, shop(), said, facts(shop(), said), [], []);
  assert.equal(fresh.categoryIsNew, true);
});

test("variants carry their own stock; duplicates and empty options are dropped", () => {
  const said = "Linen shirt 7000, M 3, L 4";
  const r = shapeNewProduct(
    {
      name: "Linen Shirt", price: 7000,
      variants: [
        { options: { Size: "M" }, stock: 3 },
        { options: { Size: "L" }, stock: 4 },
        { options: { Size: "M" }, stock: 9 },
        { options: {} },
      ],
    },
    shop(), said, facts(shop(), said), [], [],
  );
  assert.deepEqual(r.product.variants.map((v) => [v.options.Size, v.stock]), [["M", 3], ["L", 4]]);
});

test("duplicate names are not added again; slugs stay unique and never reserved", () => {
  const said = "Ankara Dress 18500";
  assert.equal(shapeNewProduct({ name: "ankara dress", price: 18500 }, shop(), said, facts(shop(), said), [], ["ankara dress"]), null);
  assert.equal(uniqueProductSlug("Tote Bag", ["tote-bag"]), "tote-bag-2");
  assert.equal(uniqueProductSlug("Cart", []), "cart-item");
  assert.equal(uniqueProductSlug("!!!", []), "product");
});

test("compare-at must be a stated price above the price", () => {
  const said = "Bag 8000 was 10000";
  const r = shapeNewProduct({ name: "Bag", price: 8000, compareAtPrice: 10000 }, shop(), said, facts(shop(), said), [], []);
  assert.equal(r.product.compareAtKobo, 1000000);
  const low = shapeNewProduct({ name: "Bag", price: 8000, compareAtPrice: 5000 }, shop(), "Bag 8000 5000", facts(shop(), "5000"), [], []);
  assert.equal(low.product.compareAtKobo, null);
});

test("update_product: only stated prices, real differences, resolves by id", () => {
  const said = "make the dress 20,000 and hide the tote";
  const u = shapeProductUpdate({ productId: "p1", price: 20000 }, shop(), said, facts(shop(), said));
  assert.deepEqual(u.after, { priceKobo: 2000000 });
  assert.deepEqual(u.before, { priceKobo: 1850000 });
  assert.equal(shapeProductUpdate({ productId: "p1", price: 99999 }, shop(), said, facts(shop(), said)), null);
  assert.equal(shapeProductUpdate({ productId: "p1", price: 18500 }, shop(), "18500", facts(shop(), "18500")), null, "no change");
  const hide = shapeProductUpdate({ product: "Tote Bag", active: true }, shop(), said, facts(shop(), said));
  assert.deepEqual(hide.after, { active: true });
  assert.equal(shapeProductUpdate({ productId: "nope" }, shop(), said, facts(shop(), said)), null);
});

test("set_stock: owner figures only, by variant label or id, zero always allowed", () => {
  const said = "M has 8 now, L sold out";
  const r = shapeStockUpdate({ productId: "p1", changes: [{ variant: "M", stock: 8 }, { variantId: "v2", stock: 0 }, { variant: "M", stock: 99 }] }, shop(), said);
  assert.deepEqual(r.changes.map((c) => [c.variantId, c.before, c.after]), [["v1", 5, 8]]);
  const zero = shapeStockUpdate({ productId: "p1", changes: [{ variantId: "v1", stock: 0 }] }, shop(), "M sold out");
  assert.equal(zero.changes[0].after, 0);
  assert.equal(shapeStockUpdate({ productId: "p1", changes: [{ variantId: "v1", stock: 77 }] }, shop(), "restock"), null);
});

test("set_stock on a product without options creates a Standard variant", () => {
  const r = shapeStockUpdate({ productId: "p2", stock: 6 }, shop(), "tote bag 6 pieces");
  assert.deepEqual(r.changes, [{ variantId: null, label: "Standard", before: null, after: 6 }]);
});

test("renderShop lists ids, prices, stock and what is missing", () => {
  const t = renderShop(shop());
  assert.match(t, /SHOP: 2 products\. Categories: Dresses\./);
  assert.match(t, /PRODUCT id=p1 "Ankara Dress" ₦18,500 \| Dresses \| live \| photos: 0 \| stock: M=5; L=0/);
  assert.match(t, /"Tote Bag" ₦8,000 \(was ₦10,000\) \| uncategorised \| hidden, featured \| photos: 1 \| stock: no variants/);
  assert.match(renderShop(null), /not available/);
  assert.match(renderShop(shopFromRows({ categories: [], products: [], variants: [] })), /no products yet/);
});

test("shopFromRows skips unusable rows and reads bigint strings", () => {
  const s = shopFromRows({
    categories: [],
    products: [{ id: "a", name: "A", slug: "a", price_kobo: "5000" }, { id: "b", name: "B", slug: "b", price_kobo: null }],
    variants: [],
  });
  assert.equal(s.products.length, 1);
  assert.equal(s.products[0].priceKobo, 5000);
});

test("image urls are limited to the stock providers and the site's own storage", () => {
  assert.ok(isAllowedProductImageUrl("https://images.pexels.com/photos/1/x.jpeg"));
  assert.ok(isAllowedProductImageUrl("https://images.unsplash.com/photo-1?w=9"));
  assert.ok(isAllowedProductImageUrl("https://abc.supabase.co/storage/v1/x.jpg", ["abc.supabase.co"]));
  for (const bad of ["http://images.pexels.com/x.jpg", "https://evil.example/x.jpg", "javascript:alert(1)", 5, "https://images.pexels.com.evil.example/x"]) {
    assert.equal(isAllowedProductImageUrl(bad), false, String(bad));
  }
});

test("attached photos: small image data urls only, at most three", () => {
  const good = "data:image/jpeg;base64,AAAA";
  assert.deepEqual(cleanOwnerPhotos([good, good, good, good]), [good, good, good]);
  assert.deepEqual(cleanOwnerPhotos(["data:text/html;base64,AAAA", "https://x/y.jpg", 4, "data:image/svg+xml;base64,AAAA"]), []);
  assert.deepEqual(cleanOwnerPhotos(["data:image/png;base64," + "A".repeat(900_001)]), []);
});

test("column mapping and stale check for product updates", () => {
  assert.deepEqual(fieldsToColumns({ priceKobo: 5, active: false, description: "" }, null), { price_kobo: 5, active: false, description: null, category_id: null });
  const row = { name: "A", description: null, price_kobo: "100", compare_at_kobo: null, active: true, featured: false };
  assert.ok(productMatches(row, { priceKobo: 100, description: "" }, null));
  assert.equal(productMatches(row, { priceKobo: 200 }, null), false);
  assert.ok(productMatches(row, { category: "dresses" }, "Dresses"));
});

// ---------- parsing inside the assistant ----------

test("bulk catalogue: many products in one answer, unpriced ones dropped, site edits still capped separately", () => {
  const items = Array.from({ length: 12 }, (_, i) => ({ type: "add_product", name: `Item ${i + 1}`, price: 1000 + i }));
  items.push({ type: "add_product", name: "No Price Item" });
  const said = Array.from({ length: 12 }, (_, i) => `Item ${i + 1} ${1000 + i}`).join(", ") + ", plus a no price item";
  const out = parseAssistantOutput({ reply: "Here you go", actions: items }, snap(), said);
  const added = out.actions.filter((a) => a.type === "add_product");
  assert.equal(added.length, 12);
  assert.ok(!added.some((a) => a.product.name === "No Price Item"));
  assert.equal(new Set(added.map((a) => a.product.slug)).size, 12);
});

test("the same product twice in one answer is added once", () => {
  const out = parseAssistantOutput(
    { actions: [{ type: "add_product", name: "Bead Necklace", price: 3000 }, { type: "add_product", name: "bead necklace", price: 3000 }] },
    snap(), "Bead Necklace 3000",
  );
  assert.equal(out.actions.length, 1);
});

test("product actions need the shop to be readable", () => {
  const out = parseAssistantOutput({ actions: [{ type: "add_product", name: "Hat", price: 100 }] }, { ...snap(), shop: null }, "Hat 100");
  assert.equal(out.actions.length, 0);
});

test("update and stock actions come through with names and defaults", () => {
  const out = parseAssistantOutput(
    {
      actions: [
        { type: "update_product", productId: "p1", price: 20000 },
        { type: "set_stock", productId: "p1", changes: [{ variantId: "v2", stock: 6 }] },
      ],
    },
    snap(), "dress 20,000 and L restocked 6",
  );
  assert.deepEqual(out.actions.map((a) => a.type), ["update_product", "set_stock"]);
  assert.match(out.actions[0].summary, /Ankara Dress/);
});

test("prompt shows the shop, the product rules and attached-photo notes", () => {
  const { system, user } = buildAssistantPrompt({
    snapshot: snap(),
    messages: [{ role: "user", content: "add this" }],
    photoNotes: ["A red leather handbag with a gold clasp"],
  });
  assert.match(user, /PRODUCT id=p1 "Ankara Dress"/);
  assert.match(user, /1\. A red leather handbag/);
  assert.match(system, /PRODUCTS:/);
  assert.match(system, /never guess or estimate one/);
  assert.match(system, /imageQuery/);
});

test("advice questions get more thinking than plain edits", () => {
  assert.equal(effortFor("How can I sell more bags?"), "high");
  assert.equal(effortFor("What should I improve on my site?"), "high");
  assert.equal(effortFor("change my phone to 0803"), "medium");
});

// ---------- images ----------

const pexels = {
  photos: [
    { photographer: "Ada", alt: "Red handbag", src: { large: "https://images.pexels.com/photos/1/a-large.jpeg", medium: "https://images.pexels.com/photos/1/a-medium.jpeg" } },
    { photographer: "Bo", src: { large: "https://evil.example/b.jpeg", medium: "https://evil.example/b.jpeg" } },
    { photographer: "Cy", src: { large: "https://images.pexels.com/photos/3/c-large.jpeg", medium: "https://images.pexels.com/photos/3/c-medium.jpeg" } },
  ],
};

test("Pexels and Unsplash results map to choices; other hosts are dropped", () => {
  const p = mapPexels(pexels, "bag");
  assert.deepEqual(p.map((c) => c.credit), ["Photo by Ada on Pexels", "Photo by Cy on Pexels"]);
  assert.equal(p[0].alt, "Red handbag");
  assert.equal(p[1].alt, "bag");
  const u = mapUnsplash({ results: [{ alt_description: "straw hat", user: { name: "Di" }, urls: { regular: "https://images.unsplash.com/photo-9?w=1080", small: "https://images.unsplash.com/photo-9?w=400" } }] }, "hat");
  assert.equal(u[0].source, "unsplash");
  assert.equal(mapPexels(null, "x").length, 0);
});

test("library fallback only returns photos that really match, never a random category", () => {
  assert.ok(libraryMatches("team meeting").length > 0);
  assert.deepEqual(libraryMatches("zebra striped handbag"), []);
  assert.deepEqual(libraryMatches("the and"), []);
});

function fakeFetch(routes) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url: String(url), init });
    for (const [match, body] of routes) if (String(url).includes(match)) return new Response(JSON.stringify(typeof body === "function" ? body(init) : body), { status: 200 });
    return new Response("{}", { status: 404 });
  };
  f.calls = calls;
  return f;
}

test("search uses the Pexels key, falls back to curated shots without keys", async () => {
  const f = fakeFetch([["api.pexels.com", pexels]]);
  const found = await searchProductPhotos("red handbag", { env: { PEXELS_API_KEY: "k" }, fetch: f });
  assert.equal(f.calls[0].init.headers.Authorization, "k");
  assert.match(f.calls[0].url, /query=red%20handbag/);
  assert.equal(found[0].source, "pexels");

  const none = await searchProductPhotos("zebra striped handbag", { env: {}, fetch: f });
  assert.deepEqual(none, []);
});

test("parsePicks keeps order, drops unknown numbers and caps at three", () => {
  const c = [1, 2, 3, 4].map((n) => ({ url: `u${n}`, thumb: `t${n}`, alt: "", credit: null, source: "pexels", why: null }));
  const out = parsePicks({ picks: [{ image: 3, why: "Shows a red bag" }, { image: 9 }, { image: 1 }, { image: 3 }, { image: 2 }, { image: 4 }] }, c);
  assert.deepEqual(out.map((x) => [x.url, x.why]), [["u3", "Shows a red bag"], ["u1", null], ["u2", null]]);
  assert.equal(parsePicks({}, c), null);
  assert.deepEqual(parsePicks({ picks: [] }, c), []);
});

const orEnv = { OPENROUTER_API_KEY: "or", PEXELS_API_KEY: "px" };
const orReply = (obj) => ({ choices: [{ message: { content: JSON.stringify(obj) } }] });

test("the vision model sees the candidate photos and only its picks survive", async () => {
  const cands = mapPexels(pexels, "bag");
  const f = fakeFetch([["openrouter.ai", () => orReply({ picks: [{ image: 2, why: "A red leather handbag on a table" }] })]]);
  const out = await pickWithVision({ name: "Red Handbag", description: "", query: "red handbag" }, cands, { env: orEnv, fetch: f });
  assert.deepEqual(out.map((c) => c.url), [cands[1].url]);
  assert.equal(out[0].why, "A red leather handbag on a table");
  const sent = JSON.parse(f.calls[0].init.body);
  assert.equal(sent.model, "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free");
  const parts = sent.messages.at(-1).content;
  assert.equal(parts[0].type, "text");
  assert.deepEqual(parts.slice(1).map((p) => p.image_url.url), cands.map((c) => c.thumb));
});

test("vision off, failing or garbled means null so the caller can fall back", async () => {
  const cands = mapPexels(pexels, "bag");
  assert.equal(await pickWithVision({ name: "x", description: "", query: "x" }, cands, { env: { ...orEnv, AI_VISION: "off" }, fetch: fakeFetch([]) }), null);
  assert.equal(await pickWithVision({ name: "x", description: "", query: "x" }, cands, { env: {}, fetch: fakeFetch([]) }), null);
  const bad = fakeFetch([["openrouter.ai", { choices: [{ message: { content: "no json here" } }] }]]);
  assert.equal(await pickWithVision({ name: "x", description: "", query: "x" }, cands, { env: orEnv, fetch: bad }), null);
});

test("an OPENROUTER_VISION_MODEL override is honoured", async () => {
  const f = fakeFetch([["openrouter.ai", () => orReply({ picks: [] })]]);
  await pickWithVision({ name: "x", description: "", query: "x" }, mapPexels(pexels, "x"), { env: { ...orEnv, OPENROUTER_VISION_MODEL: "acme/vision-1" }, fetch: f });
  assert.equal(JSON.parse(f.calls[0].init.body).model, "acme/vision-1");
});

test("request body: images become image_url parts after the text", () => {
  const b = openRouterBody("m", { user: "look", images: ["data:image/jpeg;base64,AA", "https://x/y.jpg"] });
  const content = b.messages.at(-1).content;
  assert.deepEqual(content.map((p) => p.type), ["text", "image_url", "image_url"]);
  assert.equal(openRouterBody("m", { user: "plain" }).messages.at(-1).content, "plain");
});

function productActions(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `a${i + 1}`, type: "add_product", summary: "", categoryIsNew: false, imageOptions: [],
    product: { name: `Item ${i + 1}`, slug: `item-${i + 1}`, description: "", priceKobo: 100, compareAtKobo: null, category: null, featured: false, variants: [], imageQuery: `item ${i + 1} photo`, photo: null },
  }));
}

test("enrich: vision-confirmed photos, owner photo, and graceful fallback", async () => {
  const actions = productActions(3);
  actions[2].product.photo = 1;
  const f = fakeFetch([
    ["api.pexels.com", pexels],
    ["openrouter.ai", () => orReply({ picks: [{ image: 1, why: "Matches the item" }] })],
  ]);
  await enrichProductImages(actions, Date.now() + 60_000, { env: orEnv, fetch: f });
  assert.equal(actions[0].imageOptions[0].why, "Matches the item");
  assert.equal(actions[2].imageOptions[0].source, "upload");
  assert.equal(actions[2].imageOptions[0].url, "upload:1");
  // The same photo is not suggested for two products.
  assert.notEqual(actions[0].imageOptions[0]?.url, actions[1].imageOptions[0]?.url);

  const down = productActions(1);
  const noVision = fakeFetch([["api.pexels.com", pexels], ["openrouter.ai", () => { throw new Error("boom"); }]]);
  await enrichProductImages(down, Date.now() + 60_000, { env: orEnv, fetch: noVision });
  assert.ok(down[0].imageOptions.length > 0, "falls back to the search order when vision fails");
});

test("enrich stops starting work near the deadline and never throws", async () => {
  const actions = productActions(2);
  const f = fakeFetch([["api.pexels.com", pexels]]);
  await enrichProductImages(actions, Date.now() + 1000, { env: orEnv, fetch: f });
  assert.equal(f.calls.length, 0);
  const broken = async () => { throw new Error("network"); };
  await enrichProductImages(productActions(1), Date.now() + 60_000, { env: orEnv, fetch: broken });
});

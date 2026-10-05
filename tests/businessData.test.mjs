import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNairaToKobo, koboToNairaInput, formatKobo } from "../src/lib/businessData/price.ts";
import { kindsForTemplate, kindDefForTemplate, templateOffersKind } from "../src/lib/businessData/kinds.ts";
import { parseItemForm, emptyForm } from "../src/lib/businessData/validate.ts";
import { mergeBusinessData, orderItems, planBusinessData } from "../src/lib/businessData/merge.ts";
import { seedFromPages } from "../src/lib/businessData/seed.ts";

const row = (o) => ({ id: o.id ?? Math.random().toString(36).slice(2), site_id: "s", kind: "menu_item", position: 0, name: "X", price_kobo: null, data: {}, active: true, ...o });
const page = (sections) => ({ seo: { title: "", description: "" }, sections });

test("parseNairaToKobo", () => {
  assert.deepEqual(parseNairaToKobo("3,500"), { kobo: 350000 });
  assert.deepEqual(parseNairaToKobo("₦3500.5"), { kobo: 350050 });
  assert.deepEqual(parseNairaToKobo("NGN 1 200.05"), { kobo: 120005 });
  assert.deepEqual(parseNairaToKobo(""), { kobo: null });
  assert.deepEqual(parseNairaToKobo("0"), { kobo: 0 });
  assert.ok("error" in parseNairaToKobo("-5"));
  assert.ok("error" in parseNairaToKobo("1.234"));
  assert.ok("error" in parseNairaToKobo("abc"));
  assert.ok("error" in parseNairaToKobo("99999999999"));
  assert.deepEqual(parseNairaToKobo("10000000000"), { kobo: 1_000_000_000_000 });
});

test("koboToNairaInput / formatKobo", () => {
  assert.equal(koboToNairaInput(350000), "3500");
  assert.equal(koboToNairaInput(350050), "3500.50");
  assert.equal(koboToNairaInput(null), "");
  assert.equal(formatKobo(350000), "₦3,500");
  assert.equal(formatKobo(350050), "₦3,500.50");
});

test("kinds per template category", () => {
  assert.deepEqual(kindsForTemplate("t7"), ["menu_item"]);
  assert.deepEqual(kindsForTemplate("t8"), ["doctor", "service"]);
  assert.deepEqual(kindsForTemplate("t9"), ["timetable_slot"]);
  assert.deepEqual(kindsForTemplate("t10"), ["programme"]);
  assert.deepEqual(kindsForTemplate("t11"), ["package"]);
  assert.deepEqual(kindsForTemplate("t12"), ["project", "service"]);
  assert.deepEqual(kindsForTemplate("t6"), ["project"]);
  assert.deepEqual(kindsForTemplate("t13"), []);
  assert.deepEqual(kindsForTemplate("t14"), []);
  assert.equal(templateOffersKind("t7", "doctor"), false);
  assert.equal(templateOffersKind("t7", "menu_item"), true);
  assert.equal(kindDefForTemplate("project", "t6").plural, "Properties");
  assert.deepEqual(
    kindDefForTemplate("project", "t6").fields.find((f) => f.key === "status").options.map((o) => o.value),
    ["available", "under_offer", "sold"],
  );
  assert.equal(kindDefForTemplate("project", "t12").plural, "Projects");
});

test("no template offers two kinds for one section target", () => {
  for (let i = 1; i <= 14; i++) {
    const kinds = kindsForTemplate(`t${i}`);
    const targets = kinds.map((k) => kindDefForTemplate(k, `t${i}`).target);
    assert.equal(new Set(targets).size, targets.length, `t${i}`);
  }
});

test("parseItemForm menu item", () => {
  const def = kindDefForTemplate("menu_item", "t7");
  const f = emptyForm(def);
  f.name = "  Jollof   rice ";
  f.price = "3,500";
  f.fields.category = "Mains";
  f.fields.dietary = ["halal", "halal", "spicy"];
  const r = parseItemForm("menu_item", "t7", f);
  assert.ok(r.ok);
  assert.deepEqual(r.value, { name: "Jollof rice", price_kobo: 350000, data: { category: "Mains", dietary: ["halal", "spicy"] }, active: true });
});

test("parseItemForm rejects bad input", () => {
  const f = emptyForm(kindDefForTemplate("menu_item", "t7"));
  let r = parseItemForm("menu_item", "t7", f);
  assert.ok(!r.ok && r.errors.name);
  f.name = "A";
  f.fields.photo = "http://x.test/a.jpg";
  f.fields.dietary = ["pork"];
  f.price = "x";
  r = parseItemForm("menu_item", "t7", f);
  assert.ok(!r.ok && r.errors.photo && r.errors.dietary && r.errors.price);
  r = parseItemForm("menu_item", "t7", { name: "a".repeat(121), price: "", fields: {}, active: true });
  assert.ok(!r.ok && r.errors.name);
});

test("parseItemForm timetable: day/start required, end after start, no price", () => {
  const f = emptyForm(kindDefForTemplate("timetable_slot", "t9"));
  f.name = "Spin";
  let r = parseItemForm("timetable_slot", "t9", f);
  assert.ok(!r.ok && r.errors.day && r.errors.start);
  f.fields.day = "mon";
  f.fields.start = "09:00";
  f.fields.end = "08:00";
  f.price = "500";
  r = parseItemForm("timetable_slot", "t9", f);
  assert.ok(!r.ok && r.errors.end);
  f.fields.end = "10:00";
  r = parseItemForm("timetable_slot", "t9", f);
  assert.ok(r.ok);
  assert.equal(r.value.price_kobo, null);
  assert.deepEqual(r.value.data, { day: "mon", start: "09:00", end: "10:00" });
});

test("parseItemForm project photos and status per category", () => {
  const f = emptyForm(kindDefForTemplate("project", "t12"));
  f.name = "Duplex";
  f.fields.photos = ["https://e.test/1.jpg", "https://e.test/1.jpg", "https://e.test/2.jpg"];
  f.fields.status = "ongoing";
  const r = parseItemForm("project", "t12", f);
  assert.ok(r.ok);
  assert.deepEqual(r.value.data.photos, ["https://e.test/1.jpg", "https://e.test/2.jpg"]);
  f.fields.status = "sold"; // not offered for builders
  assert.ok(!parseItemForm("project", "t12", f).ok);
  assert.ok(parseItemForm("project", "t6", f).ok);
});

test("merge: menu replaces services items, groups by section, formats price", () => {
  const items = [
    row({ id: "a", name: "Suya", price_kobo: 200000, position: 0, data: { category: "Grill" } }),
    row({ id: "b", name: "Jollof", price_kobo: 350000, position: 1, data: { category: "Mains", description: "Smoky", dietary: ["halal"] } }),
    row({ id: "c", name: "Chicken", position: 2, data: { category: "Grill" } }),
    row({ id: "d", name: "Hidden", position: 3, active: false }),
  ];
  const p = page([{ type: "services", items: [{ title: "old", desc: "old" }] }, { type: "richtext", title: "t", body: "b" }]);
  const out = mergeBusinessData(p, items, { templateKey: "t7", pageKey: "about" });
  assert.deepEqual(out.sections[0].items, [
    { title: "Suya", desc: "₦2,000" },
    { title: "Chicken", desc: "" },
    { title: "Jollof", desc: "₦3,500 · Smoky · (Halal)" },
  ]);
  assert.equal(out.sections[1], p.sections[1]);
  assert.equal(p.sections[0].items[0].title, "old"); // input not mutated
});

test("merge: no items -> page returned as-is; items of other templates ignored", () => {
  const p = page([{ type: "services", items: [{ title: "old", desc: "" }] }]);
  assert.equal(mergeBusinessData(p, [], { templateKey: "t7" }), p);
  assert.equal(mergeBusinessData(p, [row({ kind: "doctor", name: "Dr A" })], { templateKey: "t7" }), p);
  assert.equal(mergeBusinessData(p, [row({ active: false })], { templateKey: "t7" }), p);
  assert.equal(mergeBusinessData(p, [row({})], { templateKey: "t13" }), p);
});

test("merge: doctors fill team; services fill services (clinic)", () => {
  const p = page([
    { type: "team", title: "T", subtitle: "", members: [{ name: "old", role: "", bio: "" }] },
    { type: "services", items: [{ title: "old", desc: "" }] },
  ]);
  const items = [
    row({ kind: "doctor", name: "Dr Ada", price_kobo: 1500000, data: { specialty: "Dentist", bio: "Hi", photo: "https://e.test/a.jpg" } }),
    row({ kind: "service", name: "Scaling", price_kobo: 500000, data: { duration: "30 min", description: "Deep clean" } }),
  ];
  const out = mergeBusinessData(p, items, { templateKey: "t8" });
  assert.deepEqual(out.sections[0].members, [{ name: "Dr Ada", role: "Dentist", bio: "Hi Consultation: ₦15,000", photoUrl: "https://e.test/a.jpg" }]);
  assert.deepEqual(out.sections[1].items, [{ title: "Scaling", desc: "₦5,000 · 30 min · Deep clean" }]);
});

test("merge: timetable auto-sorted by day then time", () => {
  const items = [
    row({ kind: "timetable_slot", name: "Yoga", position: 0, data: { day: "wed", start: "07:00" } }),
    row({ kind: "timetable_slot", name: "Spin", position: 1, data: { day: "mon", start: "18:00", end: "19:00", instructor: "Tolu" } }),
    row({ kind: "timetable_slot", name: "Box", position: 2, data: { day: "mon", start: "06:00" } }),
  ];
  const out = mergeBusinessData(page([{ type: "services", items: [] }]), items, { templateKey: "t9" });
  assert.deepEqual(out.sections[0].items.map((i) => i.title), ["Box", "Spin", "Yoga"]);
  assert.equal(out.sections[0].items[1].desc, "Monday 18:00–19:00 · with Tolu");
});

test("merge: projects -> use_cases, photos appended to gallery without duplicates", () => {
  const items = [row({ kind: "project", name: "Duplex", data: { location: "Lekki", status: "completed", description: "Nice", photos: ["https://e.test/1.jpg", "https://e.test/2.jpg"] } })];
  const p = page([
    { type: "use_cases", title: "", description: "", items: [] },
    { type: "gallery", title: "", images: [{ url: "https://e.test/1.jpg", alt: "a" }, { url: "", alt: "" }] },
  ]);
  const out = mergeBusinessData(p, items, { templateKey: "t12" });
  assert.deepEqual(out.sections[0].items, [{ title: "Duplex", description: "Lekki · Completed · Nice" }]);
  assert.deepEqual(out.sections[1].images, [
    { url: "https://e.test/1.jpg", alt: "a" },
    { url: "https://e.test/2.jpg", alt: "Duplex" },
  ]);
});

test("merge: home teaser only when requested", () => {
  const items = Array.from({ length: 10 }, (_, i) => row({ name: `D${i}`, position: i }));
  const p = page([{ type: "services", items: [] }]);
  assert.equal(mergeBusinessData(p, items, { templateKey: "t7", pageKey: "home", homeTeaser: true }).sections[0].items.length, 6);
  assert.equal(mergeBusinessData(p, items, { templateKey: "t7", pageKey: "home", homeTeaser: false }).sections[0].items.length, 10);
  assert.equal(mergeBusinessData(p, items, { templateKey: "t7", pageKey: null, homeTeaser: true }).sections[0].items.length, 10);
});

test("orderItems and plan for shop templates", () => {
  const a = row({ id: "1", position: 1 });
  const b = row({ id: "2", position: 0 });
  assert.deepEqual(orderItems([a, b], {}).map((r) => r.id), ["2", "1"]);
  assert.deepEqual(planBusinessData([a], "t13"), { gallery: [] });
});

test("seedFromPages", () => {
  const pages = [
    page([{ type: "services", items: [{ title: "Starter", desc: "Soup" }, { title: " ", desc: "" }, { title: "starter", desc: "dup" }, { title: "Main", desc: "" }] }]),
    page([
      { type: "services", items: [{ title: "Existing", desc: "x" }] },
      { type: "team", title: "", subtitle: "", members: [{ name: "Dr A", role: "GP", bio: "b" }] },
    ]),
  ];
  const r = seedFromPages("menu_item", "t7", pages, ["existing"]);
  assert.deepEqual(r.map((x) => x.name), ["Starter", "Main"]);
  assert.deepEqual(r[0].data, { description: "Soup" });
  assert.deepEqual(r[1].data, {});
  const docs = seedFromPages("doctor", "t8", pages, []);
  assert.deepEqual(docs, [{ name: "Dr A", price_kobo: null, data: { specialty: "GP", bio: "b" }, active: true }]);
  assert.deepEqual(seedFromPages("project", "t12", pages, []), []);
});

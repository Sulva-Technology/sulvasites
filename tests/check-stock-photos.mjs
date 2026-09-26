// Manual: node --experimental-strip-types --no-warnings tests/check-stock-photos.mjs
import { STOCK_PHOTOS, PEOPLE_PHOTOS } from "../src/lib/stockPhotoData.ts";
const all = [...Object.values(STOCK_PHOTOS).flat(), ...PEOPLE_PHOTOS];
const ids = new Set(all.map((p) => p.id));
if (ids.size !== all.length) console.warn(`duplicate ids: ${all.length - ids.size}`);
let bad = 0;
await Promise.all(all.map(async (p) => {
  const r = await fetch(`https://images.unsplash.com/${p.id}?w=64&q=10`, { method: "HEAD" });
  if (r.status !== 200) { bad++; console.log(r.status, p.id); }
}));
console.log(`${all.length - bad}/${all.length} ok`);
process.exit(bad ? 1 : 0);

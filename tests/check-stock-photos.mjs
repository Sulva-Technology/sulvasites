// Manual: node --experimental-strip-types --no-warnings tests/check-stock-photos.mjs
import { STOCK_PHOTOS, PEOPLE_PHOTOS } from "../src/lib/stockPhotoData.ts";
const all = [...Object.values(STOCK_PHOTOS).flat(), ...PEOPLE_PHOTOS];
const ids = new Set(all.map((p) => p.id));
if (ids.size !== all.length) console.warn(`duplicate ids: ${all.length - ids.size}`);

let bad = 0;
const concurrency = 8;
let running = 0;
let index = 0;

async function checkPhoto(p) {
  try {
    const r = await fetch(`https://images.unsplash.com/${p.id}?w=64&q=10`, {
      method: "HEAD",
      signal: AbortSignal.timeout(15000),
    });
    if (r.status !== 200) { bad++; console.log(r.status, p.id); }
  } catch (err) {
    bad++;
    console.log(`ERR ${p.id} ${err.code || err.message}`);
  }
}

async function worker() {
  while (index < all.length) {
    const p = all[index++];
    await checkPhoto(p);
  }
}

const workers = Array(Math.min(concurrency, all.length))
  .fill(null)
  .map(() => worker());

await Promise.all(workers);
console.log(`${all.length - bad}/${all.length} ok`);
process.exit(bad ? 1 : 0);

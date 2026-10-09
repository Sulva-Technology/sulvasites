import { chunk } from "./searchPlan";

const ENDPOINT = "https://api.indexnow.org/indexnow";
const KEY_RE = /^[A-Za-z0-9-]{8,128}$/;
/** IndexNow's per-request URL limit. */
const BATCH = 10_000;

export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key && KEY_RE.test(key) ? key : null;
}

/** Pushes URLs (all on `host`) to IndexNow, which shares them with Bing, Yandex, Seznam and Naver. */
export async function pushUrls(host: string, urls: string[]): Promise<void> {
  const key = indexNowKey();
  if (!key) throw new Error("IndexNow key is not configured.");
  for (const urlList of chunk(urls, BATCH)) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: `https://${host}/indexnow-key.txt`, urlList }),
    });
    if (res.status !== 200 && res.status !== 202) {
      const text = (await res.text().catch(() => "")).slice(0, 200);
      throw new Error(`IndexNow ${res.status}${text ? `: ${text}` : ""}`);
    }
  }
}

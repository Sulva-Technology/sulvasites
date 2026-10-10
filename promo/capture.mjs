// Captures stills of the app for the promo: every template (desktop + mobile, light + dark where it matters)
// plus marketing and admin dev screens. Usage: node promo/capture.mjs <baseUrl> [only-prefix]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:57638";
const ONLY = process.argv[3] ?? "";
const CHROME = join(process.env.LOCALAPPDATA, "ms-playwright/chromium-1243/chrome-win64/chrome.exe");
const OUT = new URL("./captures/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
mkdirSync(OUT, { recursive: true });

const DARK = ["t4", "t5", "t6", "t7", "t13", "t15", "t17"];
const shots = [];
for (let i = 1; i <= 17; i++) {
  const k = `t${i}`;
  shots.push({ name: `${k}-desk-light`, path: `/dev/templates/${k}`, mode: "light", device: "desk" });
  shots.push({ name: `${k}-mob-light`, path: `/dev/templates/${k}`, mode: "light", device: "mob" });
  if (DARK.includes(k)) {
    shots.push({ name: `${k}-desk-dark`, path: `/dev/templates/${k}`, mode: "dark", device: "desk" });
    shots.push({ name: `${k}-mob-dark`, path: `/dev/templates/${k}`, mode: "dark", device: "mob" });
  }
}
shots.push({ name: "home-desk", path: "/", device: "desk", screens: 4 });
shots.push({ name: "home-mob", path: "/", device: "mob", screens: 4 });
shots.push({ name: "pricing-desk", path: "/pricing", device: "desk", screens: 3 });
shots.push({ name: "ui-new-desk", path: "/dev/ui/new", device: "desk", screens: 1.5 });
shots.push({ name: "ui-shell-desk", path: "/dev/ui/shell", device: "desk", screens: 1.5 });
shots.push({ name: "ui-blog-desk", path: "/dev/ui/blog", device: "desk", screens: 1.5 });
shots.push({ name: "ui-index-desk", path: "/dev/ui", device: "desk", screens: 1.5 });

const DEVICES = {
  desk: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 },
  mob: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};

const browser = await chromium.launch({ executablePath: CHROME });
for (const s of shots.filter((x) => x.name.startsWith(ONLY))) {
  const ctx = await browser.newContext({ ...DEVICES[s.device], colorScheme: s.mode ?? "light" });
  if (s.mode) await ctx.addInitScript((m) => localStorage.setItem("sulva-color-mode", m), s.mode);
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + s.path, { waitUntil: "networkidle", timeout: 90000 });
    const vh = DEVICES[s.device].viewport.height;
    await page.evaluate(() => document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager")));
    // Scroll through so reveal-on-scroll sections render, then back to top.
    for (let y = 0; y < vh * 4; y += vh / 2) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(120);
    }
    await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 30000 }).catch(() => {});
    const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getBoundingClientRect().width > 0).length);
    if (broken) console.log("  broken images:", broken);
    await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast]{display:none!important}" });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500);
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const h = Math.min(total, Math.round(vh * (s.screens ?? 3)));
    await page.screenshot({ path: join(OUT, `${s.name}.jpg`), type: "jpeg", quality: 90, fullPage: true, clip: { x: 0, y: 0, width: DEVICES[s.device].viewport.width, height: h } });
    console.log("ok", s.name, h);
  } catch (e) {
    console.log("FAIL", s.name, e.message.split("\n")[0]);
  }
  await ctx.close();
}
await browser.close();

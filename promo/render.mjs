// Renders promo/scenes/promo.html frame by frame and pipes JPEGs into ffmpeg.
// Usage:
//   node promo/render.mjs stills [v]          -> out/stills/*.jpg at key times (quick check)
//   node promo/render.mjs video  [v] [fps]    -> out/promo_16x9.mp4 or out/promo_9x16.mp4 (with beat)
import { chromium } from "playwright-core";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const [mode = "stills", orient = "h", fpsArg = "30"] = process.argv.slice(2);
const V = orient === "v";
const W = V ? 1080 : 1920, H = V ? 1920 : 1080;
const FPS = +fpsArg, DUR = 30;
const CHROME = join(process.env.LOCALAPPDATA, "ms-playwright/chromium-1243/chrome-win64/chrome.exe");
const FFMPEG = execFileSync("python", ["-I", "-c", "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())"]).toString().trim();
const OUT = join(HERE, "out");
mkdirSync(join(OUT, "stills"), { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto(pathToFileURL(join(HERE, "scenes/promo.html")).href + (V ? "?v=1" : ""));
await page.evaluate(() => window.ready);

if (mode === "stills") {
  const times = (process.argv[5] ? process.argv[5].split(",").map(Number) : [1.2, 3.4, 4.8, 6.5, 9.2, 13.4, 15.8, 17.6, 19.5, 22.0, 24.5, 28.5]);
  for (const t of times) {
    await page.evaluate(async (tt) => { window.render(tt); await Promise.all(window.pending.splice(0)); }, t);
    await page.waitForTimeout(60);
    await page.screenshot({ path: join(OUT, "stills", `${V ? "v" : "h"}_${t.toFixed(2)}.jpg`), type: "jpeg", quality: 80 });
  }
  console.log("stills done");
} else {
  const file = join(OUT, V ? "promo_9x16.mp4" : "promo_16x9.mp4");
  const ff = spawn(FFMPEG, [
    "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-i", join(HERE, "audio/beat_120.wav"),
    "-vf", "scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p", "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "320k", "-shortest", "-movflags", "+faststart", file,
  ], { stdio: ["pipe", "ignore", "inherit"] });
  const total = DUR * FPS;
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    await page.evaluate(async (tt) => { window.render(tt); await Promise.all(window.pending.splice(0)); }, i / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 90 === 0) console.log(`frame ${i}/${total} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log("wrote", file);
}
await browser.close();

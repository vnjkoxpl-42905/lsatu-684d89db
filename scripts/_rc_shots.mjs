import { chromium } from "@playwright/test";
const OUT = "C:/Users/Joshu/AppData/Local/Temp/claude/C--Users-Joshu-dev-ai-os/763f2bd6-f34e-4336-b164-2d9ce5e6c18f/scratchpad";
const base = "http://localhost:8082/src/dev/report-card-preview.html";
const b = await chromium.launch();
async function shot(name, url, width, height, prep) {
  const p = await b.newPage({ viewport: { width, height } });
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  if (prep) await prep(p);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  console.log(name, "->", await p.evaluate(() => document.documentElement.scrollHeight), "px");
  await p.close();
}
await shot("rc-desktop", base, 1180, 1000);
await shot("rc-playing", base + "?playing=1", 1180, 1000);
await shot("rc-mobile", base, 390, 844);
await shot("rc-clean", base + "?state=clean", 1180, 1000);
await shot("rc-runner", base + "?frame=runner", 1180, 1000);
await b.close();

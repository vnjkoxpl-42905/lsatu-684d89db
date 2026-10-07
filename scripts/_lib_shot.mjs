import { chromium } from "@playwright/test";
const OUT = "C:/Users/Joshu/AppData/Local/Temp/claude/C--Users-Joshu-dev-ai-os/763f2bd6-f34e-4336-b164-2d9ce5e6c18f/scratchpad";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 1000 } });
p.on("pageerror", (e) => console.log("PAGE ERROR:", String(e).slice(0, 200)));
await p.goto("http://localhost:8082/src/dev/section-launch-preview.html?state=library", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
const go = await p.$('button:has-text("Choose a section")');
if (go) { await go.click(); await p.waitForTimeout(1200); }
const list = await p.$(".sl-sections");
if (list) await list.screenshot({ path: `${OUT}/rc-library.png` });
else await p.screenshot({ path: `${OUT}/rc-library.png`, fullPage: true });
const rows = await p.$$eval(".sl-sec-attempt", (els) =>
  els.slice(0, 4).map((e) => ({ text: e.textContent.trim(), tag: e.tagName, h: Math.round(e.getBoundingClientRect().height) })));
console.log(JSON.stringify(rows, null, 1));
await b.close();

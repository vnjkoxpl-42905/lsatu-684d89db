import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 900 } });
await p.goto("http://localhost:8082/src/dev/report-card-preview.html?frame=runner", { waitUntil: "networkidle" });
await p.waitForTimeout(800);
const out = await p.evaluate(async () => {
  const wrap = document.querySelector(".activity-centre");
  const tick = document.querySelector(".rc__tick");
  tick.focus();
  const cs = getComputedStyle(tick);
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const rgb = (s) => { ctx.fillStyle = "#000"; ctx.fillStyle = s; ctx.fillRect(0,0,1,1); const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]]; };
  return {
    pageGround: getComputedStyle(wrap).backgroundColor,
    pageGroundRGB: rgb(getComputedStyle(wrap).backgroundColor),
    focusRing: cs.boxShadow,
    ringHasEmerald: /16[0-9], ?1[0-9][0-9]|emerald/.test(cs.boxShadow),
  };
});
console.log(JSON.stringify(out, null, 1));
await b.close();

import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 1000 } });
await p.goto("http://localhost:8082/src/dev/report-card-preview.html" + (process.argv[2] ?? ""), { waitUntil: "networkidle" });
await p.waitForTimeout(800);
const out = await p.evaluate(() => {
  const lum = (c) => {
    const [r, g, bl] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  // Chrome serializes computed colours as oklch(...) when the author wrote
  // oklch, so they are converted through a canvas rather than parsed.
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const parse = (s) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  const bgOf = (el) => {
    let n = el;
    while (n) { const c = getComputedStyle(n).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; n = n.parentElement; }
    return "rgb(255,255,255)";
  };
  const ratio = (el) => {
    const f = lum(parse(getComputedStyle(el).color)); const g = lum(parse(bgOf(el)));
    const [hi, lo] = f > g ? [f, g] : [g, f];
    return +(((hi + 0.05) / (lo + 0.05)).toFixed(2));
  };
  const samples = [];
  const seen = new Set();
  document.querySelectorAll(".rc *").forEach((el) => {
    if (!el.textContent?.trim() || el.children.length) return;
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    const k = `${cs.color}|${bgOf(el)}|${size}`;
    if (seen.has(k)) return; seen.add(k);
    const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    const need = large ? 3 : 4.5;
    const r = ratio(el);
    samples.push({ text: el.textContent.trim().slice(0, 34), size, ratio: r, need, pass: r >= need });
  });
  return samples.sort((a, b) => a.ratio - b.ratio);
});
console.log(JSON.stringify(out.filter((s) => !s.pass), null, 1));
console.log("checked", out.length, "| failures", out.filter((s) => !s.pass).length);
await b.close();

import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";

// Run against the local Vite entry; output stays outside the production build.
const phase = process.argv[2] || "after";
const output = process.argv[3] || path.resolve(".playwright-cli", `lr-${phase}`);
const base = process.argv[4] || process.env.LR_PREVIEW_URL || "http://127.0.0.1:8080/scripts/verification/lr-explanation.html";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
page.setDefaultNavigationTimeout(60000);
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const results = [];

async function capture(width, query = "", name = String(width)) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(base + query, { waitUntil: "domcontentloaded" });
  const show = page.getByRole("button", { name: "Show explanation for D", exact: true });
  if (!query.includes("always")) await show.click();
  const heading = page.getByText("Why this is wrong", { exact: true }).last();
  await heading.waitFor();
  if (width < 1024) {
    await heading.evaluate((el) => {
      let scroller = el.parentElement;
      while (scroller && getComputedStyle(scroller).overflowY !== "auto") scroller = scroller.parentElement;
      if (scroller) scroller.scrollTop += el.parentElement.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 16;
    });
  }
  await page.locator('.choice-note-toggle').evaluateAll((els) => Promise.all(
    els.flatMap((el) => el.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {}))),
  ));
  await page.screenshot({ path: path.join(output, `${phase}-${name}.png`) });
  if (width === 1440) {
    await page.locator('li').filter({ has: page.locator('[data-choice-note="D"]') }).screenshot({ path: path.join(output, `${phase}-detail.png`) });
  }
  const measure = await page.locator('[data-choice-note="D"]').evaluate((el) => ({
    noteWidth: el.clientWidth, noteScrollWidth: el.scrollWidth,
    pageWidth: document.documentElement.clientWidth, pageScrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(measure.noteScrollWidth <= measure.noteWidth + 1, `${name}: note overflow`);
  assert.ok(measure.pageScrollWidth <= measure.pageWidth + 1, `${name}: page overflow`);
  results.push({ name, width, ...measure });
}

try {
  for (const width of [1440, 900, 768, 390, 320]) await capture(width);
  if (phase === "after") {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base);
    const toggle = page.getByRole("button", { name: "Show explanation for D", exact: true });
    await toggle.focus();
    await page.screenshot({ path: path.join(output, "after-focus.png") });
    await toggle.press("Enter");
    await page.getByRole("button", { name: "Hide explanation for D", exact: true }).press("Space");
    assert.equal(await page.locator('[data-picks]').getAttribute("data-picks"), "0");
    assert.equal(await page.getByText("Why this is wrong", { exact: true }).count(), 0);
    await capture(320, "?restore&selected=D&all", "restore");
    assert.equal(await page.getByRole("button", { name: "Restore choice C" }).count(), 1);
    const restore = page.getByRole("button", { name: "Restore choice C" });
    await restore.scrollIntoViewIfNeeded();
    const restoreBox = await restore.boundingBox();
    const cToggle = page.getByRole("button", { name: "Show explanation for C" });
    const cBox = await cToggle.boundingBox();
    assert.ok(cBox.x - 6 >= restoreBox.x + restoreBox.width, "Restore/toggle targets overlap");
    await page.mouse.click(restoreBox.x + restoreBox.width - 1, restoreBox.y + restoreBox.height / 2);
    assert.equal(await page.getByRole("button", { name: "Restore choice C" }).count(), 0);
    const target = await cToggle.boundingBox();
    await page.mouse.click(target.x - 4, target.y + target.height / 2);
    assert.equal(await page.getByRole("button", { name: "Hide explanation for C" }).count(), 1);
    await capture(390, "?always&all", "always-open");
    assert.equal(await page.getByText("Why this is correct", { exact: true }).count(), 1);
    assert.equal(await page.getByRole("button", { name: /explanation for/ }).count(), 0);
    await capture(320, "?long", "long-token");
    await capture(390, "?scale=1.3&selected=D", "large-type-wrong-pick");
    await page.goto(base + "?locked");
    assert.equal(await page.getByRole("button", { name: "Show explanation for D" }).isDisabled(), true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(base);
    assert.equal(await page.locator('.choice-note-toggle svg').evaluate((el) => getComputedStyle(el).transitionDuration), "0s");
    await page.getByRole("button", { name: "Show explanation for D" }).click();
    await page.getByText("Why this is wrong", { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, "after-reduced-motion.png") });
  }
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, "results.json"), JSON.stringify({ phase, results, errors }, null, 2));
  console.log(JSON.stringify({ phase, output, cases: results.length, errors }));
} finally {
  await browser.close();
}

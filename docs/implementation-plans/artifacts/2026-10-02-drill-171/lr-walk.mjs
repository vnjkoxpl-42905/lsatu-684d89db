import { chromium } from '/home/user/lsatu-684d89db/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = '/home/user/lsatu-684d89db/docs/implementation-plans/artifacts/2026-10-02-drill-171';
const URL = 'http://127.0.0.1:8080/dev/drill-setup-preview';
const log = [];
const note = (k, v) => { log.push([k, v]); console.log(k, '=>', JSON.stringify(v)); };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-proxy-server'] });
const overflow = (page) => page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));

for (const [width, doubleText] of [[390, false], [700, false], [820, false], [1280, false], [1440, false], [390, true], [1440, true]]) {
  const tag = `${width}${doubleText ? '-text200' : ''}`;
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.getByText('Set up an LR drill').waitFor({ timeout: 60000 });
  if (doubleText) await page.addStyleTag({ content: 'html{font-size:200% !important}' });
  const search = page.getByRole('searchbox', { name: 'Find questions by text or PrepTest reference' });
  // Exact pick, then a pasted range that excludes it from the remaining pool.
  // PT101 S1 is not an LR section: the builder must refuse it and add nothing.
  await search.fill('PT101.S1.Q1');
  await search.press('Enter');
  note(`${tag}.nonLrRefused`, (await page.getByRole('alert').filter({ hasText: 'Nothing was added' }).count()) > 0);
  await search.fill('PT101.S2.Q1');
  await search.press('Enter');
  note(`${tag}.addedCount`, await page.getByText(/added to set/).first().innerText());
  await search.fill('PT102 S2');
  await search.press('Enter');
  const status = (await page.locator('[role="status"]').allInnerTexts()).filter((t) => /available from filters/.test(t));
  note(`${tag}.pool`, status[0]);
  const create = page.getByRole('button', { name: /^Create set preview/ }).filter({ visible: true }).first();
  await create.click();
  const startBtn = page.getByRole('button', { name: /^Start (this )?drill/ }).filter({ visible: true }).first();
  note(`${tag}.startLabel`, await startBtn.innerText());
  const modeVisible = width >= 1280 ? await page.getByTestId('lr-set-mode').innerText() : (await page.getByTestId('selection-tray').innerText());
  note(`${tag}.modeBeforeStart`, modeVisible.replace(/\s+/g, ' ').slice(0, 220));
  note(`${tag}.overflow`, await overflow(page));
  await page.screenshot({ path: `${OUT}/lr-${tag}-preview.png`, fullPage: false });
  // Inspect the frozen set
  await page.getByRole('button', { name: /^Inspect all \d+ questions/ }).filter({ visible: true }).first().click();
  const dialog = page.getByRole('dialog');
  const rows = await dialog.locator('details summary').allInnerTexts();
  note(`${tag}.inspectRows`, rows.map((r) => r.replace(/\s+/g, ' ')));
  note(`${tag}.exactPickOnce`, rows.filter((r) => /PT101 · S2 · Q1 ·/.test(r)).length);
  note(`${tag}.listHeight`, await dialog.locator('details').first().evaluate((el) => el.parentElement.getBoundingClientRect().height));
  await dialog.locator('details summary').first().click();
  note(`${tag}.answerKeyLeak`, /correct answer/i.test(await dialog.innerText()));
  await page.screenshot({ path: `${OUT}/lr-${tag}-inspect.png`, fullPage: false });
  await dialog.getByRole('button', { name: 'Back to setup' }).click();
  // Change composition -> stale notice
  await search.fill('PT103');
  await search.press('Enter');
  note(`${tag}.staleNotice`, await page.getByText(/Your set changed, so the earlier preview was cleared/).filter({ visible: true }).count());
  note(`${tag}.startAfterChange`, await page.getByRole('button', { name: /^Start (this )?drill/ }).filter({ visible: true }).count());
  // Shortage: one section of PT102 cannot fill 25
  await search.fill('PT102 S2 Q1,2');
  await search.press('Enter');
  const hints = (await page.getByText(/filters need \d+ more question/).filter({ visible: true }).allInnerTexts());
  note(`${tag}.shortageHint`, hints[0]);
  note(`${tag}.createDisabled`, await page.getByRole('button', { name: /^Create set preview/ }).filter({ visible: true }).first().isDisabled());
  await page.screenshot({ path: `${OUT}/lr-${tag}-shortage.png`, fullPage: false });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/lr-walk-log.json`, JSON.stringify(log, null, 2));

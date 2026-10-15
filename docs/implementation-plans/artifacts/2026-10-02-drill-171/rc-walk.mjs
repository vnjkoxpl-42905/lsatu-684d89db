import { chromium } from '/home/user/lsatu-684d89db/node_modules/playwright/index.mjs';
const OUT = '/home/user/lsatu-684d89db/docs/implementation-plans/artifacts/2026-10-02-drill-171';
const URL = 'http://127.0.0.1:8080/dev/rc-builder-harness';
const log = [];
const note = (k, v) => { log.push([k, v]); console.log(k, '=>', JSON.stringify(v)); };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-proxy-server'] });

async function overflow(page) {
  return page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
}
async function open(width, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  let failedOnce = false;
  if (opts.failIndexOnce) {
    await page.route('**/data/rc/rc-index.json', (route) => {
      if (!failedOnce) { failedOnce = true; return route.fulfill({ status: 503, body: 'down' }); }
      return route.continue();
    });
  }
  await page.goto(URL);
  if (opts.doubleText) await page.addStyleTag({ content: 'html{font-size:200% !important}' });
  return { ctx, page };
}

// 1. Load failure then retry (390)
if (!process.env.ONLY_SHORT) {
  const { ctx, page } = await open(390, { failIndexOnce: true });
  await page.getByText(/The passage list could not be loaded/).waitFor();
  note('fail.label', await page.locator('.rc-field-label').filter({ hasText: /Passage list|Choosing/ }).first().innerText());
  note('fail.inspectDisabled', await page.getByRole('button', { name: 'Inspect set' }).isDisabled());
  note('fail.summaryAvailable', await page.getByRole('region', { name: 'Launch summary' }).innerText());
  await page.screenshot({ path: `${OUT}/rc-390-load-failed.png`, fullPage: true });
  await page.getByRole('button', { name: 'Retry' }).click();
  await page.getByText(/Choosing from \d+ of \d+ passages/).waitFor();
  note('retry.label', await page.getByText(/Choosing from \d+ of \d+ passages/).innerText());
  note('retry.inspectEnabled', await page.getByRole('button', { name: 'Inspect set' }).isEnabled());
  note('retry.overflow', await overflow(page));
  await ctx.close();
}

// 2. Main walk at each width
for (const width of process.env.ONLY_SHORT ? [] : [390, 700, 820, 1280, 1440]) {
  const { ctx, page } = await open(width);
  await page.getByText(/Choosing from \d+ of \d+ passages/).waitFor();
  await page.waitForTimeout(800);
  note(`${width}.historyNotice`, await page.getByText(/answer history could not be loaded/).count());
  // Custom time: invalid stays editable and blocks
  await page.getByRole('button', { name: 'Custom', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Minutes and seconds per passage' });
  await field.fill('8:75');
  note(`${width}.invalidValue`, await field.inputValue());
  note(`${width}.invalidError`, await page.locator('#rc-custom-pace-error').innerText());
  note(`${width}.inspectDisabledWhileInvalid`, await page.getByRole('button', { name: 'Inspect set' }).isDisabled());
  if (width === 390 || width === 1440) await page.screenshot({ path: `${OUT}/rc-${width}-invalid-time.png`, fullPage: true });
  await field.fill('10');
  await field.blur();
  note(`${width}.normalised`, await field.inputValue());
  // 3 passages
  await page.getByRole('button', { name: 'More passages' }).click();
  await page.getByRole('button', { name: 'More passages' }).click();
  note(`${width}.timingHint`, await page.locator('.rc-field-hint').filter({ hasText: 'per passage ·' }).innerText());
  await page.getByRole('button', { name: 'Inspect set' }).click();
  await page.getByRole('region', { name: 'Selected reading set' }).waitFor();
  const summary = await page.getByRole('region', { name: 'Launch summary' }).innerText();
  note(`${width}.summaryAfterInspect`, summary);
  const summaries = await page.locator('section[aria-label="Selected reading set"] summary').allInnerTexts();
  note(`${width}.inspectedPassages`, summaries);
  const totalQs = summaries.reduce((n, t) => n + Number((/· (\d+) questions/.exec(t) || [0, 0])[1]), 0);
  note(`${width}.questionsFromInspectRows`, totalQs);
  await page.locator('section[aria-label="Selected reading set"] summary').first().click();
  const regionText = await page.getByRole('region', { name: 'Selected reading set' }).innerText();
  note(`${width}.answerKeyLeak`, /correct answer|explanation:/i.test(regionText));
  note(`${width}.overflow`, await overflow(page));
  await page.screenshot({ path: `${OUT}/rc-${width}-inspected.png`, fullPage: true });
  // Stale after a reveal change
  await page.getByRole('button', { name: /At the end/ }).click();
  note(`${width}.staleNotice`, await page.getByText(/settings changed, so the inspected set was cleared/).count());
  note(`${width}.primaryAfterChange`, await page.locator('.rc-actions .rc-button-primary').first().innerText());
  // Keyboard focus is visible on the primary button
  await page.locator('.rc-actions .rc-button-primary').first().focus();
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  note(`${width}.focusOutline`, await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth));
  await ctx.close();
}

// 3. Shortfall with narrow filters (1280)
{
  const { ctx, page } = await open(1280);
  await page.getByText(/Choosing from \d+ of \d+ passages/).waitFor();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Customize' }).click();
  await page.getByRole('slider', { name: 'Latest PrepTest' }).focus();
  await page.keyboard.press('Home');
  for (const d of ['3', '2', '4']) {
    const pre = await page.getByText(/Choosing from \d+ of \d+ passages/i).innerText();
    if (Number(/from (\d+) of/i.exec(pre)[1]) < 8) break;
    await page.locator('.rc-chip-row').filter({ hasText: 'Adaptive' }).getByRole('button', { name: d, exact: true }).click();
  }
  const label = await page.getByText(/Choosing from \d+ of \d+ passages/).innerText();
  const pool = Number(/from (\d+) of/i.exec(label)[1]);
  note('short.pool', label);
  for (let i = 1; i < Math.min(8, pool + 2); i++) await page.getByRole('button', { name: 'More passages' }).click();
  await page.getByRole('button', { name: 'Inspect set' }).click();
  await page.getByRole('region', { name: 'Selected reading set' }).waitFor();
  note('short.summary', await page.getByRole('region', { name: 'Launch summary' }).innerText());
  const start = page.locator('.rc-actions .rc-button-primary').first();
  note('short.startDisabledBeforeAck', await start.isDisabled());
  await page.screenshot({ path: `${OUT}/rc-1280-shortfall.png`, fullPage: true });
  await page.getByRole('checkbox').check();
  note('short.startEnabledAfterAck', await start.isEnabled());
  // No account in this harness: Start must fail plainly and not navigate.
  await start.click();
  note('short.duringStart', await start.innerText());
  await page.locator('.rc-page-sub[role="status"]').first().waitFor({ timeout: 30000 }).catch(() => {});
  note('short.afterStartUrl', page.url());
  note('short.afterStartButton', await start.innerText());
  note('short.afterStartNotice', await page.locator('.rc-page-sub[role="status"]').allInnerTexts());
  await page.screenshot({ path: `${OUT}/rc-1280-start-unauthenticated.png`, fullPage: true });
  await ctx.close();
}

// 4. Doubled text at 820 and 390
for (const width of [390, 820]) {
  const { ctx, page } = await open(width, { doubleText: true });
  await page.getByText(/Choosing from \d+ of \d+ passages/).waitFor();
  await page.getByRole('button', { name: 'Inspect set' }).click();
  await page.getByRole('region', { name: 'Selected reading set' }).waitFor();
  note(`text2x.${width}.overflow`, await overflow(page));
  await page.screenshot({ path: `${OUT}/rc-${width}-text-200.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
import('fs').then(fs => fs.writeFileSync(`${OUT}/rc-walk-log.json`, JSON.stringify(log, null, 2)));

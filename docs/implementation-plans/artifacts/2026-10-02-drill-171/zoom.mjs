import { chromium } from '/home/user/lsatu-684d89db/node_modules/playwright/index.mjs';
const OUT = '/home/user/lsatu-684d89db/docs/implementation-plans/artifacts/2026-10-02-drill-171';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-proxy-server'] });
for (const width of [820, 1440]) {
  // deviceScaleFactor alone does not reflow; a 200% browser zoom is a viewport of width/2 CSS px at 2x.
  const ctx = await browser.newContext({ viewport: { width: width / 2, height: 450 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8080/dev/rc-builder-harness');
  await page.getByText(/Choosing from \d+ of \d+ passages/i).waitFor();
  await page.getByRole('button', { name: 'Inspect set' }).click();
  await page.getByRole('region', { name: 'Selected reading set' }).waitFor();
  const o = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  console.log(`rc zoom200 @${width}`, o);
  await page.screenshot({ path: `${OUT}/rc-${width}-zoom200.png`, fullPage: true });
  await page.goto('http://127.0.0.1:8080/dev/drill-setup-preview');
  await page.getByText('Set up an LR drill').waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: /^Create set preview/ }).filter({ visible: true }).first().click();
  await page.getByRole('button', { name: /^Inspect all \d+ questions/ }).filter({ visible: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('details summary').first().click();
  const h = await dialog.locator('details').first().evaluate((el) => el.parentElement.getBoundingClientRect().height);
  const o2 = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  console.log(`lr zoom200 @${width}`, o2, 'list height', h);
  await page.screenshot({ path: `${OUT}/lr-${width}-zoom200-inspect.png` });
  await ctx.close();
}
await browser.close();

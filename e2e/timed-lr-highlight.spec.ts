import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

// Runs against the synthetic child fixture (playwright.timed-fixture.config.ts). No account, no backend.
const rows = JSON.parse(fs.readFileSync('public/data/PT107-S1-LR.json', 'utf8')) as { questionNumber: number; stimulus: string; answerChoices: Record<string, string> }[];
const row = rows.find(value => value.questionNumber === 11)!;
const passage = row.stimulus.split('\n').slice(1).join(' ').replace(/\s+/g, ' ').trim();
const sentence = 'this characteristic is actually quite common';
const open = (page: Page, scenario = '') => page.goto(`/?fixture=child-lr${scenario ? `&scenario=${scenario}` : ''}`);
const stimulusText = (page: Page) => page.evaluate(() => (document.querySelector('[data-para-start]')?.closest('div') as HTMLElement).textContent!.replace(/\s+/g, ' ').trim());

/** Real mouse drag between two character offsets of one phrase in the stimulus. */
async function drag(page: Page, from: number, to: number) {
  const points = await page.evaluate(({ from, to, phrase }) => {
    const root = (document.querySelector('[data-para-start]')!.closest('div') as HTMLElement);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes: Text[] = []; let node;
    while ((node = walker.nextNode())) nodes.push(node as Text);
    const full = nodes.map(value => value.data).join(''); const base = full.indexOf(phrase);
    const at = (offset: number) => { let left = base + offset; for (const value of nodes) { if (left <= value.data.length) return { value, left }; left -= value.data.length; } throw new Error('offset'); };
    const rect = (offset: number) => { const { value, left } = at(offset); const range = document.createRange(); range.setStart(value, left); range.setEnd(value, Math.min(left + 1, value.data.length)); return range.getBoundingClientRect(); };
    const a = rect(from), b = rect(Math.max(to - 1, from));
    return { x1: a.left + 1, y1: a.top + a.height / 2, x2: b.right - 1, y2: b.top + b.height / 2 };
  }, { from, to, phrase: sentence });
  await page.mouse.move(points.x1, points.y1); await page.mouse.down(); await page.mouse.move(points.x2, points.y2, { steps: 6 }); await page.mouse.up();
}

test('repeated drags over one sentence never change the passage text', async ({ page }) => {
  await open(page);
  await expect(page.getByText('It is well known that many species')).toBeVisible();
  expect(await stimulusText(page)).toBe(passage);
  await page.getByLabel('Marker').selectOption('yellow');
  const drags: [number, number][] = [[0, 40], [6, 44], [14, 28], [10, 41], [20, 38], [3, 44], [0, 44], [18, 30]];
  for (const [from, to] of drags) { await drag(page, from, to); expect(await stimulusText(page)).toBe(passage); }
  const marked = await page.evaluate(() => Array.from(document.querySelectorAll('.hl')).map(node => node.textContent).join(''));
  expect(marked.length).toBeGreaterThan(20); expect(marked.length).toBeLessThanOrEqual(sentence.length + 1);
  await page.screenshot({ path: 'test-results/timed-lr-highlight-after-drags.png' });
});

test('the eraser clears part of a highlight by dragging, with no repeated text', async ({ page }) => {
  await open(page);
  await page.getByLabel('Marker').selectOption('yellow'); await drag(page, 0, 44);
  await page.getByLabel('Marker').selectOption('erase'); await drag(page, 14, 28);
  expect(await stimulusText(page)).toBe(passage);
  const marks = await page.evaluate(() => Array.from(document.querySelectorAll('.hl')).map(node => node.textContent));
  expect(marks.join('')).not.toContain(sentence.slice(14, 28).trim());
});

test('a saved command left by a reload is retried once without a click', async ({ page }) => {
  await open(page, 'pending-on-load');
  await expect(page.getByText('It is well known that many species')).toBeVisible();
  await expect(page.getByText('Section paused')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { lrFixtureLog: string[] }).lrFixtureLog.filter(entry => entry === 'retry').length)).toBe(1);
});

test('a slow save does not replace the section with the paused screen', async ({ page }) => {
  await open(page, 'slow-save');
  await page.getByText(row.answerChoices.B, { exact: false }).first().click();
  const seen: boolean[] = [];
  for (let i = 0; i < 6; i++) { seen.push(await page.getByText('Section paused').isVisible()); await page.waitForTimeout(500); }
  expect(seen.some(Boolean)).toBe(false);
  await expect(page.getByText('Account save acknowledged')).toBeVisible({ timeout: 8000 });
});

test('RC passage text is unchanged after repeated drags over one sentence', async ({ page }) => {
  await page.goto('/?fixture=child');
  const phrase = 'A useful explanation must account for the observations.';
  const passageEl = page.getByText(phrase, { exact: false }).first();
  await expect(passageEl).toBeVisible();
  const read = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const before = await read();
  await page.getByLabel('Marker').selectOption('yellow');
  for (const [from, to] of [[0, 30], [8, 50], [15, 25], [0, 55], [20, 40], [3, 55]]) {
    const box = await page.evaluate(({ phrase, from, to }) => {
      // Deepest element whose text holds the phrase; marks may split its text into several nodes.
      const holders = Array.from(document.querySelectorAll('p, div, span, mark')).filter(el => (el.textContent ?? '').includes(phrase));
      const root = holders.find(el => !Array.from(el.children).some(child => (child.textContent ?? '').includes(phrase))) as HTMLElement | undefined;
      if (!root) return null;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes: Text[] = []; let node;
      while ((node = walker.nextNode())) nodes.push(node as Text);
      const base = nodes.map(value => value.data).join('').indexOf(phrase);
      const rect = (offset: number) => { let left = base + offset; for (const value of nodes) { if (left < value.data.length) { const range = document.createRange(); range.setStart(value, left); range.setEnd(value, left + 1); return range.getBoundingClientRect(); } left -= value.data.length; } throw new Error('offset'); };
      const a = rect(from), b = rect(to - 1); return { x1: a.left + 1, y1: a.top + a.height / 2, x2: b.right - 1, y2: b.top + b.height / 2 };
    }, { phrase, from, to });
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x1, box!.y1); await page.mouse.down(); await page.mouse.move(box!.x2, box!.y2, { steps: 5 }); await page.mouse.up();
    expect(await read()).toBe(before);
  }
});

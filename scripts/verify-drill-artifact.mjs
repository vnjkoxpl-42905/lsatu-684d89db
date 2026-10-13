#!/usr/bin/env node
// Prove a generated drill artifact actually works as a file, in a real browser,
// with no server and no network.
//
// The static checks in the generator cover what is in the markup. These cover
// what happens when a student clicks: that the answer stays hidden until they
// commit, that it appears when they do, and that the whole thing survives a
// mail client with storage switched off — which is the failure that would only
// ever show up in the student's inbox.
//
// Usage: node scripts/verify-drill-artifact.mjs <path-to.html>

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const file = process.argv[2];
if (!file) {
  console.error('usage: verify-drill-artifact.mjs <path-to.html>');
  process.exit(1);
}
const url = `file://${path.resolve(file)}`;

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

async function run(blockStorage) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  if (blockStorage) {
    // Mail clients sandbox attachments; localStorage throws rather than
    // returning null. The artifact must fall back to memory, not die.
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
  }
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(url);

  console.log(`\n${blockStorage ? 'storage blocked' : 'storage available'}:`);

  const total = await page.locator('.question').count();
  check('questions rendered', total > 0, `${total}`);

  const first = page.locator('.question').first();
  check('answer hidden before any attempt', await first.locator('.answer-reveal').isHidden());
  check('cannot commit without choosing', await first.locator('.submit').isDisabled());

  // START must move the reader to the questions rather than post to a parent
  // frame that does not exist here.
  await page.locator('[data-start-drill="true"]').first().click();
  await page.waitForTimeout(400);
  check('START scrolls into the set', await first.isVisible());

  await first.locator('.choice').first().click();
  check('answer still hidden after only selecting', await first.locator('.answer-reveal').isHidden());
  check('commit enabled once a choice is made', await first.locator('.submit').isEnabled());

  await first.locator('.submit').click();
  check('answer revealed after committing', await first.locator('.answer-reveal').isVisible());

  const verdict = (await first.locator('.verdict').textContent()) ?? '';
  const answer = await first.getAttribute('data-answer');
  check('reveal names the credited answer', verdict.includes(answer ?? '#'), verdict.trim());
  check('choices lock after committing', (await first.getAttribute('data-locked')) === 'true');

  // Finish the set so the scoreboard is exercised too.
  for (let i = 1; i < total; i++) {
    const q = page.locator('.question').nth(i);
    await q.locator('.choice').first().click();
    await q.locator('.submit').click();
  }
  check('scoreboard appears once the set is done', await page.locator('#scoreboard').isVisible());
  const line = (await page.locator('#scoreline').textContent()) ?? '';
  check('scoreboard counts the whole set', line.includes(`of ${total}`), line.trim());

  check('answer key stays hidden on screen', await page.locator('#answer-key').isHidden());

  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

  await browser.close();
}

const html = fs.readFileSync(path.resolve(file), 'utf8');
console.log(`verifying ${path.basename(file)} (${(html.length / 1024).toFixed(0)} KB)`);

await run(false);
await run(true);

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);

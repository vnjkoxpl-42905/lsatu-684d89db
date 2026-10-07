import fs from 'node:fs';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Credentials remain local and are never included in the report.
function env(path) {
  return Object.fromEntries(fs.readFileSync(path, 'utf8').split(/\r?\n/).flatMap(line => {
    const match = line.match(/^([A-Za-z_][A-Za-z_0-9]*)=(.*)$/);
    return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, '')]] : [];
  }));
}
const local = env('.env');
const credentials = env('C:/Users/Joshu/dev/ai-os/.env');
const client = createClient(local.VITE_SUPABASE_URL, local.VITE_SUPABASE_PUBLISHABLE_KEY);
const signed = await client.auth.signInWithPassword({ email: credentials.LSATPREP_TESTER_EMAIL, password: credentials.LSATPREP_TESTER_PASSWORD });
if (signed.error) throw new Error('Designated tester sign-in failed.');
const session = signed.data.session;
const storageKey = `sb-${new URL(local.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.addInitScript(({ storageKey, session }) => localStorage.setItem(storageKey, JSON.stringify(session)), { storageKey, session });
const page = await context.newPage();
const out = new URL('./', import.meta.url);
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8185';
await page.goto(`${base}/drill?drill=questions&qids=PT101-S2-Q1,PT101-S2-Q2&label=LR%20feedback%20QA`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.getByRole('note').filter({ hasText: 'Training' }).waitFor({ timeout: 60000 });
await page.screenshot({ path: new URL('initial.png', out).pathname.replace(/^\/(\w:)/, '$1') });
await page.getByRole('button', { name: 'A', exact: true }).click();
await page.getByRole('button', { name: 'Next', exact: true }).click();
await page.waitForURL(/run=/, { timeout: 30000 });
const runId = new URL(page.url()).searchParams.get('run');
const rowRead = await client.from('bootcamp_kv').select('data').eq('user_id', session.user.id).eq('table_name', 'drill_runs').eq('record_id', runId).single();
if (rowRead.error) throw new Error('QA saved sitting was not readable.');
const row = rowRead.data.data;
if (row.provenance?.feedback !== 'manual_answer_and_explanation' || row.session.attempts[0]?.provenance?.study_mode !== 'training') throw new Error('Saved feedback settings missing.');
await page.goto(`${base}/drill?drill=questions&qids=PT102-S2-Q1&layout=classic&label=Changed&run=${runId}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.getByRole('note').filter({ hasText: 'Training' }).waitFor({ timeout: 60000 });
if (!await page.getByRole('button', { name: 'The Official LSAT PrepTest 101', exact: true }).count()) throw new Error('URL changed the saved source or layout.');
const responsive = [];
for (const width of [390, 820, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  responsive.push(await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })));
  await page.screenshot({ path: new URL(`resumed-${width}.png`, out).pathname.replace(/^\/(\w:)/, '$1') });
}
await page.getByRole('button', { name: 'A', exact: true }).click();
await page.getByRole('button', { name: 'Next', exact: true }).click();
await page.waitForFunction(() => /Results|Review your/.test(document.body.innerText), { timeout: 30000 });
await page.goto(`${base}/practice/drills/runs/${runId}?view=results`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.getByText('Training · Answers and explanations appear when you choose to reveal them.', { exact: true }).waitFor({ timeout: 60000 });
await page.screenshot({ path: new URL('results.png', out).pathname.replace(/^\/(\w:)/, '$1') });
const finished = await client.from('bootcamp_kv').select('data').eq('user_id', session.user.id).eq('table_name', 'drill_runs').eq('record_id', runId).single();
if (finished.error || finished.data.data.session.status !== 'completed') throw new Error('QA completion was not acknowledged.');
await page.goto(`${base}/practice/drills/runs/${runId}?view=review`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.getByText('Training · Answers and explanations appear when you choose to reveal them.', { exact: true }).waitFor({ timeout: 60000 });
await page.screenshot({ path: new URL('review.png', out).pathname.replace(/^\/(\w:)/, '$1') });
const legacyRead = await client.from('bootcamp_kv').select('record_id,data').eq('user_id', session.user.id).eq('table_name', 'drill_runs');
const legacy = legacyRead.data?.find(item => !item.data.provenance && item.data.source_key.startsWith('drill::') && item.data.session.status === 'completed');
let legacyDisclosureVisible = null;
if (legacy) {
  await page.goto(`${base}/practice/drills/runs/${legacy.record_id}?view=results`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.getByText('Feedback settings were not saved for this older sitting.', { exact: true }).waitFor({ timeout: 60000 });
  legacyDisclosureVisible = true;
}
const report = { runId, savedProvenance: row.provenance, firstAttemptProvenance: row.session.attempts[0].provenance, completed: true, answerCount: finished.data.data.session.attempts.length, resumedSavedSourceDespiteChangedUrl: true, responsive, resultsPolicyVisible: true, reviewPolicyVisible: true, legacyDisclosureVisible };
fs.writeFileSync(new URL('browser-report.json', out), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
await browser.close();

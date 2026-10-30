import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { applyAuthoredCorrections, captureAuthoredCorrections } from '../rc-authored-corrections.mjs';

const files = readdirSync('public/data/rc').filter(file => /^RC-PT\d+\.json$/.test(file)).sort();
const overlay = JSON.parse(readFileSync('scripts/rc-authored-corrections.json', 'utf8'));
const working = files.map(file => JSON.parse(readFileSync(`public/data/rc/${file}`, 'utf8')));
// The payload retains the original authored values, so CI needs no Git history.
// Independent official-source comparison is performed by the audit CLI.
const baseline = structuredClone(working);
for (const correction of overlay.corrections) {
  let target = baseline.find(bank => bank.preptest === correction.preptest);
  for (const part of correction.path.slice(0, -1)) target = target[part];
  assert.deepEqual(target[correction.path.at(-1)], correction.after);
  target[correction.path.at(-1)] = structuredClone(correction.before);
}
test('reviewed overlay reconstructs the exact working bank without writing generated sources', () => {
  const banks = structuredClone(baseline);
  assert.deepEqual(applyAuthoredCorrections(banks, overlay), working);
  assert.deepEqual(captureAuthoredCorrections(baseline, working), { version: overlay.version, corrections: overlay.corrections });
});
test('authored overlay is idempotent', () => {
  const banks = structuredClone(working);
  assert.deepEqual(applyAuthoredCorrections(banks, overlay), working);
});
test('unexpected authored base fails before any mutation', () => {
  const banks = structuredClone(baseline);
  const last = overlay.corrections.at(-1);
  let target = banks.find(bank => bank.preptest === last.preptest);
  for (const part of last.path.slice(0, -1)) target = target[part];
  target[last.path.at(-1)] = 'Unexpected upstream edit';
  const before = structuredClone(banks);
  assert.throws(() => applyAuthoredCorrections(banks, overlay), /unexpected authored base/);
  assert.deepEqual(banks, before);
});
test('protected mutations and mismatched identity are rejected', () => {
  const changed = structuredClone(baseline); changed[0].passages[0].text += ' altered';
  assert.throws(() => captureAuthoredCorrections(baseline, changed), /protected source changed/);
  const bad = structuredClone(overlay); bad.corrections[0].passageId = -1;
  assert.throws(() => applyAuthoredCorrections(structuredClone(baseline), bad), /identity mismatch/);
});

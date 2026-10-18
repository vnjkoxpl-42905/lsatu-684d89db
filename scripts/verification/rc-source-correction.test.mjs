import { questionIdentity } from '../rc-answer-keys.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applySourceCorrection, sourceCorrection, isReviewedSourceChange, questionForOriginalAuthority } from '../rc-source-correction.mjs';
import { captureAuthoredCorrections } from '../rc-authored-corrections.mjs';
const fixture = () => [JSON.parse(readFileSync('public/data/rc/RC-PT156.json', 'utf8'))];
test('official correction restores only missing quotation and is idempotent', () => {
  const banks = fixture(); const question = banks[0].passages[4].questions[1]; question.prompt = sourceCorrection.before;
  const expected = fixture(); expected[0].passages[4].questions[1].prompt = sourceCorrection.after; assert.deepEqual(applySourceCorrection(banks), expected);
  assert.deepEqual(applySourceCorrection(banks), expected);
  assert.equal(question.correctAnswer, 'E');
});
test('unexpected prompt, identity and key fail without mutation', () => {
  for (const alter of [q => { q.prompt = 'other'; }, q => { q.questionId = 1; }, q => { q.correctAnswer = 'A'; }]) {
    const banks = fixture(); alter(banks[0].passages[4].questions[1]); const before = structuredClone(banks);
    assert.throws(() => applySourceCorrection(banks)); assert.deepEqual(banks, before);
  }
});
test('manifest cannot expand path, values, provenance or fields', () => {
  for (const edit of [{ path: ['passages', 4, 'text'] }, { after: 'unreviewed' }, { sourceSha256: 'changed' }, { extra: true }]) {
    const banks = fixture(); const before = structuredClone(banks);
    assert.throws(() => applySourceCorrection(banks, { ...sourceCorrection, ...edit })); assert.deepEqual(banks, before);
  }
});
test('integrity exception matches only exact official change', () => {
  const c = sourceCorrection; const f = 'public/data/rc/RC-PT156.json'; const p = 'passages[4].questions[1].prompt';
  assert.ok(isReviewedSourceChange(f, p, c.before, c.after));
  for (const args of [[f, p, c.before, 'other'], [f, p + '.extra', c.before, c.after], [f.replace('156','155'), p, c.before, c.after]]) assert.equal(isReviewedSourceChange(...args), false);
  const before = fixture(); const after = fixture(); after[0].passages[4].text += 'changed';
  assert.throws(() => captureAuthoredCorrections(before, after), /protected source changed/);
});

test('retained authority binds only the exact quotation restoration and preserves other identity inputs', () => {
  const bank = fixture()[0]; const p = bank.passages[4]; const q = { ...p.questions[1], prompt: sourceCorrection.after };
  const original = { ...q, prompt: sourceCorrection.before };
  const identity = questionIdentity(156, p, original);
  assert.equal(questionIdentity(156, p, questionForOriginalAuthority(156, p, q)), identity);
  const wrongPrompt = { ...q, prompt: 'other' };
  assert.notEqual(questionIdentity(156, p, questionForOriginalAuthority(156, p, wrongPrompt)), identity);
  const changedChoice = structuredClone(q); changedChoice.choices[0].text += ' altered';
  assert.notEqual(questionIdentity(156, p, questionForOriginalAuthority(156, p, changedChoice)), identity);
  assert.equal(questionForOriginalAuthority(155, p, q), q);
  assert.equal(questionForOriginalAuthority(156, { ...p, section: 1 }, q), q);
  assert.equal(questionForOriginalAuthority(156, p, { ...q, correctAnswer: 'A' }).correctAnswer, 'A');
});

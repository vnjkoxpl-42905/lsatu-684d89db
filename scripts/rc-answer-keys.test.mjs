import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCorrections, questionIdentity, resolveCredit } from './rc-answer-keys.mjs';
import { publishedCredit } from './verification/audit-rc-answer-keys.mjs';
const choices = key => ['A', 'B', 'C', 'D', 'E'].map(letter => ({ letter, text: `Choice ${letter}`, correct: letter === key }));
const fixture = () => {
  const q = { questionId: 10733, position: 2, prompt: 'Inference?', correctAnswer: 'B', choices: choices('B') };
  const p = { passageId: 1756, section: 2, setNumber: 1, text: 'Passage', questions: [q] };
  const banks = [{ preptest: 159, passages: [p] }];
  const manifest = { schemaVersion: 1, corrections: [{ questionId: 10733, preptest: 159, section: 2, setNumber: 1, position: 2,
    previousAnswer: 'B', correctAnswer: 'D', identitySha256: questionIdentity(159, p, q), sources: [{ url: 'https://www.lsatlab.com/lsat-explanations/PT159-S2-P1-Q2/torchy-brown' }] }] };
  return { banks, manifest, q, p };
};
test('explicit recovered key is used and must agree with choice flags', () => {
  assert.equal(resolveCredit(1, choices('D'), null, 'D'), 'D');
  assert.throws(() => resolveCredit(1, choices('B'), null, 'D'), /explicit key D disagrees with choice flag B/);
});
test('conflicting explanation and recovered keys fail instead of silently taking precedence', () => {
  assert.throws(() => resolveCredit(1, choices('D'), 'D', 'B'), /conflicting\/invalid explicit/);
  assert.throws(() => resolveCredit(1, choices('D'), null, '0'), /invalid/);
});
test('missing or multiple credited choices and duplicate letters are rejected', () => {
  assert.throws(() => resolveCredit(1, choices(null)), /exactly one/);
  const two = choices('A'); two[1].correct = true;
  assert.throws(() => resolveCredit(1, two), /exactly one/);
  const dup = choices('A'); dup[4].letter = 'D';
  assert.throws(() => resolveCredit(1, dup), /five unique/);
});
test('verified correction changes only credit and flags and is idempotent', () => {
  const { banks, manifest, q } = fixture();
  const content = JSON.stringify({ prompt: q.prompt, choices: q.choices.map(({ letter, text }) => ({ letter, text })) });
  assert.deepEqual(applyCorrections(banks, manifest), [10733]);
  assert.equal(q.correctAnswer, 'D');
  assert.deepEqual(q.choices.filter(c => c.correct).map(c => c.letter), ['D']);
  assert.equal(JSON.stringify({ prompt: q.prompt, choices: q.choices.map(({ letter, text }) => ({ letter, text })) }), content);
  assert.deepEqual(applyCorrections(banks, manifest), []);
});
test('unapplied correction fails check mode without mutating', () => {
  const { banks, manifest, q } = fixture();
  assert.throws(() => applyCorrections(banks, manifest, { checkOnly: true }), /has not been applied/);
  assert.equal(q.correctAnswer, 'B');
});
test('stale official address and changed text cannot reuse an old correction', () => {
  for (const change of [(x) => { x.p.section = 4; }, (x) => { x.p.setNumber = 2; }, (x) => { x.q.choices[3].text += ' changed'; }]) {
    const f = fixture(); change(f);
    assert.throws(() => applyCorrections(f.banks, f.manifest), /official address\/text changed/);
  }
});
test('unexpected current key, missing question and duplicate correction fail closed', () => {
  const a = fixture(); a.q.correctAnswer = 'A'; a.q.choices = choices('A');
  assert.throws(() => applyCorrections(a.banks, a.manifest), /unexpected existing key/);
  const b = fixture(); b.p.questions = [];
  assert.throws(() => applyCorrections(b.banks, b.manifest), /bank question is missing/);
  const c = fixture(); c.manifest.corrections.push(c.manifest.corrections[0]);
  assert.throws(() => applyCorrections(c.banks, c.manifest), /duplicate/);
});
test('published credit comes from the visible keyed Correct row, not scripts or popularity', () => {
  const html = '<script>Answer B is correct.</script><li><span aria-hidden="true">D</span><span>Correct</span><p>Answer D is correct.</p></li><li><span aria-hidden="true">B</span><span>97% picked this</span></li>';
  assert.equal(publishedCredit(html), 'D');
});
test('missing or contradictory published credit is unverified', () => {
  assert.throws(() => publishedCredit('<li><span aria-hidden="true">D</span><span>Correct</span><p>Answer B is correct.</p></li>'), /consistent/);
  assert.throws(() => publishedCredit('<p>No credited answer</p>'), /consistent/);
});

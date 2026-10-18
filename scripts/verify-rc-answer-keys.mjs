import { questionForOriginalAuthority } from './rc-source-correction.mjs';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyCorrections, questionIdentity } from './rc-answer-keys.mjs';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(root, 'public/data/rc');
const files = readdirSync(dir).filter(f => /^RC-PT\d+\.json$/.test(f));
const before = new Map(files.map(f => [f, readFileSync(resolve(dir, f), 'utf8')]));
const banks = files.map(f => JSON.parse(before.get(f)));
const corrections = JSON.parse(readFileSync(resolve(root, 'src/features/rc/lib/rcAnswerKeyCorrections.json'), 'utf8'));
const apply = process.argv.includes('--apply');
const changed = applyCorrections(banks, corrections, { checkOnly: !apply });
if (corrections.audit) {
  const source = readFileSync(resolve(root, corrections.audit.sourceReport));
  if (createHash('sha256').update(source).digest('hex') !== corrections.audit.sha256) throw new Error('RC authority report hash changed');
  const audit = JSON.parse(source);
  const expected = new Map(audit.records.map(row => [row.questionId, row]));
  if (expected.size !== audit.records.length || expected.size !== corrections.audit.verifiedQuestions) throw new Error('Duplicate/missing audited RC keys');
  for (const bank of banks) for (const p of bank.passages) for (const q of p.questions) {
    const row = expected.get(q.questionId);
    if (!row || row.error || q.correctAnswer !== row.publishedCredit || questionIdentity(bank.preptest, p, questionForOriginalAuthority(bank.preptest, p, q)) !== row.identitySha256) throw new Error(`RC question ${q.questionId}: published credit/identity differs from reviewed authority report`);
    expected.delete(q.questionId);
  }
  if (expected.size) throw new Error('Authority report contains stale RC questions');
}
// Validate every bank and every override before any write. Preserve original
// source captures and every field except the verified key and choice flags.
if (apply) files.forEach((file, i) => {
  if (!banks[i].passages.some(p => p.questions.some(q => changed.includes(q.questionId)))) return;
  if (readFileSync(resolve(dir, file), 'utf8') !== before.get(file)) throw new Error(`Concurrent RC bank edit: ${file}`);
  writeFileSync(resolve(dir, file), JSON.stringify(banks[i]));
});
console.log(JSON.stringify({ questions: banks.reduce((n, b) => n + b.passages.reduce((a, p) => a + p.questions.length, 0), 0), documentedCorrections: corrections.corrections.length, applied: changed }));

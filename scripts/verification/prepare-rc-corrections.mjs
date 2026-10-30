// Build the reviewed correction layer without rewriting immutable recovery data.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { questionIdentity } from '../rc-answer-keys.mjs';
import { createHash } from 'node:crypto';
const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const manifestPath = 'src/features/rc/lib/rcAnswerKeyCorrections.json';
const reviewed = JSON.parse(readFileSync(manifestPath, 'utf8'));
const approved = new Map(reviewed.corrections.map(c => [c.questionId, c]));
const banks = readdirSync('public/data/rc').filter(f => /^RC-PT\d+\.json$/.test(f)).map(f => JSON.parse(readFileSync(resolve('public/data/rc', f), 'utf8')));
if (report.records.length !== 2150 || new Set(report.records.map(r => r.questionId)).size !== 2150 || report.records.some(r => r.error || !r.publishedCredit)) throw new Error('A complete verified 2150-question audit is required');
for (const row of report.records) {
  const bank = banks.find(b => b.preptest === row.preptest);
  const p = bank?.passages.find(p => p.questions.some(q => q.questionId === row.questionId));
  const q = p?.questions.find(q => q.questionId === row.questionId);
  if (!q) throw new Error(`Audit question ${row.questionId} missing`);
  const baseline = structuredClone(q);
  baseline.correctAnswer = row.bankCredit;
  baseline.choices.forEach(c => { c.correct = c.letter === row.bankCredit; });
  if (createHash('sha256').update(JSON.stringify(baseline)).digest('hex') !== row.questionSha256) throw new Error(`Audit baseline changed for ${row.questionId}`);
  row.identitySha256 = questionIdentity(bank.preptest, p, q);
  if (row.bankCredit !== row.publishedCredit) {
    const approval = approved.get(row.questionId);
    if (!approval || approval.correctAnswer !== row.publishedCredit || approval.identitySha256 !== row.identitySha256) throw new Error(`Question ${row.questionId}: independent adjudication must be reviewed before preparing this audit`);
  }
}
// Never invent source attestations or discard an older reviewed correction.
const corrections = reviewed.corrections;
corrections.sort((a, b) => a.questionId - b.questionId);
const sourceReport = 'docs/audits/2026-10-14-rc-answer-key-audit.json';
writeFileSync(sourceReport, JSON.stringify(report, null, 2) + '\n');
writeFileSync(manifestPath, JSON.stringify({ schemaVersion: 1,
  audit: { sourceReport, sha256: createHash('sha256').update(readFileSync(sourceReport)).digest('hex'), verifiedQuestions: report.records.length }, corrections }, null, 2) + '\n');
console.log(`${corrections.length} documented corrections prepared; bank untouched`);

import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(root, 'public/data/rc');
const files = (await readdir(source)).filter(name => /^RC-PT\d+\.json$/.test(name)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
const text = value => typeof value === 'string' && value.trim().length > 0;
const blockProse = q => (q.explanationBlocks ?? []).some(b => text(b.body));
const choiceProse = q => (q.choices ?? []).some(c => text(c.explanation));
const anyProse = q => blockProse(q) || choiceProse(q);
const hash = createHash('sha256');
const tests = [];
for (const file of files) {
  const bytes = await readFile(path.join(source, file));
  hash.update(file + '\n').update(bytes).update('\n');
  const data = JSON.parse(bytes);
  tests.push({ file, preptest: data.preptest, passages: data.passages ?? [] });
}
const passages = tests.flatMap(t => t.passages);
const questions = passages.flatMap(p => p.questions ?? []);
const sum = (items, pred) => items.filter(pred).length;
const variants = ['standard', 'brief', 'anotherWay'];
const missing = questions.filter(q => !anyProse(q));
const flagMismatches = questions.filter(q => Boolean(q.hasWrittenExplanation) !== anyProse(q));
const lines = [
  '# RC explanation coverage inventory', '',
  'Generated from checked-in content by `node scripts/verification/inventory-rc-explanations.mjs`. This is a read-only content inventory. No explanations, passage text, answer keys or student records were changed.', '',
  `Source: ${files.length} PrepTest JSON files, PT ${tests[0].preptest}–${tests.at(-1).preptest}; ${passages.length} passages; ${questions.length} questions.`, '',
  `Source SHA-256 (numeric filename order, filename + LF + file bytes + LF): \`${hash.digest('hex')}\`.`, '',
  'Presence does not certify correctness, teaching quality, completeness, tone, answer-key consistency or safe rendering. Tag-only content is not counted as explanation prose. Heading-only blocks are not counted as prose. Existing summaries need pedagogical review before they can be called approved.', '',
  '## What is present', '',
  '| Measure | Present | Missing |', '|---|---:|---:|',
  ...variants.map(v => `| Passage summary: ${v} | ${sum(passages, p => text(p.summaries?.[v]))} | ${sum(passages, p => !text(p.summaries?.[v]))} |`),
  `| Questions with walkthrough block prose | ${sum(questions, blockProse)} | ${sum(questions, q => !blockProse(q))} |`,
  `| Questions with any choice explanation prose | ${sum(questions, choiceProse)} | ${sum(questions, q => !choiceProse(q))} |`,
  `| Questions with any explanation prose | ${questions.length - missing.length} | ${missing.length} |`,
  `| Questions with all five choice explanations | ${sum(questions, q => q.choices?.length === 5 && q.choices.every(c => text(c.explanation)))} | ${sum(questions, q => q.choices?.length !== 5 || !q.choices.every(c => text(c.explanation)))} |`,
  `| Choices with explanation prose | ${sum(questions.flatMap(q => q.choices ?? []), c => text(c.explanation))} | ${sum(questions.flatMap(q => q.choices ?? []), c => !text(c.explanation))} |`,
  `| Question authored flag disagrees with prose presence | ${flagMismatches.length} | n/a |`, '',
  '## Coverage by PrepTest', '',
  'Counts are literal source presence. Summary columns show standard / brief / anotherWay. Question columns show prose-present / total, then missing-prose question IDs.', '',
  '| PT | Passages | Summaries | Walkthrough prose | Any explanation prose | Missing-prose question IDs |', '|---|---:|---|---:|---:|---|',
];
for (const test of tests) {
  const ps = test.passages;
  const qs = ps.flatMap(p => p.questions ?? []);
  lines.push(`| ${test.preptest} | ${ps.length} | ${variants.map(v => sum(ps, p => text(p.summaries?.[v]))).join(' / ')} | ${sum(qs, blockProse)}/${qs.length} | ${sum(qs, anyProse)}/${qs.length} | ${qs.filter(q => !anyProse(q)).map(q => q.questionId).join(', ') || 'none'} |`);
}
lines.push('', '## Passage summaries requiring authoring or inspection', '', '| PT / S / P | Passage ID | Missing summary variants |', '|---|---:|---|');
for (const p of passages) {
  const absent = variants.filter(v => !text(p.summaries?.[v]));
  if (absent.length) lines.push(`| ${p.preptest} / ${p.section} / ${p.setNumber} | ${p.passageId} | ${absent.join(', ')} |`);
}
if (!passages.some(p => variants.some(v => !text(p.summaries?.[v])))) lines.push('| none | n/a | none |');
lines.push('', '## Source flag disagreements', '', '| Question ID | hasWrittenExplanation | Any prose present |', '|---:|---|---|');
for (const q of flagMismatches) lines.push(`| ${q.questionId} | ${String(q.hasWrittenExplanation)} | ${anyProse(q)} |`);
if (!flagMismatches.length) lines.push('| none | n/a | n/a |');
lines.push('', '## How to use this inventory', '',
  'Prioritize missing explanations by actual student demand and curriculum importance. Review supplied summaries and explanations against the teaching standard before authoring replacements. Preserve passage text and annotation offsets. Do not manufacture explanations or infer missing prose from answer keys or tags.', '',
  'This report completes the structural coverage inventory only. Authored explanation review, prioritization, remediation and student-facing acceptance remain separate work.', '');
const destination = path.join(root, 'docs/verification/rc-explanation-coverage.md');
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, lines.join('\n'));
console.log(JSON.stringify({ files: files.length, passages: passages.length, questions: questions.length, missingProse: missing.length, flagMismatches: flagMismatches.length, report: path.relative(root, destination) }));

import { isReviewedSourceChange } from '../rc-source-correction.mjs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Reads source only. Its sole write is the generated verification report.
const baseline = process.argv[2] ?? 'origin/main';
const baseSha = execFileSync('git', ['rev-parse', baseline], { encoding: 'utf8' }).trim();
const directory = 'public/data/rc';
const files = readdirSync(directory).filter(name => /^RC-PT\d+\.json$/.test(name)).sort();
const baselineFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', baseSha, '--', directory], { encoding: 'utf8' })
  .trim().split('\n').filter(name => /\/RC-PT\d+\.json$/.test(name));
const errors = [];
const changes = [];
const sourceChanges = [];
const passageIds = new Set();
const questionIds = new Set();
const workingHash = createHash('sha256');
const baselineHash = createHash('sha256');
let passages = 0;
let questions = 0;
const authored = path => /^passages\[\d+\]\.summaries\.(?:standard|brief|anotherWay)$/.test(path)
  || /^passages\[\d+\]\.questions\[\d+\]\.(?:explanationBlocks|hasWrittenExplanation)(?:\.|\[|$)/.test(path)
  || /^passages\[\d+\]\.questions\[\d+\]\.choices\[\d+\]\.(?:tag|explanation)(?:\.|$)/.test(path);
function diff(before, after, path, file) {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  if (isReviewedSourceChange(file, path, before, after)) { sourceChanges.push(`${file}: ${path}`); return; }
  if (authored(path)) { changes.push(`${file}: ${path}`); return; }
  if (Array.isArray(before) && Array.isArray(after) && before.length === after.length) {
    before.forEach((value, index) => diff(value, after[index], `${path}[${index}]`, file)); return;
  }
  if (before && after && !Array.isArray(before) && !Array.isArray(after) && typeof before === 'object' && typeof after === 'object') {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) diff(before[key], after[key], path ? `${path}.${key}` : key, file);
    return;
  }
  errors.push(`${file}: protected field changed: ${path}`);
}
function nonempty(value) { return typeof value === 'string' && value.trim().length > 0; }
for (const file of files) {
  const path = `${directory}/${file}`;
  if (!baselineFiles.includes(path)) { errors.push(`${path}: no baseline file`); continue; }
  const raw = readFileSync(path, 'utf8');
  const previous = execFileSync('git', ['show', `${baseSha}:${path}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  workingHash.update(`${path}\0${raw}\0`); baselineHash.update(`${path}\0${previous}\0`);
  const bank = JSON.parse(raw); const original = JSON.parse(previous);
  diff(original, bank, '', path);
  if (!Array.isArray(bank.passages)) { errors.push(`${path}: passages must be an array`); continue; }
  for (const passage of bank.passages) {
    passages++;
    const at = `${path}: passage ${passage.passageId}`;
    if (!Number.isInteger(passage.passageId) || passageIds.has(passage.passageId)) errors.push(`${at}: missing or duplicate passage ID`);
    passageIds.add(passage.passageId);
    if (!nonempty(passage.text)) errors.push(`${at}: empty official passage`);
    if (!passage.summaries || typeof passage.summaries !== 'object' || Array.isArray(passage.summaries)) errors.push(`${at}: malformed summaries`);
    else for (const [variant, summary] of Object.entries(passage.summaries)) if (summary !== null && typeof summary !== 'string') errors.push(`${at}: malformed summary ${variant}`);
    for (const question of passage.questions ?? []) {
      questions++;
      const qt = `${at}, question ${question.questionId}`;
      if (!Number.isInteger(question.questionId) || questionIds.has(question.questionId)) errors.push(`${qt}: missing or duplicate question ID`);
      questionIds.add(question.questionId);
      const choices = question.choices ?? [];
      const letters = choices.map(choice => choice.letter);
      if (letters.length !== 5 || new Set(letters).size !== 5 || letters.some(letter => !/^[A-E]$/.test(letter))) errors.push(`${qt}: expected five distinct A-E choices`);
      const credited = choices.filter(choice => choice.correct === true);
      if (credited.length !== 1 || credited[0].letter !== question.correctAnswer) errors.push(`${qt}: answer key and sole credited choice disagree`);
      if (typeof question.hasWrittenExplanation !== 'boolean') errors.push(`${qt}: explanation flag must be boolean`);
      if (question.explanationBlocks !== null && question.explanationBlocks !== undefined && (!Array.isArray(question.explanationBlocks)
        || question.explanationBlocks.some(block => !block || (block.heading !== null && typeof block.heading !== 'string') || typeof block.body !== 'string'))) errors.push(`${qt}: malformed explanation blocks`);
      for (const choice of choices) for (const key of ['tag', 'explanation']) if (choice[key] !== null && choice[key] !== undefined && typeof choice[key] !== 'string') errors.push(`${qt}: malformed choice ${choice.letter} ${key}`);
    }
  }
}
for (const file of baselineFiles) if (!files.includes(file.split('/').at(-1))) errors.push(`${file}: baseline bank removed`);
const report = `# RC authored-field integrity\n\nGenerated by \`node scripts/verification/audit-rc-authored-integrity.mjs ${baseline}\`.\n\nBaseline: \`${baseSha}\`. Files: ${files.length}; passages: ${passages}; questions: ${questions}.\n\nWorking bank SHA-256 (sorted path, NUL, raw bytes, NUL): \`${workingHash.digest('hex')}\`.\n\nBaseline bank SHA-256 with the same framing: \`${baselineHash.digest('hex')}\`.\n\nResult: **${errors.length ? 'FAIL' : 'PASS'}**. ${errors.length} integrity errors. ${changes.length} allowed authored-field changes.\n\nOfficial passage text, IDs, source metadata, prompts, choice text/letters, order, keys and imported statistics must match the baseline exactly. The separately reviewed Q10655 official quotation restoration is the sole protected-field exception. Only passage summaries, question explanation blocks/coverage flag, and choice tags/explanations may change. This structural check does not approve pedagogical correctness or media accessibility; unknown media fields fail closed pending a reviewed contract.\n\n## Reviewed official-source corrections\n\n${sourceChanges.length ? sourceChanges.map(change => `- ${change}`).join('\n') : 'None.'}\n\n## Integrity errors\n\n${errors.length ? errors.map(error => `- ${error}`).join('\n') : 'None.'}\n\n## Exact allowed changed paths\n\n${changes.length ? changes.map(change => `- ${change}`).join('\n') : 'None.'}\n`;
const destination = resolve('docs/verification/rc-authored-integrity.md');
writeFileSync(destination, report);
console.log(JSON.stringify({ baseline: baseSha, files: files.length, passages, questions, errors: errors.length, allowedChanges: changes.length, report: destination }));
if (errors.length) process.exitCode = 1;

#!/usr/bin/env node
// Bank answer keys: reconcile every question's `correctAnswer` against the
// LSAT Lab cohort sidecar (public/data/question-stats.json), whose `c` field is
// LSAT Lab's own declared correct choice.
//
// Why this exists: the original 2026-04 bank import carried ~190 wrong answer
// keys. The accurate LSAT Lab data arrived later as question-stats.json and the
// per-PT explanation sidecars, but nothing ever wrote it back into
// `correctAnswer` — which is the field the drill runner grades against. A
// student picking the real answer was marked wrong while the explanation panel
// (which reads expl.correctChoice) told them the opposite.
//
// The sidecar was validated as authoritative against a third, independent
// source: the hand-transcribed LSAT Lab explanations in the vault
// (ai-os/wiki/explanations/PT*-explanations.md). Across 2,656 questions with
// coverage in all three, the sidecar and the transcripts agreed on every single
// one, and the bank disagreed with both on 188.
//
// Writes the per-section files in place; they are the editable source of truth.
// Re-run `node scripts/build-question-bank.mjs` afterwards to refresh the merged
// build artifact (the prebuild hook also does this).
//
// Idempotent. `--check` reports without writing and exits non-zero on drift, so
// CI can keep grading honest.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO, 'public/data');
const STATS_PATH = path.join(DATA_DIR, 'question-stats.json');

const checkOnly = process.argv.includes('--check');

const stats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8')).q ?? {};

const files = fs
  .readdirSync(DATA_DIR)
  .filter((f) => /-LR\.json$/.test(f))
  .sort();

const repaired = [];
let scanned = 0;
let unstatted = 0;

for (const file of files) {
  const abs = path.join(DATA_DIR, file);
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    console.error(`repair-correct-answers: ${file} is unparseable: ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(doc)) continue;

  let dirty = false;
  for (const q of doc) {
    scanned++;
    const qid = `${q.practiceTest}-S${q.sectionNumber}-Q${q.questionNumber}`;
    const truth = stats[qid]?.c;
    // No cohort data for this question: leave the import's key alone rather
    // than guess. These are reported so the gap stays visible.
    if (!truth) {
      unstatted++;
      continue;
    }
    if (q.correctAnswer === truth) continue;
    repaired.push({ qid, from: q.correctAnswer, to: truth, type: q.questionType });
    q.correctAnswer = truth;
    dirty = true;
  }

  if (dirty && !checkOnly) {
    fs.writeFileSync(abs, JSON.stringify(doc, null, 2) + '\n');
  }
}

for (const r of repaired) {
  console.log(`  ${r.qid.padEnd(14)} ${r.from} -> ${r.to}   (${r.type})`);
}
console.log(
  `repair-correct-answers: ${scanned} questions scanned, ${unstatted} without cohort data, ` +
    `${repaired.length} answer key(s) ${checkOnly ? 'still wrong' : 'corrected'}.`,
);

if (checkOnly && repaired.length > 0) {
  console.error(
    'repair-correct-answers: bank answer keys disagree with the LSAT Lab sidecar. ' +
      'Run `node scripts/repair-correct-answers.mjs` to fix.',
  );
  process.exit(1);
}

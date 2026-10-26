#!/usr/bin/env node
// Step 1 of the feature-assignment pipeline (precision-only).
//
// Reads public/data/PT*-S*-LR.json (source of truth) and produces:
//   scripts/out/feature-worklist.json   — every UNTAGGED question (empty/absent
//                                          questionFeatures), with the text a
//                                          classifier needs.
//   scripts/out/feature-exemplars.json  — for each canonical feature, up to N
//                                          already-tagged questions that carry
//                                          it, to calibrate "what a clear fit
//                                          looks like."
//
// Pure data. No AI, no writes to the question bank.
//
// Usage: node scripts/build-feature-worklist.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO, 'public/data');
const OUT_DIR = path.join(__dirname, 'out');
const EXEMPLARS_PER_FEATURE = 6;
const STIM_SNIP = 600; // chars of stimulus kept in exemplars (worklist keeps full)

// Canonical 60-feature vocabulary, mirrored from src/lib/questionFeatureFamilies.ts.
// The classifier may ONLY assign strings from this set.
const CANONICAL_FEATURES = new Set([
  // Conditional & Formal Logic
  'Complex Conditionals', 'Conditional Conclusion', 'Conditional Diagramming',
  'Contrapositive Logic', 'Logical Completion', 'Refute a Conditional',
  'Sufficient vs. Necessary Flaw', 'Untriggered Conditional',
  // Causal Reasoning
  'Anti-Causal', 'Causal Chains', 'Causal Difference-Maker',
  // Quantities, Sampling & Math
  'Math-y Stuff', 'Net Effect', 'Percentages', 'Quantifiers',
  'Relative vs. Absolute', 'Sampling', 'Volume Dial',
  // Argument Structure
  'First Sentence Conclusion', 'Focused on Evidence', 'Implicit Principles',
  'Implied Conclusion', 'Important Pivot', 'Intermediate Conclusions',
  'Links Between Premises', 'Missing Link / Idea', 'New Concept in Conclusion',
  'Principles in Stimulus',
  // Answer Choice Traps
  'Abstract Answers', 'Argue the Anti-Conclusion', 'Defender', 'Famous Flaws',
  'Principles in Answers', 'Repetitive Answers', 'Worst of the Worst',
  // Match, Similarity & Composition
  'Analogies', 'Assumes Difference', 'Assumes Similarity', 'Part vs. Whole',
  // Stimulus Style
  '2-Speaker', 'Battle of Opinions', 'Clarification/Misunderstanding',
  'Dense Stimulus', 'Rebuttals',
  // Tasks & Question Goals
  'Alternatives', 'Binaries', 'Breadcrumbs', 'Explain Curious Fact',
  'Plans / Recommendations', 'Plausibility', 'Predictions',
  'Proposition/Generalization', 'Ruling Out Options', 'Timeframes',
  'Weighing Tradeoffs',
  // Quirks & Topics
  'EXCEPT', 'Rule Puzzle', 'Medical', 'Science',
  // Glossary #34 — present in the data bank (59 questions) and in the glossary
  // rubric, but MISSING from src/lib/questionFeatureFamilies.ts. Included here so
  // clear-fit cases can still be tagged. (Taxonomy-file gap flagged separately.)
  'Belief / Knowledge / Intent',
]);

const files = fs.readdirSync(DATA_DIR)
  .filter((f) => /^PT\d+-S\d+-LR\.json$/.test(f))
  .sort();

const isUntagged = (q) =>
  !Array.isArray(q.questionFeatures) || q.questionFeatures.length === 0;

const qid = (q) =>
  `${q.practiceTest}-S${q.sectionNumber}-Q${q.questionNumber}`;

const worklist = [];
const exemplarsByFeature = new Map(); // feature -> [{qid, qtype, stim, stem}]
const unknownFeatures = new Map();    // feature string in bank but not canonical -> count
const perPtUntagged = new Map();

for (const file of files) {
  const fp = path.join(DATA_DIR, file);
  const arr = JSON.parse(fs.readFileSync(fp, 'utf8'));
  for (const q of arr) {
    if (isUntagged(q)) {
      worklist.push({
        qid: qid(q),
        pt: q.practiceTest,
        section: q.sectionNumber,
        qnum: q.questionNumber,
        qtype: q.questionType,
        reasoningType: q.reasoningType || [],
        stimulus: q.stimulus || '',
        questionStem: q.questionStem || '',
        answerChoices: q.answerChoices || {},
        correctAnswer: q.correctAnswer || '',
      });
      const pt = q.practiceTest;
      perPtUntagged.set(pt, (perPtUntagged.get(pt) || 0) + 1);
      continue;
    }
    // Tagged -> harvest as exemplars.
    for (const f of q.questionFeatures) {
      if (!CANONICAL_FEATURES.has(f)) {
        unknownFeatures.set(f, (unknownFeatures.get(f) || 0) + 1);
        continue;
      }
      const bucket = exemplarsByFeature.get(f) || [];
      if (bucket.length < EXEMPLARS_PER_FEATURE * 4) {
        // over-collect, then down-sample for qtype spread below
        bucket.push({
          qid: qid(q),
          qtype: q.questionType,
          stim: (q.stimulus || '').slice(0, STIM_SNIP),
          stem: q.questionStem || '',
        });
      }
      exemplarsByFeature.set(f, bucket);
    }
  }
}

// Down-sample each feature's exemplars for qtype diversity.
const exemplars = {};
for (const f of CANONICAL_FEATURES) {
  const pool = exemplarsByFeature.get(f) || [];
  const seenTypes = new Set();
  const picked = [];
  // First pass: one per distinct qtype.
  for (const ex of pool) {
    if (picked.length >= EXEMPLARS_PER_FEATURE) break;
    if (!seenTypes.has(ex.qtype)) {
      seenTypes.add(ex.qtype);
      picked.push(ex);
    }
  }
  // Second pass: fill remaining slots.
  for (const ex of pool) {
    if (picked.length >= EXEMPLARS_PER_FEATURE) break;
    if (!picked.includes(ex)) picked.push(ex);
  }
  exemplars[f] = { count: pool.length, examples: picked };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'feature-worklist.json'),
  JSON.stringify(worklist, null, 2) + '\n',
);
fs.writeFileSync(
  path.join(OUT_DIR, 'feature-exemplars.json'),
  JSON.stringify(exemplars, null, 2) + '\n',
);

console.log('=== Step 1: worklist + exemplars ===');
console.log(`Files scanned:        ${files.length}`);
console.log(`Untagged questions:   ${worklist.length}`);
console.log(`Features with <3 exemplars:`);
for (const f of CANONICAL_FEATURES) {
  if (exemplars[f].count < 3) console.log(`  ${f} (${exemplars[f].count})`);
}
if (unknownFeatures.size) {
  console.log(`\nNon-canonical feature strings found in bank (NOT used):`);
  for (const [f, n] of [...unknownFeatures].sort((a, b) => b[1] - a[1])) {
    console.log(`  "${f}" x${n}`);
  }
}
console.log(`\nUntagged by PrepTest:`);
const ptRows = [...perPtUntagged].sort();
for (const [pt, n] of ptRows) console.log(`  ${pt}: ${n}`);
console.log(`\nWrote:`);
console.log(`  ${path.relative(REPO, path.join(OUT_DIR, 'feature-worklist.json'))}`);
console.log(`  ${path.relative(REPO, path.join(OUT_DIR, 'feature-exemplars.json'))}`);

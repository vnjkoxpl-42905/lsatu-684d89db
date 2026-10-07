#!/usr/bin/env node
// Step 3 of the feature-assignment pipeline (precision-only).
//
// Reads scripts/out/feature-assignments.json and writes the clear-fit
// `questionFeatures` into the question bank — but ONLY for questions whose
// questionFeatures is currently empty/absent. Never overwrites existing tags,
// never touches reasoningType or any other field.
//
// A question with an empty feature list in the assignments file is left
// untagged by design (no error, no backlog).
//
// Usage:
//   node scripts/apply-feature-assignments.mjs --dry     # report only, no writes
//   node scripts/apply-feature-assignments.mjs           # apply
//
// Emits scripts/out/feature-apply-report.md (audit log of what was applied + why).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO, 'public/data');
const OUT_DIR = path.join(__dirname, 'out');
const ASSIGN_PATH = path.join(OUT_DIR, 'feature-assignments.json');
const DRY = process.argv.includes('--dry');

// Canonical allowed feature strings (60 from questionFeatureFamilies.ts + the
// data-bank-only "Belief / Knowledge / Intent"). Kept in sync with
// build-feature-worklist.mjs. Any assignment outside this set is rejected.
const ALLOWED = new Set([
  'Complex Conditionals', 'Conditional Conclusion', 'Conditional Diagramming',
  'Contrapositive Logic', 'Logical Completion', 'Refute a Conditional',
  'Sufficient vs. Necessary Flaw', 'Untriggered Conditional',
  'Anti-Causal', 'Causal Chains', 'Causal Difference-Maker',
  'Math-y Stuff', 'Net Effect', 'Percentages', 'Quantifiers',
  'Relative vs. Absolute', 'Sampling', 'Volume Dial',
  'First Sentence Conclusion', 'Focused on Evidence', 'Implicit Principles',
  'Implied Conclusion', 'Important Pivot', 'Intermediate Conclusions',
  'Links Between Premises', 'Missing Link / Idea', 'New Concept in Conclusion',
  'Principles in Stimulus',
  'Abstract Answers', 'Argue the Anti-Conclusion', 'Defender', 'Famous Flaws',
  'Principles in Answers', 'Repetitive Answers', 'Worst of the Worst',
  'Analogies', 'Assumes Difference', 'Assumes Similarity', 'Part vs. Whole',
  '2-Speaker', 'Battle of Opinions', 'Clarification/Misunderstanding',
  'Dense Stimulus', 'Rebuttals',
  'Alternatives', 'Binaries', 'Breadcrumbs', 'Explain Curious Fact',
  'Plans / Recommendations', 'Plausibility', 'Predictions',
  'Proposition/Generalization', 'Ruling Out Options', 'Timeframes',
  'Weighing Tradeoffs',
  'EXCEPT', 'Games-y LR', 'Medical', 'Science',
  'Belief / Knowledge / Intent',
]);

if (!fs.existsSync(ASSIGN_PATH)) {
  console.error(`Missing ${path.relative(REPO, ASSIGN_PATH)}. Run Step 2 first.`);
  process.exit(1);
}
const assignments = JSON.parse(fs.readFileSync(ASSIGN_PATH, 'utf8'));

// Index data files by "PT###-S#" and load lazily.
const files = fs.readdirSync(DATA_DIR).filter((f) => /^PT\d+-S\d+-LR\.json$/.test(f));
const fileByKey = new Map();
for (const f of files) {
  const m = f.match(/^(PT\d+)-S(\d+)-LR\.json$/);
  fileByKey.set(`${m[1]}-S${m[2]}`, path.join(DATA_DIR, f));
}

const parseQid = (qid) => {
  const m = qid.match(/^(PT\d+)-S(\d+)-Q(\d+)$/);
  return m ? { fileKey: `${m[1]}-S${m[2]}`, qnum: +m[3] } : null;
};

const loaded = new Map(); // fp -> {json, dirty}
const getFile = (fp) => {
  if (!loaded.has(fp)) loaded.set(fp, { json: JSON.parse(fs.readFileSync(fp, 'utf8')), dirty: false });
  return loaded.get(fp);
};

let applied = 0, leftUntagged = 0, skippedTagged = 0, badQid = 0, rejectedFeature = 0;
const reportRows = [];
const rejected = [];

for (const a of assignments) {
  const features = Array.isArray(a.features) ? a.features : [];
  const clean = features.filter((f) => {
    if (ALLOWED.has(f.name)) return true;
    rejected.push(`${a.qid}: "${f.name}"`);
    rejectedFeature++;
    return false;
  });
  if (clean.length === 0) { leftUntagged++; continue; }

  const parsed = parseQid(a.qid);
  if (!parsed) { badQid++; continue; }
  const fp = fileByKey.get(parsed.fileKey);
  if (!fp) { badQid++; continue; }

  const entry = getFile(fp);
  const q = entry.json.find((x) => x.questionNumber === parsed.qnum);
  if (!q) { badQid++; continue; }

  // No-overwrite guard: only fill empty/absent feature arrays.
  if (Array.isArray(q.questionFeatures) && q.questionFeatures.length > 0) {
    skippedTagged++;
    continue;
  }

  const names = clean.map((f) => f.name);
  if (!DRY) { q.questionFeatures = names; entry.dirty = true; }
  applied++;
  reportRows.push({ qid: a.qid, qtype: q.questionType, features: clean });
}

if (!DRY) {
  for (const [fp, entry] of loaded) {
    if (entry.dirty) fs.writeFileSync(fp, JSON.stringify(entry.json, null, 2) + '\n');
  }
}

// Audit log (transparency, not a to-do).
let md = `# Feature apply report${DRY ? ' (DRY RUN — no writes)' : ''}\n\n`;
md += `Applied ${applied} questions. Left untagged by design: ${leftUntagged}. `;
md += `Skipped (already tagged): ${skippedTagged}.\n\n`;
md += `| Question | Type | Features applied | Why |\n|---|---|---|---|\n`;
for (const r of reportRows.sort((a, b) => a.qid.localeCompare(b.qid))) {
  const feats = r.features.map((f) => f.name).join(', ');
  const why = r.features.map((f) => `**${f.name}**: ${f.rationale || ''}`).join('; ').replace(/\n/g, ' ');
  md += `| ${r.qid} | ${r.qtype} | ${feats} | ${why} |\n`;
}
fs.writeFileSync(path.join(OUT_DIR, 'feature-apply-report.md'), md);

console.log(`=== Step 3: apply ${DRY ? '(DRY RUN)' : ''} ===`);
console.log(`Questions newly tagged:     ${applied}`);
console.log(`Left untagged by design:    ${leftUntagged}`);
console.log(`Skipped (already tagged):   ${skippedTagged}`);
console.log(`Bad/unmatched qids:         ${badQid}`);
console.log(`Rejected non-canonical:     ${rejectedFeature}`);
if (rejected.length) { console.log(`  ` + rejected.slice(0, 20).join('\n  ')); }
console.log(`Audit log: ${path.relative(REPO, path.join(OUT_DIR, 'feature-apply-report.md'))}`);

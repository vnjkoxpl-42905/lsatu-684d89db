#!/usr/bin/env node
// One-off: tag questions in public/data/PT*-S*-LR.json with `questionFeatures`
// from a markdown table.
//
// Usage: node scripts/apply-question-features.mjs <md-path> [feature-name]
// Default feature: "Conditional Diagramming"

import fs from 'node:fs';
import path from 'node:path';

const MD_PATH = process.argv[2] || '/tmp/cd-features.md';
const FEATURE = process.argv[3] || 'Conditional Diagramming';
const DATA_DIR = path.resolve('public/data');

const md = fs.readFileSync(MD_PATH, 'utf8');
const rows = [];
for (const line of md.split('\n')) {
  // Format A: | PT###-S#-Q# | ...
  let m = line.match(/^\|\s*PT(\d+)-S(\d+)-Q(\d+)\s*\|/);
  if (m) { rows.push({ pt: +m[1], section: +m[2], qnum: +m[3] }); continue; }
  // Format B: | # | PT | S | Q | ... (numeric-only cells)
  m = line.match(/^\|\s*\d+\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/);
  if (m) { rows.push({ pt: +m[1], section: +m[2], qnum: +m[3] }); continue; }
  // Format C: | PT | S | Q | ... (no leading index)
  m = line.match(/^\|\s*(\d{3})\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/);
  if (m) { rows.push({ pt: +m[1], section: +m[2], qnum: +m[3] }); continue; }
}
console.log(`Parsed ${rows.length} rows from ${MD_PATH}`);
console.log(`Feature: "${FEATURE}"`);

const files = fs.readdirSync(DATA_DIR).filter(f => /^PT\d+-S\d+-LR\.json$/.test(f));
const fileIndex = new Map();
for (const f of files) {
  const m = f.match(/^PT(\d+)-S(\d+)-LR\.json$/);
  fileIndex.set(`${+m[1]}-${+m[2]}`, path.join(DATA_DIR, f));
}

const byFile = new Map();
const unmatchedFile = [];
for (const r of rows) {
  const fp = fileIndex.get(`${r.pt}-${r.section}`);
  if (!fp) { unmatchedFile.push(r); continue; }
  if (!byFile.has(fp)) byFile.set(fp, []);
  byFile.get(fp).push(r);
}

let matched = 0, alreadyTagged = 0, missingQ = 0;
const missingDetails = [];

for (const [fp, list] of byFile) {
  const json = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const qIndex = new Map(json.map((q, i) => [q.questionNumber, i]));
  let dirty = false;
  for (const r of list) {
    const idx = qIndex.get(r.qnum);
    if (idx === undefined) {
      missingQ++;
      missingDetails.push(`PT${r.pt}-S${r.section}-Q${r.qnum} (file exists, qnum missing)`);
      continue;
    }
    const q = json[idx];
    const features = Array.isArray(q.questionFeatures) ? q.questionFeatures : [];
    if (features.includes(FEATURE)) {
      alreadyTagged++;
    } else {
      features.push(FEATURE);
      q.questionFeatures = features;
      dirty = true;
      matched++;
    }
  }
  if (dirty) fs.writeFileSync(fp, JSON.stringify(json, null, 2) + '\n');
}

console.log(`\n=== REPORT ===`);
console.log(`Total rows:           ${rows.length}`);
console.log(`Newly tagged:         ${matched}`);
console.log(`Already tagged:       ${alreadyTagged}`);
console.log(`File missing (PT/S):  ${unmatchedFile.length}`);
console.log(`Q missing in file:    ${missingQ}`);

if (unmatchedFile.length) {
  const pts = [...new Set(unmatchedFile.map(r => `PT${r.pt}-S${r.section}`))].sort();
  console.log(`\nMissing files (${pts.length}):`);
  for (const p of pts) console.log(`  ${p}`);
}
if (missingDetails.length) {
  console.log(`\nMissing questions:`);
  for (const m of missingDetails.slice(0, 50)) console.log(`  ${m}`);
}

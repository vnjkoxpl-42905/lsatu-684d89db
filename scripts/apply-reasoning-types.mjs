#!/usr/bin/env node
// Authoritative reasoning-type tagger. Replaces the heuristic single-string
// `reasoningType` with a multi-valued array sourced from three curated .md
// tables. A question can carry multiple labels.
//
// Input files (markdown tables: |pt|s|q|stimulus|):
//   /tmp/rt/causation.md          → "Causation"
//   /tmp/rt/conditional-logic.md  → "Conditional Reasoning"
//   /tmp/rt/comparison.md         → "Comparative Reasoning"
//
// Behavior:
//   1. Set every question's `reasoningType` to [] (wipe heuristic value).
//   2. For each tagged row, push the label onto the matching question.
//   3. Preserve key order so reasoningType still sits between questionType
//      and questionFeatures.
//   4. Idempotent.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../public/data');
const SRC_DIR = '/tmp/rt';

const MAP = {
  'causation.md': 'Causation',
  'conditional-logic.md': 'Conditional Reasoning',
  'comparison.md': 'Comparative Reasoning',
};

function parseRows(md) {
  const rows = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/);
    if (!m) continue;
    rows.push({ pt: +m[1], section: +m[2], qnum: +m[3] });
  }
  return rows;
}

// Index every question in the bank by `${pt}-${section}-${qnum}` → question ref.
function loadBank() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const docs = []; // { abs, doc, isArrayRoot, questions }
  const idx = new Map();
  const unparseable = [];
  for (const f of files) {
    const abs = path.join(DATA_DIR, f);
    let doc;
    try { doc = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch (e) {
      console.error(`[parse] ${f}: ${e.message}`);
      unparseable.push(f);
      continue;
    }
    const isArrayRoot = Array.isArray(doc);
    const questions = isArrayRoot ? doc : (doc.questions || []);
    docs.push({ abs, doc, isArrayRoot, questions });
    for (const q of questions) {
      const pt = parseInt(String(q.practiceTest || '').replace(/\D/g, ''), 10);
      const section = q.sectionNumber;
      const qnum = q.questionNumber;
      if (!pt || !section || !qnum) continue;
      idx.set(`${pt}-${section}-${qnum}`, q);
    }
  }
  return { docs, idx, unparseable };
}

// Rewrite reasoningType in place, preserving key order. Slot it after
// questionType when first introduced.
function setReasoningType(q, value) {
  if ('reasoningType' in q) { q.reasoningType = value; return; }
  const out = {};
  for (const k of Object.keys(q)) {
    out[k] = q[k];
    if (k === 'questionType') out.reasoningType = value;
  }
  if (!('reasoningType' in out)) out.reasoningType = value;
  // Mutate q to match out
  for (const k of Object.keys(q)) delete q[k];
  for (const k of Object.keys(out)) q[k] = out[k];
}

function run() {
  const { docs, idx, unparseable } = loadBank();

  // Phase 1: wipe to []
  for (const q of idx.values()) setReasoningType(q, []);

  // Phase 2: apply labels
  const stats = {};
  for (const [file, label] of Object.entries(MAP)) {
    const md = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
    const rows = parseRows(md);
    let matched = 0, alreadyTagged = 0, unmatched = 0;
    const unmatchedSamples = [];
    for (const { pt, section, qnum } of rows) {
      const q = idx.get(`${pt}-${section}-${qnum}`);
      if (!q) {
        unmatched++;
        if (unmatchedSamples.length < 5) unmatchedSamples.push(`PT${pt}-S${section}-Q${qnum}`);
        continue;
      }
      const arr = q.reasoningType;
      if (arr.includes(label)) { alreadyTagged++; continue; }
      arr.push(label);
      matched++;
    }
    stats[label] = { rows: rows.length, matched, alreadyTagged, unmatched, unmatchedSamples };
  }

  // Write back
  let changed = 0;
  for (const { abs, doc, isArrayRoot, questions } of docs) {
    const newDoc = isArrayRoot ? questions : { ...doc, questions };
    const after = JSON.stringify(newDoc, null, 2) + '\n';
    const before = fs.readFileSync(abs, 'utf8');
    if (after !== before) { fs.writeFileSync(abs, after); changed++; }
  }

  // Report
  console.log('=== Reasoning-type tagger ===');
  console.log(`Bank questions indexed: ${idx.size}`);
  console.log(`Files updated:          ${changed}\n`);
  for (const [label, s] of Object.entries(stats)) {
    console.log(`${label}:`);
    console.log(`  source rows:    ${s.rows}`);
    console.log(`  matched:        ${s.matched}`);
    console.log(`  already-tagged: ${s.alreadyTagged}`);
    console.log(`  unmatched:      ${s.unmatched}${s.unmatchedSamples.length ? ` (e.g. ${s.unmatchedSamples.join(', ')})` : ''}`);
  }

  // Distribution
  const dist = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const q of idx.values()) dist[q.reasoningType.length] = (dist[q.reasoningType.length] || 0) + 1;
  console.log('\nQuestions by # of reasoning types:');
  for (const [k, v] of Object.entries(dist)) console.log(`  ${k}: ${v}`);

  // Exit nonzero when any bank could not be parsed, so this can gate CI /
  // a pre-push hook instead of silently reporting success.
  if (unparseable.length) {
    console.error(`\n[FAIL] ${unparseable.length} unparseable bank(s): ${unparseable.join(', ')}`);
    process.exit(1);
  }
}

run();

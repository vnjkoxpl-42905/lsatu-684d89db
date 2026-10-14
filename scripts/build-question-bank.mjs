#!/usr/bin/env node
/**
 * build-question-bank.mjs — COMPREHENSIVEAUDIT Phase 3, item 2.
 *
 * Merges every per-PT section file in public/data/*.json into a single
 * public/data/_bank.generated.json so the app makes ONE request at boot
 * instead of ~156 parallel fetches. The individual section files remain the
 * editable source of truth (the bank-repair / import scripts still write them);
 * this merged file is a build artifact regenerated on every `npm run build`
 * via the `prebuild` hook.
 *
 * Shape: [{ "filename": "/data/PT106-S3-LR.json", "questions": [ ...raw... ] }]
 * Order is stable (sorted by filename) so diffs are reviewable. The loader
 * re-derives everything (PT/section/manifest) from filename + questions exactly
 * as it does for the per-file path, so the merged file carries no extra schema.
 *
 * Fail-loud: if any section file is missing or unparseable, this exits non-zero
 * so a broken bank never ships as a silently-shrunk merged file.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data');
const OUT_NAME = '_bank.generated.json';
const OUT_PATH = join(DATA_DIR, OUT_NAME);
// Sidecars in public/data that are not per-section question arrays.
const NON_SECTION_FILES = new Set([OUT_NAME, 'question-stats.json', 'finder-address-index.json']);

const files = readdirSync(DATA_DIR)
  .filter((f) => f.endsWith('.json') && !NON_SECTION_FILES.has(f))
  .sort();

if (files.length === 0) {
  console.error(`build-question-bank: no section files found in ${DATA_DIR}`);
  process.exit(1);
}

const merged = [];
let totalQuestions = 0;
const failures = [];

for (const f of files) {
  try {
    const raw = JSON.parse(readFileSync(join(DATA_DIR, f), 'utf8'));
    if (!Array.isArray(raw)) {
      failures.push(`${f}: not a JSON array`);
      continue;
    }
    merged.push({ filename: `/data/${f}`, questions: raw });
    totalQuestions += raw.length;
  } catch (err) {
    failures.push(`${f}: ${err.message}`);
  }
}

if (failures.length > 0) {
  console.error('build-question-bank: FAILED to parse section files:');
  for (const msg of failures) console.error(`  - ${msg}`);
  process.exit(1);
}

writeFileSync(OUT_PATH, JSON.stringify(merged));
console.log(
  `build-question-bank: merged ${merged.length} section files (${totalQuestions} questions) -> public/data/${OUT_NAME}`,
);

#!/usr/bin/env node
/**
 * Regenerate src/data/guidedDrillsLocalSeed.ts from data/guided-drills/_seed.json.
 *
 * That file has always been marked AUTO-GENERATED with an instruction to
 * "regenerate when the seed changes", but no generator was ever committed, so
 * it could only drift. This is it.
 *
 * The bundled copy is the DB-independent fallback: it lets a guided drill still
 * resolve its pool client-side when the live row is missing, unpublished, or
 * has a null bank_filter. Field order is fixed so a seed edit produces a
 * minimal, reviewable diff.
 *
 *   node scripts/build-guided-drills-local-seed.mjs [--check]
 *
 * --check exits non-zero if the committed file is stale, for CI or a pre-push
 * hook, without writing anything.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SEED = path.join(REPO, 'data', 'guided-drills', '_seed.json');
const OUT = path.join(REPO, 'src', 'data', 'guidedDrillsLocalSeed.ts');

/** Fixed field order, matching the committed file. */
const FIELDS = [
  'slug',
  'title',
  'category',
  'estimated_minutes',
  'question_count',
  'difficulty_min',
  'difficulty_max',
  'level',
  'question_types',
  'question_features',
  'reasoning_types',
  'start_button_label',
  'instruction_card',
  'bank_filter',
  'week',
  'order_in_week',
  'source_file',
];

const HEADER = `// AUTO-GENERATED from data/guided-drills/_seed.json. Do not edit by hand.
// Regenerate with: node scripts/build-guided-drills-local-seed.mjs
// Bundled so guided-drill launches resolve their pool client-side even when the
// live DB row is missing or lacks a bank_filter. See src/lib/guidedDrillsLocal.ts.

export const GUIDED_DRILLS_LOCAL_SEED = `;

const raw = JSON.parse(fs.readFileSync(SEED, 'utf8'));
const rows = Array.isArray(raw) ? raw : Object.values(raw).flat();

const ordered = rows.map((row) => {
  const out = {};
  for (const field of FIELDS) {
    if (row[field] !== undefined) out[field] = row[field];
  }
  return out;
});

const contents = `${HEADER}${JSON.stringify(ordered, null, 2)} as const;\n`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== contents) {
    console.error(
      'guidedDrillsLocalSeed.ts is stale.\n' +
        'Run: node scripts/build-guided-drills-local-seed.mjs',
    );
    process.exit(1);
  }
  console.log(`guidedDrillsLocalSeed.ts is up to date (${ordered.length} drills).`);
  process.exit(0);
}

fs.writeFileSync(OUT, contents);
const levels = ordered.reduce((acc, r) => {
  const key = r.level ?? 'null';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
console.log(`Wrote ${path.relative(REPO, OUT)} — ${ordered.length} drills.`);
console.log('Levels:', levels);

#!/usr/bin/env node
// Apply the reviewed assignment proposal to data/guided-drills/_seed.json and
// emit an idempotent Supabase migration (LR only). Run AFTER
// scripts/assign-guided-drill-taxonomy.mjs has produced _assignment_proposal.json.
//
// Model: each drill is a vetted FILTER (the reattempt pool) plus a per-attempt
// count N. bank_filter holds that filter; the app (GuidedDrillStart) draws a fresh
// shuffled N from the pool every attempt, so drills are reattemptable with new
// sets — matching LSAT Lab. No fixed question_qids are pinned.
//
// Per drill it writes: question_types / question_features (the effective filter,
// also the display badges), reasoning_types (glossary form, display only),
// difficulty_min/max (effective band), question_count (per-attempt N), and a
// bank_filter that the app's resolveGuidedDrillPool reproduces exactly:
//   - qtypes match q.qtype (normalized canonical) -> use the canonical types
//   - features match q.questionFeatures (canonical) -> use canonical features
//   - reasoning is NOT constrained (left empty) so it never narrows the pool
//   - difficulty band = effective band
// Reading Comprehension (Framework Sampler) is left untouched.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const GUIDED_DIR = path.join(REPO, 'data', 'guided-drills');
const SEED = path.join(GUIDED_DIR, '_seed.json');
const PROPOSAL = path.join(GUIDED_DIR, '_assignment_proposal.json');

// Each run emits a NEW migration. This used to overwrite a fixed filename
// (20260624000000_guided_drills_taxonomy_final.sql), which rewrote a migration
// that had already been applied. That is unsafe in two ways: the remote tracks
// applied versions by name, so edits to an applied file never re-run; and a
// regenerated file sorts BEFORE later migrations, so on a fresh `db reset` it
// would try to set columns those later migrations had not created yet -- which
// is exactly what would happen now that `level` exists.
// Override with: node scripts/apply-guided-drill-taxonomy.mjs --out <path>
const outFlag = process.argv.indexOf('--out');
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const MIGRATION =
  outFlag !== -1 && process.argv[outFlag + 1]
    ? path.resolve(process.argv[outFlag + 1])
    : path.join(REPO, 'supabase', 'migrations', `${stamp}_guided_drills_taxonomy.sql`);

/**
 * Which band a drill is pitched at, for the catalog tag.
 *
 * Joshua's own slug/title token wins over the numeric range, because
 * difficulty_min/max is often left at the 1-5 default: for those drills 1-5
 * means "not tuned yet", not "suits everyone". Across the 114 seeded drills the
 * two signals never disagree. Mirrors the one-time SQL backfill in
 * supabase/migrations/20260805001000_guided_drill_level.sql; that migration
 * only fills rows still NULL, so the two can never fight.
 */
const levelFor = (drill) => {
  const text = `${drill.slug || ''} ${drill.title || ''}`.toLowerCase();
  if (/first[- ]taste|easier|easy/.test(text)) return 'beginner';
  if (/harder|hardest/.test(text)) return 'advanced';
  if (/medium/.test(text)) return 'intermediate';

  const lo = drill.difficulty_min ?? 1;
  const hi = drill.difficulty_max ?? 5;
  const fitsIntermediate = lo >= 2 && hi <= 4;
  if (lo >= 1 && hi <= 3 && !fitsIntermediate) return 'beginner';
  if (lo >= 3 && hi <= 5 && !fitsIntermediate) return 'advanced';
  if (fitsIntermediate) return 'intermediate';
  return null; // wider than any band and unlabelled: genuinely level-agnostic
};

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const sql = (s) => `$gd$${s}$gd$`;
const sqlArr = (arr) => `ARRAY[${(arr || []).map(sql).join(',')}]::text[]`;
const sqlNum = (n) => (n == null ? 'NULL' : String(n));

function main() {
  const seed = readJson(SEED);
  const { rows } = readJson(PROPOSAL);
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const updates = [];
  let applied = 0;
  let skipped = 0;

  for (const drill of seed) {
    const r = bySlug.get(drill.slug);
    if (!r || r.skipped) { skipped += 1; continue; } // RC / framework sampler: untouched

    const bankFilter = {
      qtypes: r.final_question_types || [],
      features: r.final_question_features || [],
      reasoning_types: [], // never constrain the pool by reasoning
      difficulty_min: r.difficulty_min ?? null,
      difficulty_max: r.difficulty_max ?? null,
      count: r.question_count ?? null,
    };

    // Mutate the seed entry in place (taxonomy fields only; instruction_card etc. untouched).
    drill.question_types = r.final_question_types || [];
    drill.question_features = r.final_question_features || [];
    drill.reasoning_types = r.final_reasoning_types || [];
    drill.difficulty_min = r.difficulty_min ?? null;
    drill.difficulty_max = r.difficulty_max ?? null;
    drill.question_count = r.question_count ?? null;
    drill.bank_filter = bankFilter;
    delete drill.question_qids; // pool model: no pinned set
    // Derived, but persisted to _seed.json so it survives a re-run and can be
    // hand-corrected there when the heuristic gets one wrong.
    drill.level = drill.level ?? levelFor(drill);

    updates.push(
      `UPDATE public.guided_drills SET `
      + `question_types=${sqlArr(drill.question_types)}, `
      + `question_features=${sqlArr(drill.question_features)}, `
      + `reasoning_types=${sqlArr(drill.reasoning_types)}, `
      + `difficulty_min=${sqlNum(drill.difficulty_min)}, `
      + `difficulty_max=${sqlNum(drill.difficulty_max)}, `
      + `question_count=${sqlNum(drill.question_count)}, `
      + `level=${drill.level == null ? 'NULL' : sql(drill.level)}, `
      + `bank_filter=${sql(JSON.stringify(bankFilter))}::jsonb, `
      + `updated_at=now() WHERE slug=${sql(drill.slug)};`,
    );
    applied += 1;
  }

  fs.writeFileSync(SEED, `${JSON.stringify(seed, null, 2)}\n`);

  const header = [
    '-- Guided-drill taxonomy: vetted reattempt-pool filters (LR only).',
    '-- Generated from data/guided-drills/_seed.json via scripts/apply-guided-drill-taxonomy.mjs.',
    '-- Each drill is a precise bank_filter (type + feature + difficulty band = the qualified',
    '-- pool) plus a per-attempt question_count N. The app draws a fresh shuffled N from the',
    '-- pool each attempt, so drills are reattemptable with new question sets. question_types,',
    '-- question_features and reasoning_types are the display badges. Idempotent (UPDATE by',
    '-- slug). Reading Comprehension (Framework Sampler) is intentionally untouched.',
    '',
  ].join('\n');

  fs.writeFileSync(MIGRATION, `${header}${updates.join('\n')}\n`);

  console.log('=== Apply guided-drill taxonomy (LR, reattempt-pool model) ===');
  console.log('Drills updated:', applied, '| skipped (RC/untouched):', skipped);
  console.log('Wrote:');
  console.log('  ' + path.relative(REPO, SEED));
  console.log('  ' + path.relative(REPO, MIGRATION));
}

main();

#!/usr/bin/env node
// Apply the reviewed assignment proposal to data/guided-drills/_seed.json and
// emit an idempotent Supabase migration (LR only). Run AFTER
// scripts/assign-guided-drill-taxonomy.mjs has produced _assignment_proposal.json.
//
// For each LR drill it writes the qid-derived signature:
//   question_types, question_features, reasoning_types (glossary form, display),
//   difficulty_min/max, question_count, question_qids (ordered, resolvable),
//   and a synced bank_filter (fallback matcher).
// Reading Comprehension (Framework Sampler) is left untouched.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const GUIDED_DIR = path.join(REPO, 'data', 'guided-drills');
const SEED = path.join(GUIDED_DIR, '_seed.json');
const PROPOSAL = path.join(GUIDED_DIR, '_assignment_proposal.json');
const MIGRATION = path.join(REPO, 'supabase', 'migrations', '20260624000000_guided_drills_taxonomy_final.sql');

// bank_filter matcher lowercase-compares against q.reasoningType, which the loader
// stores RAW. Map the glossary display form back to the raw bank values.
const RAW_REASONING = {
  'Conditional Logic': 'Conditional Reasoning',
  'Causation': 'Causation',
  'Comparison': 'Comparative Reasoning',
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

    const reasoningDisplay = r.final_reasoning_types || [];
    const bankFilter = {
      qtypes: r.final_question_types || [],
      features: r.final_question_features || [],
      reasoning_types: reasoningDisplay.map((x) => RAW_REASONING[x] ?? x),
      difficulty_min: r.difficulty_min ?? null,
      difficulty_max: r.difficulty_max ?? null,
      count: r.question_count ?? null,
    };

    // Mutate the seed entry in place (taxonomy fields only).
    drill.question_types = r.final_question_types || [];
    drill.question_features = r.final_question_features || [];
    drill.reasoning_types = reasoningDisplay;
    drill.difficulty_min = r.difficulty_min ?? null;
    drill.difficulty_max = r.difficulty_max ?? null;
    drill.question_count = r.question_count ?? null;
    drill.question_qids = r.question_qids || [];
    drill.bank_filter = bankFilter;

    updates.push(
      `UPDATE public.guided_drills SET `
      + `question_types=${sqlArr(drill.question_types)}, `
      + `question_features=${sqlArr(drill.question_features)}, `
      + `reasoning_types=${sqlArr(drill.reasoning_types)}, `
      + `difficulty_min=${sqlNum(drill.difficulty_min)}, `
      + `difficulty_max=${sqlNum(drill.difficulty_max)}, `
      + `question_count=${sqlNum(drill.question_count)}, `
      + `question_qids=${sqlArr(drill.question_qids)}, `
      + `bank_filter=${sql(JSON.stringify(bankFilter))}::jsonb, `
      + `updated_at=now() WHERE slug=${sql(drill.slug)};`,
    );
    applied += 1;
  }

  fs.writeFileSync(SEED, `${JSON.stringify(seed, null, 2)}\n`);

  const header = [
    '-- Guided-drill taxonomy: final qid-backed assignment (LR only).',
    '-- Generated from data/guided-drills/_seed.json via scripts/apply-guided-drill-taxonomy.mjs.',
    '-- Each drill gets a deterministic ordered question_qids set plus question_types,',
    '-- question_features, reasoning_types and difficulty levels DERIVED from those exact',
    '-- questions. Idempotent (UPDATE by slug). Reading Comprehension (Framework Sampler)',
    '-- is intentionally untouched: no RC bank exists.',
    '',
    "ALTER TABLE public.guided_drills ADD COLUMN IF NOT EXISTS question_qids text[] NOT NULL DEFAULT '{}'::text[];",
    '',
  ].join('\n');

  fs.writeFileSync(MIGRATION, `${header}${updates.join('\n')}\n`);

  console.log('=== Apply guided-drill taxonomy (LR) ===');
  console.log('Drills updated:', applied, '| skipped (RC/untouched):', skipped);
  console.log('Wrote:');
  console.log('  ' + path.relative(REPO, SEED));
  console.log('  ' + path.relative(REPO, MIGRATION));
}

main();

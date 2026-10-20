#!/usr/bin/env node
// Guided-drill taxonomy ASSIGNMENT engine (LR only).
//
// Evolution of scripts/audit-guided-drill-taxonomy.mjs. Where the audit only
// *recommended* metadata, this engine selects a deterministic ordered qid set
// per drill from the LR question bank, then DERIVES the final question_types /
// question_features / reasoning_types / difficulty levels FROM those exact qids.
// Metadata therefore describes the questions actually served, not the teaching
// card. Read-only: it emits a proposal artifact; it does not touch _seed.json or
// the DB. Reading Comprehension is entirely out of scope.
//
// Emitted qids use the app's resolvable format: hashQid(pt,section,qnum) =>
// `PT{pt}-S{section}-Q{qnum}` (src/lib/questionLoader.ts), with pt/section parsed
// from the bank filename exactly as the loader does, so gatherQids() resolves them.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO, 'public', 'data');
const GUIDED_DIR = path.join(REPO, 'data', 'guided-drills');
const AUDIT_JSON = path.join(GUIDED_DIR, '_type_feature_audit.json');
const OVERRIDES_JSON = path.join(GUIDED_DIR, '_overrides.json');
const OUT_JSON = path.join(GUIDED_DIR, '_assignment_proposal.json');
const OUT_CSV = path.join(GUIDED_DIR, '_assignment_proposal.csv');
const OUT_MD = path.join(REPO, 'docs', 'audits', 'guided-drill-assignment-proposal.md');

// ----- Canonical question-type taxonomy (mirrors src/lib/questionLoader.ts) -----
const ALL_TYPES = [
  'Flaw', 'Necessary Assumption', 'Weaken', 'Strengthen', 'Sufficient Assumption',
  'Principle-Strengthen', 'Evaluate', 'Most Strongly Supported', 'Must Be True',
  'Agree/Disagree', 'Must Be False', 'Method of Reasoning', 'Main Conclusion',
  'Parallel Flaw', 'Role', 'Parallel Reasoning', 'Principle-Conform', 'Paradox',
];
const ALL_TYPES_SET = new Set(ALL_TYPES);

const TYPE_SYNONYMS = {
  'Flaw': 'Flaw', 'Flaw in Reasoning': 'Flaw', 'Flawed Reasoning': 'Flaw', 'Error in Reasoning': 'Flaw',
  'Necessary Assumption': 'Necessary Assumption', 'Assumption': 'Necessary Assumption',
  'Sufficient Assumption': 'Sufficient Assumption',
  'Strengthen': 'Strengthen', 'Weaken': 'Weaken', 'Justify the Exception': 'Strengthen',
  'Principle-Strengthen': 'Principle-Strengthen', 'Principle Strengthen': 'Principle-Strengthen',
  'Principle: Strengthen': 'Principle-Strengthen', 'Principle: Justify': 'Principle-Strengthen',
  'Principle Justify': 'Principle-Strengthen',
  'Principle-Conform': 'Principle-Conform', 'Principle Conform': 'Principle-Conform',
  'Principle: Conform': 'Principle-Conform', 'Principle: Underlying': 'Principle-Conform',
  'Principle Application': 'Principle-Conform', 'Principle': 'Principle-Conform',
  'Evaluate': 'Evaluate', 'Evaluate the Argument': 'Evaluate', 'Argument Evaluation': 'Evaluate',
  'Most Strongly Supported': 'Most Strongly Supported', 'Most Supported': 'Most Strongly Supported',
  'Complete the Argument': 'Most Strongly Supported',
  'Main Point': 'Main Conclusion', 'Main Conclusion': 'Main Conclusion',
  'Identify The Conclusion': 'Main Conclusion', 'Identify the Conclusion': 'Main Conclusion',
  'Must Be True': 'Must Be True', 'Must be True': 'Must Be True',
  'Must Be False': 'Must Be False',
  'Agree/Disagree': 'Agree/Disagree', 'Point at Issue': 'Agree/Disagree',
  'Point of Agreement': 'Agree/Disagree', 'Disagree': 'Agree/Disagree',
  'Agreement': 'Agree/Disagree', 'Misinterpretation': 'Agree/Disagree',
  'Method of Reasoning': 'Method of Reasoning', 'Method': 'Method of Reasoning',
  'Role': 'Role', 'Role in the Argument': 'Role', 'Role in Argument': 'Role',
  'Parallel Reasoning': 'Parallel Reasoning', 'Parallel': 'Parallel Reasoning',
  'Parallel Flaw': 'Parallel Flaw', 'Flawed Parallel Reasoning': 'Parallel Flaw',
  'Paradox': 'Paradox', 'Resolve the Paradox': 'Paradox', 'Explain the Discrepancy': 'Paradox',
};

function inferTypeFromStem(stem) {
  const lower = String(stem ?? '').toLowerCase();
  if (lower.includes('explain') && (lower.includes('discrepancy') || lower.includes('paradox') ||
      lower.includes('apparent conflict') || lower.includes('seemingly contradictory'))) return 'Paradox';
  if (lower.includes('weaken') || lower.includes('undermines') || lower.includes('casts doubt') ||
      lower.includes('calls into question')) return 'Weaken';
  if (lower.includes('strengthen') || lower.includes('supports') || lower.includes('justifies')) return 'Strengthen';
  if (lower.includes('flaw') || lower.includes('error') || lower.includes('vulnerable to criticism')) return 'Flaw';
  if (lower.includes('assumption') && (lower.includes('requires') || lower.includes('depends'))) return 'Necessary Assumption';
  if (lower.includes('assumption') && lower.includes('if assumed')) return 'Sufficient Assumption';
  if (lower.includes('must be true') || lower.includes('properly inferred')) return 'Must Be True';
  if (lower.includes('most (strongly )?supported') || lower.includes('most justifies')) return 'Most Strongly Supported';
  if (lower.includes('main (point|conclusion)') || lower.includes('expresses the (main )?conclusion')) return 'Main Conclusion';
  if (lower.includes('proceeds by') || lower.includes('method') || lower.includes('technique of argumentation')) return 'Method of Reasoning';
  if (lower.includes('role') || lower.includes('claim.*figures')) return 'Role';
  if (lower.includes('parallel') && lower.includes('flaw')) return 'Parallel Flaw';
  if (lower.includes('parallel') || lower.includes('most similar') || lower.includes('same pattern')) return 'Parallel Reasoning';
  if (lower.includes('principle') && (lower.includes('justify') || lower.includes('support'))) return 'Principle-Strengthen';
  if (lower.includes('principle') && (lower.includes('conform') || lower.includes('illustrate'))) return 'Principle-Conform';
  if (lower.includes('disagree') || lower.includes('point.*issue') || lower.includes('dispute')) return 'Agree/Disagree';
  if (lower.includes('evaluate') || lower.includes('useful to know')) return 'Evaluate';
  return 'Unknown';
}

function normalizeQType(raw, stem) {
  if (!raw || String(raw).trim() === '') return stem ? inferTypeFromStem(stem) : 'Unknown';
  const trimmed = String(raw).trim();
  if (ALL_TYPES_SET.has(trimmed)) return trimmed;
  if (TYPE_SYNONYMS[trimmed]) return TYPE_SYNONYMS[trimmed];
  const isCorrupted = /^(A |An |The |Advertisement|[A-Z][a-z]+ (said|argued|claims))/.test(trimmed) ||
    trimmed.length > 50 || /\s{2,}/.test(trimmed);
  if (isCorrupted && stem) {
    const inferred = inferTypeFromStem(stem);
    if (inferred !== 'Unknown') return inferred;
  }
  return 'Unknown';
}

// ----- Reasoning types: canonical glossary trio -----
function normalizeReasoning(value) {
  if (!value) return null;
  if (value === 'Comparative Reasoning' || value === 'Comparison' || value === 'Comparisons') return 'Comparison';
  if (value === 'Conditional Reasoning' || value === 'Conditional Logic') return 'Conditional Logic';
  if (value === 'Causation' || value === 'Causal Reasoning') return 'Causation';
  return null;
}
const CANONICAL_REASONING = new Set(['Conditional Logic', 'Causation', 'Comparison']);

// Broad placeholders we must never keep as a target signature.
const BROAD_QTYPES = new Set(['Mixed LR question types', 'Assumption Family']);
const BROAD_FEATURE_PATTERNS = [
  /^First Taste\b/i, /^First \/ Medium/i, /^Medium Must Be False/i, /^Harder Must Be False/i,
  /^Blended Set$/i, /^Speedwalking LR$/i, /^Assumption Family/i, /^Mixed Assumption/i,
  /^Three Main Reasoning/i, /Courtroom Debate/i, /Continuum/i,
];
const isBroadFeature = (f) => BROAD_FEATURE_PATTERNS.some((p) => p.test(f));

const uniq = (vals) => [...new Set(vals.filter(Boolean))];
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const DEFAULT_COUNT = 6;

// Pull "Try these N problems / questions" from the instruction card when the
// seed's question_count is missing.
function countFromCard(drill) {
  const md = `${drill.instruction_card?.left_md ?? ''}\n${drill.instruction_card?.right_md ?? ''}`;
  const m = md.match(/try these\s+(\d+)/i) || md.match(/these\s+(\d+)\s+(?:problems|questions)/i)
    || md.match(/(\d+)\s+(?:problems|questions)\b/i);
  const n = m ? Number(m[1]) : null;
  return n && n >= 1 && n <= 30 ? n : null;
}

// ----- Load LR question bank, keyed by resolvable PT-prefixed qid -----
function loadQuestionBank() {
  const byQid = new Map();
  const questions = [];
  const featureVocabulary = new Set();
  const files = fs.readdirSync(DATA_DIR).filter((f) => /^PT\d+-S\d+-LR\.json$/.test(f)).sort();
  for (const file of files) {
    const pt = parseInt(file.match(/PT(\d+)/)?.[1] ?? '0', 10);
    const section = parseInt(file.match(/S(\d+)/)?.[1] ?? '0', 10);
    const arr = readJson(path.join(DATA_DIR, file));
    for (const q of arr) {
      const qnum = q.questionNumber ?? 0;
      const qid = `PT${pt}-S${section}-Q${qnum}`;
      const rawDiff = q.questionDifficulty ?? q.difficulty ?? null;
      const difficulty = (rawDiff === null || rawDiff === undefined || rawDiff === '') ? null : Number(rawDiff);
      const features = Array.isArray(q.questionFeatures) ? q.questionFeatures.filter(Boolean) : [];
      const rawReasoning = Array.isArray(q.reasoningType) ? q.reasoningType : (q.reasoningType ? [q.reasoningType] : []);
      const rec = {
        qid, pt, section, qnum,
        qtype: normalizeQType(q.questionType ?? '', q.questionStem),
        reasoningTypes: uniq(rawReasoning.map(normalizeReasoning)),
        features,
        difficulty,
      };
      for (const f of features) featureVocabulary.add(f);
      byQid.set(qid, rec);
      questions.push(rec);
    }
  }
  return { byQid, questions, featureVocabulary };
}

// ----- Difficulty band inference: explicit > seed > week/title ramp -----
function inferBand(drill, override) {
  if (override?.difficulty_min != null || override?.difficulty_max != null) {
    return [override.difficulty_min ?? 1, override.difficulty_max ?? 5];
  }
  if (drill.difficulty_min != null && drill.difficulty_max != null) {
    return [drill.difficulty_min, drill.difficulty_max];
  }
  const t = drill.title.toLowerCase();
  if (t.includes('speedwalking')) return null; // pacing across all levels
  if (/first taste|easier|\beasy\b/.test(t)) return [1, 3];
  if (t.includes('harder') || /\bhard\b/.test(t)) return [4, 5];
  if (t.includes('medium')) return [3, 4];
  const wk = drill.week ?? 1;
  if (wk <= 3) return [1, 3];
  if (wk <= 8) return [2, 4];
  return [3, 5];
}

// ----- Build target signature (types/features) from override > audit > seed -----
function targetSignature(drill, override, auditRow, featureVocabulary) {
  let types = override?.question_types
    ?? auditRow?.recommended_question_types
    ?? (drill.question_types ?? []);
  types = uniq(types.map((x) => normalizeQType(x)).filter((x) => x && x !== 'Unknown' && !BROAD_QTYPES.has(x)));

  let features = override?.question_features
    ?? auditRow?.recommended_question_features
    ?? (drill.question_features ?? []);
  features = uniq(features.filter((f) => featureVocabulary.has(f) && !isBroadFeature(f)));

  const blended = override?.blended ?? (types.length >= 5);
  // A dimension explicitly set in an override is locked: the engine will not drop
  // it to fill the pool.
  const lockTypes = Array.isArray(override?.question_types);
  const lockFeatures = Array.isArray(override?.question_features);
  return { types, features, blended, lockTypes, lockFeatures };
}

const inBand = (d, band) => band == null ? d != null : (d != null && d >= band[0] && d <= band[1]);
const orderQ = (a, b) => a.pt - b.pt || a.section - b.section || a.qnum - b.qnum;

// Relaxation philosophy: the precise intersection (type ∧ feature ∧ band) is
// always tried first. When it starves, KEEP THE RARER (more specific) dimension,
// because that is what defines the drill — e.g. Evaluate (type pool 22) keeps the
// type; Anti-Causal (feature pool 171 < Weaken 339) keeps the feature; EXCEPT
// keeps the feature; Must Be False keeps the type. Dropping a dimension always
// flags the drill for human review.
// Builds the vetted REATTEMPT POOL for a drill and reports the EFFECTIVE filter
// (which type/feature dimensions and which difficulty band actually produce it).
// The pool must comfortably exceed the per-attempt N so reattempts get fresh sets;
// `target` is that desired pool floor (≈ N×3). Relaxes difficulty first, then drops
// the rarer dimension (keeping a human-locked dimension), exactly like before.
function buildPool(questions, { types, features, lockTypes, lockFeatures }, band, target) {
  const typeSet = new Set(types);
  const featSet = new Set(features);
  const hasType = typeSet.size > 0;
  const hasFeat = featSet.size > 0;
  const matchType = (q) => typeSet.has(q.qtype);
  const matchFeat = (q) => q.features.some((f) => featSet.has(f));

  const filt = (opt) => questions.filter((q) =>
    (opt.type ? matchType(q) : true) &&
    (opt.feat ? matchFeat(q) : true) &&
    inBand(q.difficulty, opt.band),
  ).sort(orderQ);

  const result = (matches, level, dropped, effBand) => ({
    matches, relaxation: level, available: matches.length, dropped,
    effBand, effType: dropped === 'type' ? false : hasType, effFeat: dropped === 'feature' ? false : hasFeat,
  });

  // Tier 1: keep both dimensions, widen difficulty only.
  const tiers = [{ level: 'strict', band }];
  if (band) {
    tiers.push({ level: 'band±1', band: [Math.max(1, band[0] - 1), Math.min(5, band[1] + 1)] });
    tiers.push({ level: 'band-1to5', band: [1, 5] });
  }
  for (const t of tiers) {
    const matches = filt({ band: t.band, type: hasType, feat: hasFeat });
    if (matches.length >= target) return result(matches, t.level, 'none', t.band);
  }
  const fullBoth = filt({ band: [1, 5], type: hasType, feat: hasFeat });
  if (fullBoth.length >= target || !(hasType && hasFeat)) return result(fullBoth, 'band-1to5', 'none', [1, 5]);

  // Tier 2: drop a dimension to widen the pool. Keep the rarer (more specific) one.
  const candidates = [];
  if (!lockTypes) candidates.push({ pool: filt({ band: [1, 5], type: false, feat: true }), dropped: 'type' });
  if (!lockFeatures) candidates.push({ pool: filt({ band: [1, 5], type: true, feat: false }), dropped: 'feature' });
  if (candidates.length === 0) return result(fullBoth, 'locked-both', 'none', [1, 5]);
  candidates.sort((a, b) => a.pool.length - b.pool.length);
  const ok = candidates.find((c) => c.pool.length >= target) ?? candidates[candidates.length - 1];
  return result(ok.pool, `keep-${ok.dropped === 'feature' ? 'type' : 'feature'}`, ok.dropped, [1, 5]);
}

// ----- Display reasoning derived from the whole vetted pool -----
// Display question_types / question_features ARE the effective filter (what defines
// the reattempt pool). Reasoning is descriptive only (kept out of the filter so it
// never narrows the pool): the reasoning types carried by a meaningful share of the
// pool. Difficulty shown is the effective band.
function deriveReasoning(pool) {
  const n = pool.length || 1;
  const rFreq = new Map();
  for (const q of pool) for (const r of uniq(q.reasoningTypes)) if (CANONICAL_REASONING.has(r)) rFreq.set(r, (rFreq.get(r) ?? 0) + 1);
  return [...rFreq.entries()]
    .filter(([, c]) => c / n >= 0.3)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([r]) => r);
}

function main() {
  const seed = readJson(path.join(GUIDED_DIR, '_seed.json'));
  const audit = fs.existsSync(AUDIT_JSON) ? readJson(AUDIT_JSON) : { rows: [] };
  const auditBySlug = new Map((audit.rows ?? []).map((r) => [r.slug, r]));
  const overrides = fs.existsSync(OVERRIDES_JSON) ? readJson(OVERRIDES_JSON) : {};
  const bank = loadQuestionBank();

  const violations = [];
  const rows = seed.map((drill) => {
    const override = overrides[drill.slug] ?? null;
    const auditRow = auditBySlug.get(drill.slug) ?? null;
    const isRC = /framework sampler/i.test(drill.title) || auditRow?.classification === 'defer-rc';
    const cardCount = countFromCard(drill);
    const rawCount = override?.question_count ?? drill.question_count ?? drill.bank_filter?.count ?? cardCount;
    const need = rawCount ?? DEFAULT_COUNT;
    const countDefaulted = rawCount == null;

    if (isRC) {
      return {
        slug: drill.slug, title: drill.title, week: drill.week, classification: 'defer-rc',
        question_count: need, notes: ['RC-oriented card; left untouched (LR-only pass).'],
        skipped: true,
      };
    }

    const sig = targetSignature(drill, override, auditRow, bank.featureVocabulary);
    const band = inferBand(drill, override);
    // Want the reattempt pool to comfortably exceed the per-attempt set so fresh
    // sets are possible: aim for ≈ N×3 (min 12), but never demand more than exists.
    const target = Math.max(need * 3, 12);

    const pool = buildPool(bank.questions, sig, band, target);
    const available = pool.available;

    // The EFFECTIVE filter is what the app's resolveGuidedDrillPool must reproduce.
    const finalTypes = pool.effType ? sig.types : [];
    const finalFeatures = pool.effFeat ? sig.features : [];
    const finalReasoning = deriveReasoning(pool.matches);
    const effBand = pool.effBand;
    const sample = pool.matches.slice(0, 5).map((q) => q.qid); // reference only; not persisted

    const notes = [];
    if (countDefaulted) notes.push(`question_count missing in seed — used ${need}${cardCount ? ' (from card)' : ' (default)'}; set explicitly`);
    if (pool.dropped !== 'none') notes.push(`pool widened by dropping ${pool.dropped} constraint`);
    if (pool.relaxation === 'band-1to5' && band) notes.push('difficulty band widened to 1-5 for pool size');

    let classification;
    if (available < need) {
      classification = 'short-pool';
      notes.push(`pool ${available} < per-attempt N ${need} — cannot fill a set`);
    } else if (available < need * 2) {
      classification = 'low-variety';
      notes.push(`pool ${available} gives limited reattempt variety (< ${need * 2})`);
    } else if (sig.blended) {
      classification = 'blended';
    } else {
      classification = 'ready';
    }

    // ----- hard validation -----
    for (const t of finalTypes) if (!ALL_TYPES_SET.has(t)) violations.push(`${drill.slug}: non-canonical type "${t}"`);
    for (const f of finalFeatures) if (!bank.featureVocabulary.has(f)) violations.push(`${drill.slug}: feature "${f}" not in bank vocab`);
    for (const r of finalReasoning) if (!CANONICAL_REASONING.has(r)) violations.push(`${drill.slug}: non-canonical reasoning "${r}"`);
    if (effBand && effBand[0] > effBand[1]) violations.push(`${drill.slug}: difficulty_min > difficulty_max`);
    if (finalTypes.length === 0 && finalFeatures.length === 0) violations.push(`${drill.slug}: empty filter (no type or feature)`);

    return {
      slug: drill.slug, title: drill.title, week: drill.week, category: drill.category,
      question_count: need,
      current_question_types: drill.question_types ?? [],
      current_question_features: drill.question_features ?? [],
      target_types: sig.types, target_features: sig.features, blended: sig.blended,
      relaxation: pool.relaxation,
      final_question_types: finalTypes,
      final_question_features: finalFeatures,
      final_reasoning_types: finalReasoning,
      difficulty_min: effBand ? effBand[0] : null,
      difficulty_max: effBand ? effBand[1] : null,
      pool_available: available,
      pool_sample: sample,
      classification, has_override: !!override, notes,
    };
  });

  const counts = {};
  for (const r of rows) counts[r.classification] = (counts[r.classification] ?? 0) + 1;
  const summary = {
    generated: 'see git/commit time',
    drills: rows.length,
    lr_questions: bank.questions.length,
    feature_vocab: bank.featureVocabulary.size,
    classification_counts: counts,
    violations: violations.length,
  };

  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify({ summary, rows }, null, 2)}\n`);

  // CSV
  const cols = ['slug', 'title', 'week', 'classification', 'question_count', 'pool_available',
    'difficulty_min', 'difficulty_max', 'relaxation',
    'current_question_types', 'final_question_types',
    'current_question_features', 'final_question_features',
    'final_reasoning_types', 'has_override', 'notes'];
  const cell = (v) => `"${(Array.isArray(v) ? v.join('; ') : String(v ?? '')).replace(/"/g, '""')}"`;
  const csv = [cols.map(cell).join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
  fs.writeFileSync(OUT_CSV, `${csv}\n`);

  // Markdown review table
  const list = (v) => (v?.length ? v.join('; ') : '—');
  let md = '# Guided Drill Assignment Proposal (LR)\n\n';
  md += 'Read-only proposal. Each drill = a vetted FILTER (the reattempt pool) + per-attempt count N.\n';
  md += 'The app draws a fresh shuffled N from the pool each attempt. Apply via _seed.json + migration after review.\n\n';
  md += '## Summary\n\n';
  md += `- Drills: ${summary.drills}\n- LR questions: ${summary.lr_questions}\n- Feature vocab: ${summary.feature_vocab}\n- Hard violations: ${summary.violations}\n\n`;
  md += '| Classification | Count |\n|---|---:|\n';
  for (const [k, v] of Object.entries(counts)) md += `| ${k} | ${v} |\n`;
  md += '\n## Review Table\n\n';
  md += '| Drill | Class | N | Pool | Lvl | Final types | Final features | Reasoning | Relax | Notes |\n';
  md += '|---|---|--:|--:|---|---|---|---|---|---|\n';
  for (const r of rows) {
    if (r.skipped) {
      md += `| ${r.slug}<br>${r.title} | ${r.classification} | ${r.question_count} | — | — | — | — | — | — | ${list(r.notes)} |\n`;
      continue;
    }
    const lvl = r.difficulty_min == null ? '—' : `${r.difficulty_min}-${r.difficulty_max}`;
    md += `| ${r.slug}<br>${r.title} | ${r.classification} | ${r.question_count} | ${r.pool_available} | ${lvl} | ${list(r.final_question_types)} | ${list(r.final_question_features)} | ${list(r.final_reasoning_types)} | ${r.relaxation} | ${list(r.notes)} |\n`;
  }
  fs.writeFileSync(OUT_MD, md);

  console.log('=== Guided drill assignment proposal (LR) ===');
  console.log('Drills:', rows.length, '| LR questions:', bank.questions.length, '| feature vocab:', bank.featureVocabulary.size);
  console.log('Classification:', counts);
  if (violations.length) {
    console.error(`\nHARD VIOLATIONS (${violations.length}):`);
    for (const v of violations.slice(0, 40)) console.error('  - ' + v);
    process.exitCode = 1;
  } else {
    console.log('No hard violations.');
  }
  console.log('Wrote:');
  for (const f of [OUT_JSON, OUT_CSV, OUT_MD]) console.log('  ' + path.relative(REPO, f));
}

main();

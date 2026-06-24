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
function buildPool(questions, { types, features, blended, lockTypes, lockFeatures }, band, need) {
  const typeSet = new Set(types);
  const featSet = new Set(features);
  const hasType = typeSet.size > 0;
  const hasFeat = featSet.size > 0 && !blended;
  const matchType = (q) => typeSet.has(q.qtype);
  const matchFeat = (q) => q.features.some((f) => featSet.has(f));

  const filt = (opt) => questions.filter((q) =>
    (opt.type ? matchType(q) : true) &&
    (opt.feat ? matchFeat(q) : true) &&
    inBand(q.difficulty, opt.band),
  ).sort(orderQ);

  // Tier 1: keep both dimensions, widen difficulty only.
  const tiers = [{ level: 'strict', band, type: hasType, feat: hasFeat }];
  if (band) {
    tiers.push({ level: 'band±1', band: [Math.max(1, band[0] - 1), Math.min(5, band[1] + 1)], type: hasType, feat: hasFeat });
    tiers.push({ level: 'band-1to5', band: [1, 5], type: hasType, feat: hasFeat });
  }
  for (const t of tiers) {
    const matches = filt(t);
    if (matches.length >= need) return { matches, relaxation: t.level, available: matches.length, dropped: 'none' };
  }

  // Tier 2: must drop a dimension. Keep the rarer (more specific) one.
  const fullBoth = filt({ band: [1, 5], type: hasType, feat: hasFeat });
  if (fullBoth.length >= need) return { matches: fullBoth, relaxation: 'band-1to5', available: fullBoth.length, dropped: 'none' };

  if (hasType && hasFeat) {
    // A human-locked dimension is never dropped.
    const candidates = [];
    if (!lockTypes) candidates.push({ pool: filt({ band: [1, 5], type: false, feat: true }), dropped: 'type' });
    if (!lockFeatures) candidates.push({ pool: filt({ band: [1, 5], type: true, feat: false }), dropped: 'feature' });
    if (candidates.length === 0) {
      // both locked: best-effort strict pool at full difficulty.
      const both = filt({ band: [1, 5], type: true, feat: true });
      return { matches: both, relaxation: 'locked-both', available: both.length, dropped: 'none' };
    }
    // prefer the more specific pool that still satisfies need; else the larger.
    candidates.sort((a, b) => a.pool.length - b.pool.length);
    const ok = candidates.find((c) => c.pool.length >= need) ?? candidates[candidates.length - 1];
    return { matches: ok.pool, relaxation: `keep-${ok.dropped === 'feature' ? 'type' : 'feature'}`, available: ok.pool.length, dropped: ok.dropped };
  }

  // Only one dimension to begin with (blended / no feature / no type).
  const single = filt({ band: [1, 5], type: hasType, feat: hasFeat });
  return { matches: single, relaxation: 'band-1to5', available: single.length, dropped: 'none' };
}

// ----- Derive final metadata strictly from the selected qids -----
// Types/reasoning/levels are pure facts of the picks. Features are kept tight:
// the drill's intended (target) features that the picks actually confirm — never
// pool-derived noise. When there is no target (blended drills), fall back to the
// genuinely dominant features. The full observed-feature frequency is surfaced
// separately for the review pass.
function deriveFromPicks(picks, targetFeatures) {
  const n = picks.length || 1;
  const types = uniq(picks.map((q) => q.qtype)).filter((t) => t !== 'Unknown');
  // Reasoning: keep types carried by a meaningful share of picks (>=30%, >=2 when
  // the set is large enough), sorted by prevalence — drops one-off noise.
  const rFreq = new Map();
  for (const q of picks) for (const r of uniq(q.reasoningTypes)) if (CANONICAL_REASONING.has(r)) rFreq.set(r, (rFreq.get(r) ?? 0) + 1);
  const reasoning = [...rFreq.entries()]
    .filter(([, c]) => c / n >= 0.3 && (n < 4 || c >= 2))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([r]) => r);
  const diffs = picks.map((q) => q.difficulty).filter((d) => d != null);

  const freq = new Map();
  for (const q of picks) for (const f of q.features) freq.set(f, (freq.get(f) ?? 0) + 1);
  const observed = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const observedTop = observed.map(([f, c]) => `${f} ${Math.round((c / n) * 100)}%`);

  let features;
  const weak = [];
  if (targetFeatures.length) {
    // Confirm each intended feature against the picks; drop ones barely present.
    features = targetFeatures.filter((f) => (freq.get(f) ?? 0) / n >= 0.25);
    for (const f of targetFeatures) if (!features.includes(f)) weak.push(f);
  } else {
    // Blended / feature-derived: only genuinely dominant features (≥60%, ≥3 hits), cap 3.
    features = observed.filter(([, c]) => c / n >= 0.6 && c >= 3).slice(0, 3).map(([f]) => f);
  }

  return {
    question_types: types,
    question_features: features,
    reasoning_types: reasoning,
    difficulty_min: diffs.length ? Math.min(...diffs) : null,
    difficulty_max: diffs.length ? Math.max(...diffs) : null,
    observed_features: observedTop,
    weak_target_features: weak,
  };
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

    // Explicit qid override wins entirely.
    let picks, relaxation, available, dropped = 'none';
    if (Array.isArray(override?.question_qids) && override.question_qids.length) {
      picks = override.question_qids.map((id) => bank.byQid.get(id)).filter(Boolean);
      relaxation = 'override-qids';
      available = picks.length;
    } else {
      const pool = buildPool(bank.questions, sig, band, need || 1);
      relaxation = pool.relaxation;
      available = pool.available;
      dropped = pool.dropped;
      picks = need ? pool.matches.slice(0, need) : pool.matches;
    }

    const qids = picks.map((q) => q.qid);
    const final = deriveFromPicks(picks, sig.features);

    // Fallbacks if derivation came back empty.
    if (final.question_types.length === 0) final.question_types = sig.types;
    if (final.question_features.length === 0) final.question_features = sig.features;

    const notes = [];
    if (countDefaulted) notes.push(`question_count missing in seed — used ${need}${cardCount ? ' (from card)' : ' (default)'}; set explicitly`);
    if (!['strict', 'band±1', 'override-qids'].includes(relaxation)) notes.push(`pool relaxed (${relaxation})`);
    if (dropped !== 'none') notes.push(`dropped ${dropped} constraint to fill pool — review`);
    if (final.weak_target_features.length) notes.push(`target feature(s) weak in pool: ${final.weak_target_features.join(', ')}`);
    // A drill is human-resolved once an override fixes its metadata signature.
    const humanResolved = sig.lockTypes || sig.lockFeatures || Array.isArray(override?.question_qids);
    let classification;
    if (available < need) {
      classification = 'needs-review';
      notes.push(`only ${available}/${need} questions available; selected ${picks.length}`);
    } else if (countDefaulted) {
      classification = 'needs-review';
    } else if (humanResolved) {
      classification = 'override-set';
    } else if (dropped !== 'none') {
      classification = 'needs-review';
    } else if (sig.blended) {
      classification = 'blended';
    } else {
      classification = 'verified-by-qids';
    }

    // ----- hard validation -----
    for (const t of final.question_types) if (!ALL_TYPES_SET.has(t)) violations.push(`${drill.slug}: non-canonical type "${t}"`);
    for (const f of final.question_features) if (!bank.featureVocabulary.has(f)) violations.push(`${drill.slug}: feature "${f}" not in bank vocab`);
    for (const r of final.reasoning_types) if (!CANONICAL_REASONING.has(r)) violations.push(`${drill.slug}: non-canonical reasoning "${r}"`);
    for (const id of qids) if (!bank.byQid.has(id)) violations.push(`${drill.slug}: qid ${id} not resolvable`);
    if (final.difficulty_min != null && final.difficulty_max != null && final.difficulty_min > final.difficulty_max) {
      violations.push(`${drill.slug}: difficulty_min > difficulty_max`);
    }

    const changed = JSON.stringify(drill.question_types ?? []) !== JSON.stringify(final.question_types)
      || JSON.stringify(drill.question_features ?? []) !== JSON.stringify(final.question_features)
      || JSON.stringify(drill.reasoning_types ?? []) !== JSON.stringify(final.reasoning_types);

    return {
      slug: drill.slug, title: drill.title, week: drill.week, category: drill.category,
      question_count: need,
      current_question_types: drill.question_types ?? [],
      current_question_features: drill.question_features ?? [],
      current_reasoning_types: drill.reasoning_types ?? [],
      target_types: sig.types, target_features: sig.features, blended: sig.blended,
      band, relaxation,
      final_question_types: final.question_types,
      final_question_features: final.question_features,
      final_reasoning_types: final.reasoning_types,
      observed_features: final.observed_features,
      difficulty_min: final.difficulty_min, difficulty_max: final.difficulty_max,
      pool_available: available, selected: qids.length,
      question_qids: qids,
      classification, changed, has_override: !!override, notes,
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
  const cols = ['slug', 'title', 'week', 'classification', 'question_count', 'selected', 'pool_available',
    'difficulty_min', 'difficulty_max', 'relaxation',
    'current_question_types', 'final_question_types',
    'current_question_features', 'final_question_features',
    'final_reasoning_types', 'changed', 'has_override', 'notes'];
  const cell = (v) => `"${(Array.isArray(v) ? v.join('; ') : String(v ?? '')).replace(/"/g, '""')}"`;
  const csv = [cols.map(cell).join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
  fs.writeFileSync(OUT_CSV, `${csv}\n`);

  // Markdown review table
  const list = (v) => (v?.length ? v.join('; ') : '—');
  let md = '# Guided Drill Assignment Proposal (LR)\n\n';
  md += 'Read-only proposal. Final metadata is DERIVED from the selected qids. Apply via _seed.json + migration after review.\n\n';
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

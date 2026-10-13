#!/usr/bin/env node
// Builds a review artifact for guided-drill question type, feature, reasoning,
// and level metadata. It is intentionally read-only against the live catalog and
// question bank; approved corrections should be applied in a later migration.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO, 'public', 'data');
const GUIDED_DIR = path.join(REPO, 'data', 'guided-drills');
const OUT_JSON = path.join(GUIDED_DIR, '_type_feature_audit.json');
const OUT_CSV = path.join(GUIDED_DIR, '_type_feature_audit.csv');
const OUT_MD = path.join(REPO, 'docs', 'audits', 'guided-drill-type-feature-map.md');

const CANONICAL_QTYPES = new Set([
  'Flaw',
  'Necessary Assumption',
  'Weaken',
  'Strengthen',
  'Sufficient Assumption',
  'Principle-Strengthen',
  'Evaluate',
  'Most Strongly Supported',
  'Must Be True',
  'Agree/Disagree',
  'Must Be False',
  'Method of Reasoning',
  'Main Conclusion',
  'Parallel Flaw',
  'Role',
  'Parallel Reasoning',
  'Principle-Conform',
  'Paradox',
]);

const TYPE_ALIASES = new Map([
  ['Most Supported', 'Most Strongly Supported'],
  ['Method', 'Method of Reasoning'],
  ['Parallel', 'Parallel Reasoning'],
  ['Point at Issue / Agree-Disagree', 'Agree/Disagree'],
  ['Explain Curious Fact', 'Paradox'],
  ['Fill in the Blank', 'Most Strongly Supported'],
  ['Application', 'Principle-Conform'],
  ['Principle', 'Principle-Conform'],
  ['Assumption', 'Necessary Assumption'],
  ['Inference', 'Must Be True'],
  ['Must be True', 'Must Be True'],
  ['Principle Strengthen', 'Principle-Strengthen'],
  ['Principle Conform', 'Principle-Conform'],
  ['Flawed Reasoning', 'Flaw'],
]);

const BROAD_QTYPES = new Set([
  'Mixed LR question types',
  'Assumption Family',
]);

const FEATURE_ALIASES = new Map([
  ['Abstract Answer Choices', ['Abstract Answers']],
  ['Break the Comparison', ['Assumes Difference', 'Assumes Similarity']],
  ['Causal Relationship', ['Explain Curious Fact']],
  ['Complete the Analogy', ['Analogies']],
  ['Conditional Logic', ['Conditional Diagramming']],
  ['Conditional Logic / Conditional Keywords', ['Conditional Diagramming', 'Contrapositive Logic']],
  ['First Taste / Conditional Principle', ['Principles in Answers', 'Conditional Conclusion']],
  ['First Taste / Most Supported Variations', ['Ruling Out Options']],
  ['First Taste / Principle Matching', ['Principles in Answers']],
  ['Important Pivot', ['Important Pivot']],
  ['Idea Math vs Courtroom Debate', ['Missing Link / Idea', 'Argue the Anti-Conclusion']],
  ['Missing Link / Core Connection', ['Missing Link / Idea', 'Links Between Premises']],
  ['Missing Links', ['Missing Link / Idea']],
  ['Missing Links / Common Terms / Color-Coding', ['Missing Link / Idea', 'Links Between Premises']],
  ['Assumption Family Continuum / Timed Harder Set', ['Conditional Diagramming', 'Explain Curious Fact', 'Assumes Similarity']],
  ['Mixed Assumption Family / Internal Logic vs Courtroom Debate', ['Missing Link / Idea', 'Argue the Anti-Conclusion']],
  ['Principle in Stimulus', ['Principles in Stimulus']],
  ['Principle-Strengthen', ['Principles in Answers', 'Conditional Conclusion']],
  ['Principle-Strengthen / Conditional Principle', ['Principles in Answers', 'Conditional Conclusion']],
  ['Rebuttal Conclusions', ['Rebuttals']],
  ['Reconcile the Pivot', ['Important Pivot']],
  ['Science-heavy Stimulus', ['Science']],
  ['Three Main Reasoning Structures', ['Conditional Diagramming', 'Explain Curious Fact', 'Assumes Similarity']],
  ['Three Main Reasoning Types', ['Conditional Diagramming', 'Explain Curious Fact', 'Assumes Similarity']],
  ['Timed Agree/Disagree', ['2-Speaker', 'Battle of Opinions']],
  ['Weaken + Comparison', ['Assumes Difference', 'Assumes Similarity']],
]);

const BROAD_FEATURE_PATTERNS = [
  /^First Taste\b/i,
  /^First \/ Medium/i,
  /^Medium Must Be False/i,
  /^Harder Must Be False/i,
  /^Blended Set$/i,
  /^Speedwalking LR$/i,
  /^Assumption Family/i,
  /^Mixed Assumption/i,
  /^Three Main Reasoning/i,
];

const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/drills?/g, '')
    .replace(/\bset\b/g, '')
    .replace(/\bfirst taste\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function parseManifest() {
  const text = fs.readFileSync(path.join(REPO, 'src', 'data', 'guidedDrillHtmlManifest.ts'), 'utf8');
  const entries = [];
  const re = /order: (\d+),\n\s+title: "([^"]+)",\n\s+slug: "([^"]+)",\n\s+htmlPath: "([^"]+)",\n\s+sourceFile: "([^"]+)",\n\s+time: ([^,]+),\n\s+questions: ([^,\n]+)/g;
  let match;
  while ((match = re.exec(text))) {
    entries.push({
      order: Number(match[1]),
      title: match[2],
      slug: match[3],
      htmlPath: match[4],
      sourceFile: match[5],
      time: match[6].trim().replace(/^"|"$/g, ''),
      questions: match[7].trim() === 'null' ? null : Number(match[7].trim()),
    });
  }
  return entries;
}

function loadQuestionBank() {
  const questions = [];
  const byQid = new Map();
  const featureVocabulary = new Set();
  const files = fs.readdirSync(DATA_DIR).filter((f) => /^PT\d+-S\d+-LR\.json$/.test(f)).sort();
  for (const file of files) {
    const arr = readJson(path.join(DATA_DIR, file));
    for (const q of arr) {
      const qid = `${q.practiceTest}-S${q.sectionNumber}-Q${q.questionNumber}`;
      const normalized = {
        qid,
        qtype: normalizeQType(q.questionType),
        rawQtype: q.questionType ?? '',
        reasoningTypes: Array.isArray(q.reasoningType) ? q.reasoningType : [],
        features: Array.isArray(q.questionFeatures) ? q.questionFeatures : [],
        difficulty: Number(q.questionDifficulty ?? q.difficulty ?? 3),
      };
      for (const feature of normalized.features) featureVocabulary.add(feature);
      questions.push(normalized);
      byQid.set(qid, normalized);
    }
  }
  return { questions, byQid, featureVocabulary };
}

function normalizeQType(value) {
  if (!value) return '';
  if (CANONICAL_QTYPES.has(value)) return value;
  return TYPE_ALIASES.get(value) ?? value;
}

function normalizeReasoning(value) {
  if (value === 'Comparative Reasoning' || value === 'Comparison') return 'Comparisons';
  if (value === 'Conditional Reasoning') return 'Conditional Logic';
  return value;
}

function recommendQTypes(drill) {
  const title = drill.title.toLowerCase();
  const current = uniq((drill.question_types ?? []).map(normalizeQType).filter((v) => !BROAD_QTYPES.has(v)));
  if (current.length > 0) return current;

  if (title.includes('conditional logic')) {
    return ['Most Strongly Supported', 'Must Be True', 'Sufficient Assumption', 'Parallel Reasoning', 'Parallel Flaw', 'Principle-Strengthen', 'Principle-Conform', 'Flaw'];
  }
  if (title.includes('assumption family') || title.includes('core connection')) {
    return ['Sufficient Assumption', 'Necessary Assumption', 'Principle-Strengthen', 'Strengthen', 'Weaken', 'Flaw', 'Evaluate'];
  }
  if (title.includes('except')) return ['Paradox', 'Strengthen', 'Most Strongly Supported'];
  if (title.includes('speedwalking')) return [...CANONICAL_QTYPES];
  if (title.includes('relative') || title.includes('absolute')) return ['Most Strongly Supported', 'Must Be True', 'Flaw'];
  return current;
}

function recommendFeatures(drill) {
  const title = drill.title.toLowerCase();
  const fromCurrent = [];
  for (const feature of drill.question_features ?? []) {
    if (FEATURE_ALIASES.has(feature)) fromCurrent.push(...FEATURE_ALIASES.get(feature));
    else fromCurrent.push(feature);
  }

  if (title.includes('first sentence')) fromCurrent.push('First Sentence Conclusion');
  if (title.includes('paradox')) fromCurrent.push('Explain Curious Fact', 'Alternatives');
  if (title.includes('core connection')) fromCurrent.push('Missing Link / Idea', 'Links Between Premises');
  if (title.includes('sampling')) fromCurrent.push('Sampling');
  if (title.includes('abstract')) fromCurrent.push('Abstract Answers');
  if (title.includes('conditional logic')) fromCurrent.push('Conditional Diagramming');
  if (title.includes('contrapositive')) fromCurrent.push('Contrapositive Logic');
  if (title.includes('reconcile the pivot')) fromCurrent.push('Important Pivot');
  if (title.includes('missing link')) fromCurrent.push('Missing Link / Idea');
  if (title.includes('famous flaw')) fromCurrent.push('Famous Flaws');
  if (title.includes('anti-causal')) fromCurrent.push('Anti-Causal');
  if (title.includes('causal chains')) fromCurrent.push('Causal Chains');
  if (title.includes('causal difference')) fromCurrent.push('Causal Difference-Maker');
  if (title.includes('explain curious fact')) fromCurrent.push('Explain Curious Fact');
  if (title.includes('analog')) fromCurrent.push('Analogies');
  if (title.includes('agree') || title.includes('disagree')) fromCurrent.push('2-Speaker', 'Battle of Opinions');
  if (title.includes('describing argument')) fromCurrent.push('Focused on Evidence');
  if (title.includes('intermediate conclusion')) fromCurrent.push('Intermediate Conclusions');
  if (title.includes('fill in the blank')) fromCurrent.push('Logical Completion');
  if (title.includes('evaluate')) fromCurrent.push('Plausibility', 'Alternatives');
  if (title.includes('necessary assumption')) fromCurrent.push('Defender');
  if (title.includes('sufficient assumption')) fromCurrent.push('Missing Link / Idea', 'Conditional Conclusion');
  if (title.includes('strengthen') && !title.includes('principle-strengthen')) fromCurrent.push('Plausibility', 'Missing Link / Idea');
  if (/flaw/i.test(drill.title)) fromCurrent.push('Famous Flaws');
  if (title.includes('must be true')) fromCurrent.push('Ruling Out Options');
  if (title.includes('relative') || title.includes('absolute')) fromCurrent.push('Relative vs. Absolute');
  if (title.includes('science')) fromCurrent.push('Science');
  if (title.includes('quantifier')) fromCurrent.push('Quantifiers');
  if (title.includes('principle') && title.includes('stimulus')) fromCurrent.push('Principles in Stimulus');
  if (title.includes('principle') && title.includes('answer')) fromCurrent.push('Principles in Answers');
  if (title.includes('principle-strengthen')) fromCurrent.push('Principles in Answers', 'Conditional Conclusion');
  if (title.includes('except')) fromCurrent.push('EXCEPT');
  if (title.includes('must be false')) fromCurrent.push('Conditional Diagramming');
  if (title.includes('assumes similarity')) fromCurrent.push('Assumes Similarity');
  if (title.includes('break the comparison')) fromCurrent.push('Assumes Difference', 'Assumes Similarity');
  if (title.includes('weaken') && title.includes('comparison')) fromCurrent.push('Assumes Difference', 'Assumes Similarity');

  return uniq(fromCurrent.filter((feature) => !isBroadFeature(feature)));
}

function isBroadFeature(feature) {
  return BROAD_FEATURE_PATTERNS.some((pattern) => pattern.test(feature));
}

function findBestMatch(item, candidates) {
  const itemNorm = normalizeText(item.title);
  let best = null;
  for (const candidate of candidates) {
    const candidateNorm = normalizeText(candidate.title);
    let score = 0;
    if (candidateNorm === itemNorm) score = 100;
    else if (candidateNorm.includes(itemNorm) || itemNorm.includes(candidateNorm)) score = 70;
    else {
      const a = new Set(itemNorm.split(/\s+/).filter(Boolean));
      const b = new Set(candidateNorm.split(/\s+/).filter(Boolean));
      const shared = [...a].filter((token) => b.has(token)).length;
      const total = new Set([...a, ...b]).size;
      score = total ? Math.round((shared / total) * 60) : 0;
    }
    if (score >= 45 && (!best || score > best.score)) best = { score, ...candidate };
  }
  return best;
}

function poolFor(drill, questions, recommendedQTypes, recommendedFeatures, recommendedReasoning) {
  const count = drill.question_count ?? drill.bank_filter?.count ?? null;
  const qtypes = new Set(recommendedQTypes);
  const features = new Set(recommendedFeatures);
  const reasoning = new Set(recommendedReasoning);
  const dmin = drill.difficulty_min ?? drill.bank_filter?.difficulty_min ?? null;
  const dmax = drill.difficulty_max ?? drill.bank_filter?.difficulty_max ?? null;
  const matches = questions.filter((q) => {
    if (qtypes.size > 0 && !qtypes.has(q.qtype)) return false;
    if (features.size > 0 && !q.features.some((feature) => features.has(feature))) return false;
    if (reasoning.size > 0 && !q.reasoningTypes.map(normalizeReasoning).some((r) => reasoning.has(r))) return false;
    if (dmin != null && q.difficulty < dmin) return false;
    if (dmax != null && q.difficulty > dmax) return false;
    return true;
  });
  return { count, matches };
}

function summarizeQuestions(qids, byQid) {
  const rows = qids.map((qid) => byQid.get(qid)).filter(Boolean);
  if (rows.length === 0) return null;
  return {
    count: rows.length,
    missing_qids: qids.filter((qid) => !byQid.has(qid)),
    difficulty_min: Math.min(...rows.map((q) => q.difficulty)),
    difficulty_max: Math.max(...rows.map((q) => q.difficulty)),
    question_types: countValues(rows.flatMap((q) => [q.qtype])),
    question_features: countValues(rows.flatMap((q) => q.features)),
    reasoning_types: countValues(rows.flatMap((q) => q.reasoningTypes.map(normalizeReasoning))),
  };
}

function countValues(values) {
  return Object.fromEntries([...values.reduce((map, value) => {
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function classify({ drill, labMatch, qidStats, recommendedQTypes, recommendedFeatures, pool, featureVocabulary }) {
  const notes = [];
  const title = drill.title.toLowerCase();
  if (title.includes('framework sampler')) {
    notes.push('RC-oriented card; defer until an RC bank/track exists.');
    return { classification: 'defer-rc', notes };
  }

  const currentBroadQTypes = (drill.question_types ?? []).filter((value) => BROAD_QTYPES.has(value));
  const currentBroadFeatures = (drill.question_features ?? []).filter(isBroadFeature);
  if (currentBroadQTypes.length) notes.push(`Broad qtype placeholder: ${currentBroadQTypes.join(', ')}`);
  if (currentBroadFeatures.length) notes.push(`Broad feature placeholder: ${currentBroadFeatures.join(', ')}`);

  const nonCanonicalTypes = recommendedQTypes.filter((type) => !CANONICAL_QTYPES.has(type));
  if (nonCanonicalTypes.length) notes.push(`Non-canonical recommended qtype: ${nonCanonicalTypes.join(', ')}`);

  const unknownFeatures = recommendedFeatures.filter((feature) => !featureVocabulary.has(feature));
  if (unknownFeatures.length) notes.push(`Recommended feature not currently in bank vocabulary: ${unknownFeatures.join(', ')}`);

  const need = pool.count ?? 0;
  if (need > 0 && pool.matches.length < need) {
    notes.push(`Recommended pool only finds ${pool.matches.length}/${need} questions; needs qid selection or metadata adjustment.`);
  }
  if ((drill.question_qids ?? []).length === 0) {
    notes.push('No exact qids attached; deterministic pool still needs selection before final migration.');
  }

  if (qidStats) return { classification: 'verified-by-qids', notes };
  if (need > 0 && pool.matches.length < need) return { classification: 'needs-qid-selection', notes };
  if (currentBroadQTypes.length || currentBroadFeatures.length || unknownFeatures.length || recommendedFeatures.length === 0) {
    return { classification: 'needs-human-review', notes };
  }
  if (labMatch) return { classification: 'matched-by-lsatlab-card', notes };
  return { classification: 'needs-human-review', notes };
}

function toCsvCell(value) {
  const text = Array.isArray(value) ? value.join('; ') : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function tableList(values) {
  return values?.length ? values.join('; ') : '—';
}

function main() {
  const seed = readJson(path.join(GUIDED_DIR, '_seed.json'));
  const lsatLabDrills = fs.existsSync(path.join(GUIDED_DIR, '_lsatlab_drills.json'))
    ? readJson(path.join(GUIDED_DIR, '_lsatlab_drills.json'))
    : [];
  const capturePath = path.join(os.homedir(), 'Downloads', 'lsatlab-cards.json');
  const capturedCards = fs.existsSync(capturePath) ? readJson(capturePath) : [];
  const manifest = parseManifest();
  const bank = loadQuestionBank();

  const rows = seed.map((drill) => {
    const labMatch = findBestMatch(drill, lsatLabDrills) ?? findBestMatch(drill, capturedCards);
    const htmlMatch = findBestMatch(drill, manifest);
    const exactQids = Array.isArray(drill.question_qids) ? drill.question_qids : [];
    const qidStats = exactQids.length ? summarizeQuestions(exactQids, bank.byQid) : null;
    const recommendedQTypes = qidStats ? Object.keys(qidStats.question_types) : recommendQTypes(drill);
    const recommendedFeatures = qidStats ? Object.keys(qidStats.question_features) : recommendFeatures(drill);
    const recommendedReasoning = qidStats
      ? Object.keys(qidStats.reasoning_types)
      : uniq((drill.reasoning_types ?? []).map(normalizeReasoning));
    const pool = poolFor(drill, bank.questions, recommendedQTypes, recommendedFeatures, recommendedReasoning);
    const { classification, notes } = classify({
      drill,
      labMatch,
      qidStats,
      recommendedQTypes,
      recommendedFeatures,
      pool,
      featureVocabulary: bank.featureVocabulary,
    });

    return {
      slug: drill.slug,
      title: drill.title,
      week: drill.week,
      order_in_week: drill.order_in_week,
      category: drill.category,
      estimated_minutes: drill.estimated_minutes,
      question_count: drill.question_count,
      difficulty_min: drill.difficulty_min,
      difficulty_max: drill.difficulty_max,
      current_question_types: drill.question_types ?? [],
      current_question_features: drill.question_features ?? [],
      current_reasoning_types: drill.reasoning_types ?? [],
      lsatlab_match: labMatch ? { title: labMatch.title, week: labMatch.week ?? null, category: labMatch.type ?? labMatch.category ?? null, time: labMatch.time ?? null, score: labMatch.score } : null,
      html_match: htmlMatch ? { title: htmlMatch.title, slug: htmlMatch.slug, sourceFile: htmlMatch.sourceFile, score: htmlMatch.score } : null,
      exact_qids_count: exactQids.length,
      qid_stats: qidStats,
      recommended_question_types: recommendedQTypes,
      recommended_question_features: recommendedFeatures,
      recommended_reasoning_types: recommendedReasoning,
      recommended_difficulty_min: qidStats?.difficulty_min ?? drill.difficulty_min ?? drill.bank_filter?.difficulty_min ?? null,
      recommended_difficulty_max: qidStats?.difficulty_max ?? drill.difficulty_max ?? drill.bank_filter?.difficulty_max ?? null,
      recommended_pool_count: pool.matches.length,
      classification,
      notes,
    };
  });

  const summary = {
    generated_at: new Date().toISOString(),
    guided_drills: rows.length,
    manifest_entries: manifest.length,
    lsatlab_reference_rows: lsatLabDrills.length,
    captured_lsatlab_cards: capturedCards.length,
    lr_questions: bank.questions.length,
    classification_counts: countValues(rows.map((row) => row.classification)),
  };

  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify({ summary, rows }, null, 2)}\n`);

  const csvColumns = [
    'slug',
    'title',
    'week',
    'classification',
    'question_count',
    'recommended_difficulty_min',
    'recommended_difficulty_max',
    'current_question_types',
    'recommended_question_types',
    'current_question_features',
    'recommended_question_features',
    'current_reasoning_types',
    'recommended_reasoning_types',
    'recommended_pool_count',
    'lsatlab_match',
    'notes',
  ];
  const csv = [
    csvColumns.map(toCsvCell).join(','),
    ...rows.map((row) => csvColumns.map((column) => {
      if (column === 'lsatlab_match') return toCsvCell(row.lsatlab_match?.title ?? '');
      return toCsvCell(row[column]);
    }).join(',')),
  ].join('\n');
  fs.writeFileSync(OUT_CSV, `${csv}\n`);

  let md = '# Guided Drill Type + Feature Map\n\n';
  md += 'Read-only audit artifact. It recommends assignment-quality metadata; it does not apply DB or seed changes.\n\n';
  md += `Generated: ${summary.generated_at}\n\n`;
  md += '## Summary\n\n';
  md += `- Guided drill rows audited: ${summary.guided_drills}\n`;
  md += `- Static HTML manifest entries cross-checked: ${summary.manifest_entries}\n`;
  md += `- LSAT Lab reference rows available: ${summary.lsatlab_reference_rows}\n`;
  md += `- Captured LSAT Lab cards available: ${summary.captured_lsatlab_cards}\n`;
  md += `- LR question-bank rows scanned: ${summary.lr_questions}\n\n`;
  md += '| Classification | Count |\n|---|---:|\n';
  for (const [classification, count] of Object.entries(summary.classification_counts)) {
    md += `| ${classification} | ${count} |\n`;
  }
  md += '\n## Review Table\n\n';
  md += '| Drill | LSAT Lab match | Current types | Recommended types | Current features | Recommended features | Levels | Pool | Class | Notes |\n';
  md += '|---|---|---|---|---|---|---|---:|---|---|\n';
  for (const row of rows) {
    const level = row.recommended_difficulty_min == null && row.recommended_difficulty_max == null
      ? '—'
      : `${row.recommended_difficulty_min ?? '—'}-${row.recommended_difficulty_max ?? '—'}`;
    const notes = row.notes.join(' ');
    md += `| ${row.slug}<br>${row.title} | ${row.lsatlab_match?.title ?? '—'} | ${tableList(row.current_question_types)} | ${tableList(row.recommended_question_types)} | ${tableList(row.current_question_features)} | ${tableList(row.recommended_question_features)} | ${level} | ${row.recommended_pool_count} | ${row.classification} | ${notes || '—'} |\n`;
  }
  md += '\n## Files\n\n';
  md += `- Machine-readable JSON: \`${path.relative(REPO, OUT_JSON)}\`\n`;
  md += `- Spreadsheet-friendly CSV: \`${path.relative(REPO, OUT_CSV)}\`\n`;
  md += '\n## Review Rules\n\n';
  md += '- `verified-by-qids`: exact question list exists; qids define the signature.\n';
  md += '- `matched-by-lsatlab-card`: LSAT Lab card + current pool metadata are coherent enough for review.\n';
  md += '- `needs-qid-selection`: recommended filter cannot currently find enough matching questions.\n';
  md += '- `needs-human-review`: broad placeholder metadata remains or the recommendation includes a proposed/non-bank feature.\n';
  md += '- `defer-rc`: RC-oriented card; do not force into LR metadata until an RC bank exists.\n';
  fs.writeFileSync(OUT_MD, md);

  console.log('=== Guided drill taxonomy audit ===');
  console.log(`Rows audited: ${rows.length}`);
  console.log(`Manifest entries: ${manifest.length}`);
  console.log(`LSAT Lab reference rows: ${lsatLabDrills.length}`);
  console.log(`Captured LSAT Lab cards: ${capturedCards.length}`);
  console.log(`LR questions scanned: ${bank.questions.length}`);
  console.log('Classification counts:', summary.classification_counts);
  console.log('Wrote:');
  console.log(`  ${path.relative(REPO, OUT_JSON)}`);
  console.log(`  ${path.relative(REPO, OUT_CSV)}`);
  console.log(`  ${path.relative(REPO, OUT_MD)}`);
}

main();

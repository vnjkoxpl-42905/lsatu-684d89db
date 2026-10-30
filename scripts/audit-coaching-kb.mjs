#!/usr/bin/env node
// Coaching KB Coverage Audit
// -----------------------------------------------------------------------------
// Diagnostic report: compares what the LR question bank ships (qtype +
// reasoningType per question) against what the 4 coaching tables seed via
// supabase migrations. A gap = a bucket of questions the tutor-chat edge
// function will render with an empty COACHING KNOWLEDGE block.
//
// Read-only. No network. Run: `node scripts/audit-coaching-kb.mjs`

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');

// ---- Canonical qtype taxonomy (mirrors src/lib/questionLoader.ts) ----
const CANONICAL = [
  'Flaw', 'Necessary Assumption', 'Weaken', 'Strengthen', 'Sufficient Assumption',
  'Principle-Strengthen', 'Evaluate', 'Most Strongly Supported', 'Must Be True',
  'Agree/Disagree', 'Must Be False', 'Method of Reasoning', 'Main Conclusion',
  'Parallel Flaw', 'Role', 'Parallel Reasoning', 'Principle-Conform', 'Paradox',
];

const SYNONYMS = {
  'Flaw': 'Flaw',
  'Flaw in Reasoning': 'Flaw',
  'Error in Reasoning': 'Flaw',
  'Necessary Assumption': 'Necessary Assumption',
  'Assumption': 'Necessary Assumption',
  'Sufficient Assumption': 'Sufficient Assumption',
  'Strengthen': 'Strengthen',
  'Strengthen (EXCEPT)': 'Strengthen',
  'Strengthen/Explain': 'Strengthen',
  'Strengthen/Explain EXCEPT': 'Strengthen',
  'Justify the Exception': 'Strengthen',
  'Weaken': 'Weaken',
  'Weaken EXCEPT': 'Weaken',
  'Weaken/Counter': 'Weaken',
  'Logical Counter': 'Weaken',
  'Principle-Strengthen': 'Principle-Strengthen',
  'Principle Strengthen': 'Principle-Strengthen',
  'Principle: Strengthen': 'Principle-Strengthen',
  'Principle: Justify': 'Principle-Strengthen',
  'Principle-Identify': 'Principle-Strengthen',
  'Principle-Conform': 'Principle-Conform',
  'Principle Conform': 'Principle-Conform',
  'Principle: Conform': 'Principle-Conform',
  'Principle: Underlying': 'Principle-Conform',
  'Principle Illustrated': 'Principle-Conform',
  'Inconsistent with Principle': 'Principle-Conform',
  'Principle': 'Principle-Conform',
  'Evaluate': 'Evaluate',
  'Evaluate the Argument': 'Evaluate',
  'Most Strongly Supported': 'Most Strongly Supported',
  'Most Supported': 'Most Strongly Supported',
  'Main Point': 'Main Conclusion',
  'Main Conclusion': 'Main Conclusion',
  'Must Be True': 'Must Be True',
  'Must be True': 'Must Be True',
  'Must Be True EXCEPT': 'Must Be True',
  'Must Be False': 'Must Be False',
  'Must be False': 'Must Be False',
  'Agree/Disagree': 'Agree/Disagree',
  'Point at Issue': 'Agree/Disagree',
  'Point of Agreement': 'Agree/Disagree',
  'Disagree': 'Agree/Disagree',
  'Method of Reasoning': 'Method of Reasoning',
  'Method': 'Method of Reasoning',
  'Role': 'Role',
  'Role in the Argument': 'Role',
  'Parallel Reasoning': 'Parallel Reasoning',
  'Parallel Reasoning: Complete Argument': 'Parallel Reasoning',
  'Parallel Reasoning: Questionable': 'Parallel Reasoning',
  'Parallel': 'Parallel Reasoning',
  'Complete the Argument': 'Parallel Reasoning',
  'Parallel Flaw': 'Parallel Flaw',
  'Paradox': 'Paradox',
  'Resolve Paradox': 'Paradox',
  'Resolve the Paradox': 'Paradox',
  'Explain the Discrepancy': 'Paradox',
  'Dispute': 'Agree/Disagree',
};

function inferTypeFromStem(stem) {
  const lower = (stem || '').toLowerCase();
  if (lower.includes('explain') && (lower.includes('discrepancy') || lower.includes('paradox') ||
      lower.includes('apparent conflict') || lower.includes('seemingly contradictory'))) return 'Paradox';
  if (lower.includes('weaken') || lower.includes('undermines') || lower.includes('casts doubt') ||
      lower.includes('calls into question')) return 'Weaken';
  if (lower.includes('strengthen') || lower.includes('supports') || lower.includes('justifies')) return 'Strengthen';
  if (lower.includes('flaw') || lower.includes('error') || lower.includes('vulnerable to criticism')) return 'Flaw';
  if (lower.includes('assumption') && (lower.includes('requires') || lower.includes('depends'))) return 'Necessary Assumption';
  if (lower.includes('assumption') && lower.includes('if assumed')) return 'Sufficient Assumption';
  if (lower.includes('must be true') || lower.includes('properly inferred')) return 'Must Be True';
  if (lower.match(/most (strongly )?supported/) || lower.includes('most justifies')) return 'Most Strongly Supported';
  if (lower.match(/main (point|conclusion)/) || lower.match(/expresses the (main )?conclusion/)) return 'Main Conclusion';
  if (lower.includes('proceeds by') || lower.includes('method') || lower.includes('technique of argumentation')) return 'Method of Reasoning';
  if (lower.includes('role') || lower.match(/claim.*figures/)) return 'Role';
  if (lower.includes('parallel') && lower.includes('flaw')) return 'Parallel Flaw';
  if (lower.includes('parallel') || lower.includes('most similar') || lower.includes('same pattern')) return 'Parallel Reasoning';
  if (lower.includes('principle') && (lower.includes('justify') || lower.includes('support'))) return 'Principle-Strengthen';
  if (lower.includes('principle') && (lower.includes('conform') || lower.includes('illustrate'))) return 'Principle-Conform';
  if (lower.includes('disagree') || lower.match(/point.*issue/) || lower.includes('dispute')) return 'Agree/Disagree';
  if (lower.includes('evaluate') || lower.includes('useful to know')) return 'Evaluate';
  return 'Unknown';
}

function normalizeQType(raw, stem) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return stem ? inferTypeFromStem(stem) : 'Unknown';
  if (CANONICAL.includes(trimmed)) return trimmed;
  if (SYNONYMS[trimmed]) return SYNONYMS[trimmed];
  if (stem) return inferTypeFromStem(stem);
  return 'Unknown';
}

// ---- Read the loader to pull the authoritative JSON_FILES list ----
function getJsonFiles() {
  const loader = fs.readFileSync(path.join(REPO, 'src/lib/questionLoader.ts'), 'utf8');
  const start = loader.indexOf('const JSON_FILES = [');
  const end = loader.indexOf('];', start);
  if (start === -1 || end === -1) throw new Error("Couldn't locate JSON_FILES in questionLoader.ts");
  const block = loader.slice(start, end);
  const files = [...block.matchAll(/'(\/data\/[^']+)'/g)].map(m => m[1]);
  return files;
}

// ---- Scan question bank ----
function scanBank() {
  const jsonFiles = getJsonFiles();
  const stats = {
    files: 0, missingFiles: [], totalQuestions: 0,
    byQtype: new Map(), byReasoning: new Map(),
    reasoningByQtype: new Map(),
  };
  for (const rel of jsonFiles) {
    const abs = path.join(REPO, 'public', rel);
    if (!fs.existsSync(abs)) { stats.missingFiles.push(rel); continue; }
    stats.files++;
    let doc;
    try {
      doc = JSON.parse(fs.readFileSync(abs, 'utf8'));
    } catch (e) {
      stats.malformed = stats.malformed || [];
      stats.malformed.push({ file: rel, error: e.message });
      continue;
    }
    const questions = Array.isArray(doc) ? doc : (doc.questions || []);
    for (const q of questions) {
      stats.totalQuestions++;
      const rawQtype = q.questionType || q.qtype;
      const qtype = normalizeQType(rawQtype, q.questionStem);
      stats.byQtype.set(qtype, (stats.byQtype.get(qtype) || 0) + 1);
      const rt = (q.reasoningType || q.reasoning_type || '').trim() || '(none)';
      stats.byReasoning.set(rt, (stats.byReasoning.get(rt) || 0) + 1);
      if (!stats.reasoningByQtype.has(qtype)) stats.reasoningByQtype.set(qtype, new Map());
      const m = stats.reasoningByQtype.get(qtype);
      m.set(rt, (m.get(rt) || 0) + 1);
    }
  }
  return stats;
}

// ---- Parse migrations for seeded rows ----
function parseSeededRows(tableName, keyColumn = null) {
  const migDir = path.join(REPO, 'supabase/migrations');
  const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
  const found = new Set();
  const perFile = [];
  for (const f of files) {
    const sql = fs.readFileSync(path.join(migDir, f), 'utf8');
    const insertRe = new RegExp(`INSERT\\s+INTO\\s+(?:public\\.)?${tableName}\\b([\\s\\S]*?);`, 'gi');
    let match;
    let fileCount = 0;
    while ((match = insertRe.exec(sql)) !== null) {
      const block = match[1];
      const rowRe = /\n\s*\(\s*'((?:[^']|'')*)'/g;
      let rowMatch;
      while ((rowMatch = rowRe.exec(block)) !== null) {
        const key = rowMatch[1].replace(/''/g, "'");
        found.add(key);
        fileCount++;
      }
    }
    // Apply rename UPDATEs in file order so the post-migration key set is accurate.
    if (keyColumn) {
      const updateRe = new RegExp(
        `UPDATE\\s+(?:public\\.)?${tableName}\\s+SET\\s+${keyColumn}\\s*=\\s*'((?:[^']|'')*)'\\s+WHERE\\s+${keyColumn}\\s*=\\s*'((?:[^']|'')*)'`,
        'gi'
      );
      let um;
      while ((um = updateRe.exec(sql)) !== null) {
        const newKey = um[1].replace(/''/g, "'");
        const oldKey = um[2].replace(/''/g, "'");
        if (found.has(oldKey)) {
          found.delete(oldKey);
          found.add(newKey);
        }
      }
    }
    if (fileCount > 0) perFile.push({ file: f, count: fileCount });
  }
  return { found, perFile };
}

// Build a qtype → related_reasoning_types[] map from question_type_strategies
// inserts. Used to simulate the edge function's fallback path: when a question
// has no reasoningType, we key guidance + concept lookups by the strategy
// row's first non-"All" related reasoning type.
function parseStrategyRelatedReasoning() {
  const migDir = path.join(REPO, 'supabase/migrations');
  const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
  const result = new Map(); // qtype -> string[] (may be empty if column absent)
  const renames = []; // {from, to}
  for (const f of files) {
    const sql = fs.readFileSync(path.join(migDir, f), 'utf8');
    const insertRe = /INSERT\s+INTO\s+(?:public\.)?question_type_strategies\b[\s\S]*?;/gi;
    let match;
    while ((match = insertRe.exec(sql)) !== null) {
      const block = match[0];
      const colMatch = block.match(/question_type_strategies\s*\(([^)]+)\)\s*VALUES/i);
      if (!colMatch) continue;
      const cols = colMatch[1].split(',').map(s => s.trim());
      const qtIdx = cols.indexOf('question_type');
      const rrIdx = cols.indexOf('related_reasoning_types');
      if (qtIdx === -1) continue;
      const rows = splitRows(block.slice(block.indexOf('VALUES') + 6));
      for (const row of rows) {
        const fields = splitFields(row);
        if (!fields[qtIdx]) continue;
        const qt = stripQuotes(fields[qtIdx]);
        const arr = rrIdx !== -1 && fields[rrIdx] ? parseSqlArray(fields[rrIdx]) : [];
        result.set(qt, arr);
      }
    }
    // Apply UPDATE renames so the map key matches the post-migration canonical.
    const updRe = /UPDATE\s+(?:public\.)?question_type_strategies\s+SET\s+question_type\s*=\s*'((?:[^']|'')*)'\s+WHERE\s+question_type\s*=\s*'((?:[^']|'')*)'/gi;
    let um;
    while ((um = updRe.exec(sql)) !== null) {
      const to = um[1].replace(/''/g, "'");
      const from = um[2].replace(/''/g, "'");
      renames.push({ from, to });
    }
  }
  for (const { from, to } of renames) {
    if (result.has(from)) {
      result.set(to, result.get(from));
      result.delete(from);
    }
  }
  return result;
}

// Tactical patterns has a `question_types text[]` column we also want to index on.
// Parse each row and extract the `question_types` ARRAY.
function parseTacticalPatternsByQtype() {
  const migDir = path.join(REPO, 'supabase/migrations');
  const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
  const qtypeIndex = new Map(); // qtype -> Set<pattern_name>
  for (const f of files) {
    const sql = fs.readFileSync(path.join(migDir, f), 'utf8');
    const insertRe = /INSERT\s+INTO\s+(?:public\.)?tactical_patterns\b[\s\S]*?;/gi;
    let match;
    while ((match = insertRe.exec(sql)) !== null) {
      const block = match[0];
      // Identify column order to find which index question_types is at.
      const colListMatch = block.match(/tactical_patterns\s*\(([^)]+)\)\s*VALUES/i);
      if (!colListMatch) continue;
      const cols = colListMatch[1].split(',').map(s => s.trim());
      const qtIdx = cols.indexOf('question_types');
      const nameIdx = cols.indexOf('pattern_name');
      if (qtIdx === -1 || nameIdx === -1) continue;
      // Each row: match from opening ( to its matching ).
      // Simpler: scan row-by-row using a depth counter.
      const values = block.slice(block.indexOf('VALUES') + 6);
      const rows = splitRows(values);
      for (const row of rows) {
        const fields = splitFields(row);
        if (fields.length <= Math.max(qtIdx, nameIdx)) continue;
        const name = stripQuotes(fields[nameIdx]);
        const qtArr = parseSqlArray(fields[qtIdx]);
        for (const qt of qtArr) {
          if (!qtypeIndex.has(qt)) qtypeIndex.set(qt, new Set());
          qtypeIndex.get(qt).add(name);
        }
      }
    }
  }
  return qtypeIndex;
}

// Split the VALUES body into individual row strings (content inside each outer parens).
function splitRows(body) {
  const rows = [];
  let depth = 0, start = -1, inQuote = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "'" && body[i - 1] !== '\\') {
      if (inQuote && body[i + 1] === "'") { i++; continue; } // '' escape
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;
    if (c === '(') { if (depth === 0) start = i + 1; depth++; }
    else if (c === ')') { depth--; if (depth === 0 && start !== -1) { rows.push(body.slice(start, i)); start = -1; } }
  }
  return rows;
}

// Split a single row's fields by top-level commas (respecting quotes + ARRAY parens).
function splitFields(row) {
  const fields = [];
  let depth = 0, start = 0, inQuote = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === "'" && row[i - 1] !== '\\') {
      if (inQuote && row[i + 1] === "'") { i++; continue; }
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { fields.push(row.slice(start, i).trim()); start = i + 1; }
  }
  fields.push(row.slice(start).trim());
  return fields;
}

function stripQuotes(s) {
  const t = s.trim();
  if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
  return t;
}

// Scan the bank a second time emitting raw questionType strings, run each
// through normalizeQType() (same as the edge function's normalizer), and
// check if the normalized string is a seed key. This measures what the
// production tutor-chat actually sees.
function rawCoverageAfterNormalization(seedKeys) {
  const jsonFiles = getJsonFiles();
  let total = 0, covered = 0;
  for (const rel of jsonFiles) {
    const abs = path.join(REPO, 'public', rel);
    if (!fs.existsSync(abs)) continue;
    let doc;
    try { doc = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch { continue; }
    const questions = Array.isArray(doc) ? doc : (doc.questions || []);
    for (const q of questions) {
      total++;
      const raw = q.questionType || q.qtype;
      const normalized = normalizeQType(raw, q.questionStem);
      if (seedKeys.has(normalized)) covered++;
    }
  }
  return { covered, total };
}

function parseSqlArray(s) {
  // e.g. ARRAY['Weaken', 'Strengthen']
  const m = s.match(/ARRAY\s*\[([\s\S]*?)\]/i);
  if (!m) return [];
  return [...m[1].matchAll(/'((?:[^']|'')*)'/g)].map(x => x[1].replace(/''/g, "'"));
}

// ---- Report ----
function pct(n, d) { return d === 0 ? '0.0%' : `${(100 * n / d).toFixed(1)}%`; }

function report() {
  const bank = scanBank();
  const strategies = parseSeededRows('question_type_strategies', 'question_type');
  const guidance = parseSeededRows('reasoning_type_guidance', 'reasoning_type');
  const tacticalPatterns = parseSeededRows('tactical_patterns', 'pattern_name');
  const concepts = parseSeededRows('concept_library', 'concept_name');
  const tacticalByQtype = parseTacticalPatternsByQtype();
  const strategyRR = parseStrategyRelatedReasoning();

  console.log('='.repeat(72));
  console.log('Tutor Coaching KB Coverage Audit');
  console.log('='.repeat(72));

  console.log(`\nQuestion bank: ${bank.totalQuestions} questions across ${bank.files} files`);
  if (bank.missingFiles.length) console.log(`  WARN: ${bank.missingFiles.length} loader-referenced files missing on disk: ${bank.missingFiles.slice(0, 3).join(', ')}${bank.missingFiles.length > 3 ? '…' : ''}`);
  if (bank.malformed && bank.malformed.length) {
    console.log(`  WARN: ${bank.malformed.length} files failed to parse as JSON:`);
    for (const m of bank.malformed) console.log(`    - ${m.file}: ${m.error}`);
  }

  const sortedQtypes = [...bank.byQtype.entries()].sort((a, b) => b[1] - a[1]);
  console.log('\nqtype distribution (after normalization):');
  for (const [qt, n] of sortedQtypes) {
    const marker = CANONICAL.includes(qt) ? '  ' : (qt === 'Unknown' ? '? ' : '* '); // * = non-canonical
    console.log(`  ${marker}${qt.padEnd(28)} ${String(n).padStart(5)}  (${pct(n, bank.totalQuestions)})`);
  }

  const sortedRT = [...bank.byReasoning.entries()].sort((a, b) => b[1] - a[1]);
  console.log('\nreasoningType distribution:');
  for (const [rt, n] of sortedRT) {
    console.log(`  ${rt.padEnd(40)} ${String(n).padStart(5)}  (${pct(n, bank.totalQuestions)})`);
  }

  console.log('\nSeeded rows per coaching table (across all migrations):');
  const rpt = (label, r) => console.log(`  ${label.padEnd(30)} ${String(r.found.size).padStart(3)} rows  (${r.perFile.map(p => `${p.count}@${p.file.slice(0, 8)}`).join(', ') || '<empty>'})`);
  rpt('question_type_strategies', strategies);
  rpt('reasoning_type_guidance', guidance);
  rpt('tactical_patterns', tacticalPatterns);
  rpt('concept_library', concepts);

  // --- Coverage gaps ---
  console.log('\n' + '-'.repeat(72));
  console.log('COVERAGE GAPS');
  console.log('-'.repeat(72));

  console.log('\nqtypes in bank with NO question_type_strategies row (sorted by question count):');
  const strategyGaps = sortedQtypes.filter(([qt]) => !strategies.found.has(qt) && qt !== 'Unknown');
  if (strategyGaps.length === 0) console.log('  (none)');
  else for (const [qt, n] of strategyGaps) console.log(`  ${qt.padEnd(28)} ${String(n).padStart(5)} questions`);

  console.log('\nqtypes in bank with NO tactical_patterns match (sorted by question count):');
  const tpGaps = sortedQtypes.filter(([qt]) => !tacticalByQtype.has(qt) && qt !== 'Unknown');
  if (tpGaps.length === 0) console.log('  (none)');
  else for (const [qt, n] of tpGaps) console.log(`  ${qt.padEnd(28)} ${String(n).padStart(5)} questions`);

  console.log('\nreasoningTypes in bank with NO reasoning_type_guidance row (excl. "(none)"):');
  const rtGuidanceGaps = sortedRT.filter(([rt]) => rt !== '(none)' && !guidance.found.has(rt));
  if (rtGuidanceGaps.length === 0) console.log('  (none)');
  else for (const [rt, n] of rtGuidanceGaps) console.log(`  ${rt.padEnd(40)} ${String(n).padStart(5)} questions`);

  console.log('\nreasoningTypes in bank with NO concept_library row (excl. "(none)"):');
  // concept_library is keyed by concept_name but references reasoning_type; collect distinct reasoning_types present
  const conceptReasoningTypes = new Set();
  {
    const migDir = path.join(REPO, 'supabase/migrations');
    const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
    for (const f of files) {
      const sql = fs.readFileSync(path.join(migDir, f), 'utf8');
      const insertRe = /INSERT\s+INTO\s+(?:public\.)?concept_library\b[\s\S]*?;/gi;
      let m;
      while ((m = insertRe.exec(sql)) !== null) {
        const block = m[0];
        const colMatch = block.match(/concept_library\s*\(([^)]+)\)\s*VALUES/i);
        if (!colMatch) continue;
        const cols = colMatch[1].split(',').map(s => s.trim());
        const rtIdx = cols.indexOf('reasoning_type');
        if (rtIdx === -1) continue;
        const rows = splitRows(block.slice(block.indexOf('VALUES') + 6));
        for (const row of rows) {
          const fields = splitFields(row);
          if (fields[rtIdx]) conceptReasoningTypes.add(stripQuotes(fields[rtIdx]));
        }
      }
    }
  }
  const rtConceptGaps = sortedRT.filter(([rt]) => rt !== '(none)' && !conceptReasoningTypes.has(rt));
  if (rtConceptGaps.length === 0) console.log('  (none)');
  else for (const [rt, n] of rtConceptGaps) console.log(`  ${rt.padEnd(40)} ${String(n).padStart(5)} questions`);

  // --- Coverage %s ---
  console.log('\n' + '-'.repeat(72));
  console.log('HEADLINE COVERAGE');
  console.log('-'.repeat(72));

  let strategiesCovered = 0, tacticalCovered = 0, guidanceCovered = 0, conceptCovered = 0;
  for (const [qt, n] of sortedQtypes) {
    if (strategies.found.has(qt)) strategiesCovered += n;
    if (tacticalByQtype.has(qt)) tacticalCovered += n;
  }

  // Raw-match coverage: mirrors what tutor-chat actually queries. The edge
  // function normalizes question.qtype via QTYPE_SYNONYMS, so we simulate
  // that here by checking whether the *normalized* name matches a seed key.
  // This should track `strategiesCovered` closely after the normalizer ships.
  const rawPost = rawCoverageAfterNormalization(strategies.found);
  console.log(`  Normalized lookup coverage: ${pct(rawPost.covered, bank.totalQuestions)} of bank questions hit a strategy row via tutor-chat's normalizeQtype() (raw bank values mapped then exact-matched against seed keys)`);
  for (const [rt, n] of sortedRT) {
    if (rt === '(none)') continue;
    if (guidance.found.has(rt)) guidanceCovered += n;
    if (conceptReasoningTypes.has(rt)) conceptCovered += n;
  }
  const totalWithRT = bank.totalQuestions - (bank.byReasoning.get('(none)') || 0);

  console.log(`  Strategy coverage:   ${pct(strategiesCovered, bank.totalQuestions)} of bank questions have a question_type_strategies row`);
  console.log(`  Tactical coverage:   ${pct(tacticalCovered, bank.totalQuestions)} of bank questions have ≥1 tactical_patterns match`);
  console.log(`  Guidance coverage:   ${pct(guidanceCovered, totalWithRT)} of bank questions with a reasoningType have a guidance row`);
  console.log(`  Concept coverage:    ${pct(conceptCovered, totalWithRT)} of bank questions with a reasoningType have a concept_library row for that reasoning type`);
  const noneCount = bank.byReasoning.get('(none)') || 0;
  console.log(`  Questions with no reasoningType at all: ${noneCount} (${pct(noneCount, bank.totalQuestions)})`);
  const taggedCount = bank.totalQuestions - noneCount;
  console.log(`  Raw reasoningType coverage: ${pct(taggedCount, bank.totalQuestions)} of bank questions have a reasoningType field populated`);

  // --- Fallback-simulated coverage ---
  // For each bank question: pick effective reasoning type via the fallback
  // chain (reasoningType OR strategy.related_reasoning_types.find(t !== 'All')).
  // Then count how many resolve to a guidance-seeded and a concept-seeded row.
  let fbGuidanceCovered = 0, fbConceptCovered = 0, fbResolved = 0;
  {
    const jsonFiles = getJsonFiles();
    for (const rel of jsonFiles) {
      const abs = path.join(REPO, 'public', rel);
      if (!fs.existsSync(abs)) continue;
      let doc;
      try { doc = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch { continue; }
      const questions = Array.isArray(doc) ? doc : (doc.questions || []);
      for (const q of questions) {
        let effective = (q.reasoningType || q.reasoning_type || '').trim() || null;
        if (!effective) {
          const qt = normalizeQType(q.questionType || q.qtype, q.questionStem);
          const related = strategyRR.get(qt) || [];
          const candidate = related.find(t => t && t !== 'All');
          if (candidate) effective = candidate;
        }
        if (effective) fbResolved++;
        if (effective && guidance.found.has(effective)) fbGuidanceCovered++;
        if (effective && conceptReasoningTypes.has(effective)) fbConceptCovered++;
      }
    }
  }
  console.log(`  Fallback-resolved reasoning key: ${pct(fbResolved, bank.totalQuestions)} of bank questions have either a reasoningType OR a usable strategy.related_reasoning_types[0]`);
  console.log(`  Guidance coverage w/ fallback:   ${pct(fbGuidanceCovered, bank.totalQuestions)} of bank questions would hit a reasoning_type_guidance row via the edge function's fallback chain`);
  console.log(`  Concept coverage w/ fallback:    ${pct(fbConceptCovered, bank.totalQuestions)} of bank questions would hit at least one concept_library row via the fallback chain`);

  if (noneCount === bank.totalQuestions) {
    console.log('\n  !! CRITICAL: no bank question carries a reasoningType field.');
    console.log('     tutor-chat/index.ts looks up reasoning_type_guidance and concept_library');
    console.log('     via question.reasoningType. With the bank as-is, those two tables are');
    console.log('     unreachable from the per-question path — the seeded rows are dead weight.');
    console.log('     Fix either the bank (tag each question) or the lookup (infer per-qtype).');
  }

  console.log('\n(Note: this audit is offline. It reads migration SQL as the seed source of truth; it does not confirm rows are live in prod Supabase.)');
}

report();

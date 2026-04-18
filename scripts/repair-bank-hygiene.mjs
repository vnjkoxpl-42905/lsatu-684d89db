#!/usr/bin/env node
// Bank hygiene: fix 3 malformed JSONs (trailing ``` markdown fence) + recover
// any rows where `questionType` doesn't match a canonical/synonym qtype by
// inferring from questionStem. Writes in-place. Idempotent — running twice
// produces no diff.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO, 'public/data');

// Canonical taxonomy (mirror src/lib/questionLoader.ts).
const CANONICAL = new Set([
  'Flaw', 'Necessary Assumption', 'Weaken', 'Strengthen', 'Sufficient Assumption',
  'Principle-Strengthen', 'Evaluate', 'Most Strongly Supported', 'Must Be True',
  'Agree/Disagree', 'Must Be False', 'Method of Reasoning', 'Main Conclusion',
  'Parallel Flaw', 'Role', 'Parallel Reasoning', 'Principle-Conform', 'Paradox',
]);
const SYNONYMS = {
  'Flaw in Reasoning': 'Flaw', 'Error in Reasoning': 'Flaw',
  'Assumption': 'Necessary Assumption',
  'Justify the Exception': 'Strengthen', 'Strengthen (EXCEPT)': 'Strengthen',
  'Strengthen/Explain': 'Strengthen', 'Strengthen/Explain EXCEPT': 'Strengthen',
  'Weaken EXCEPT': 'Weaken', 'Weaken/Counter': 'Weaken', 'Logical Counter': 'Weaken',
  'Principle Strengthen': 'Principle-Strengthen', 'Principle: Strengthen': 'Principle-Strengthen',
  'Principle: Justify': 'Principle-Strengthen', 'Principle-Identify': 'Principle-Strengthen',
  'Principle Conform': 'Principle-Conform', 'Principle: Conform': 'Principle-Conform',
  'Principle: Underlying': 'Principle-Conform', 'Principle Illustrated': 'Principle-Conform',
  'Inconsistent with Principle': 'Principle-Conform', 'Principle': 'Principle-Conform',
  'Evaluate the Argument': 'Evaluate',
  'Most Supported': 'Most Strongly Supported',
  'Main Point': 'Main Conclusion',
  'Must be True': 'Must Be True', 'Must Be True EXCEPT': 'Must Be True',
  'Must be False': 'Must Be False',
  'Point at Issue': 'Agree/Disagree', 'Point of Agreement': 'Agree/Disagree', 'Dispute': 'Agree/Disagree',
  'Method': 'Method of Reasoning',
  'Role in the Argument': 'Role',
  'Parallel': 'Parallel Reasoning', 'Complete the Argument': 'Parallel Reasoning',
  'Parallel Reasoning: Complete Argument': 'Parallel Reasoning',
  'Parallel Reasoning: Questionable': 'Parallel Reasoning',
  'Resolve the Paradox': 'Paradox', 'Resolve Paradox': 'Paradox', 'Explain the Discrepancy': 'Paradox',
};

function inferTypeFromStem(stem) {
  const lower = (stem || '').toLowerCase();
  // Order matters — more specific patterns first.
  if (lower.includes('parallel') && lower.includes('flaw')) return 'Parallel Flaw';
  if (lower.includes('flawed') && lower.includes('most similar')) return 'Parallel Flaw';
  if (lower.includes('reasoning') && lower.includes('flawed') && lower.includes('similar')) return 'Parallel Flaw';

  if ((lower.includes('explain') || lower.includes('account for')) &&
      (lower.includes('discrepancy') || lower.includes('paradox') || lower.includes('apparent conflict') ||
       lower.includes('seemingly') || lower.includes('greater') || lower.includes('surprising') ||
       lower.includes('puzzling') || lower.match(/difference between/))) return 'Paradox';
  if (lower.includes('most helps to explain')) return 'Paradox';
  if (lower.includes('resolve') && (lower.includes('paradox') || lower.includes('discrepancy'))) return 'Paradox';

  if (lower.includes('disagree') || lower.match(/point.*(issue|disagreement|agreement)/) ||
      lower.includes('disputing') || lower.match(/committed to (disagreeing|the view)/)) return 'Agree/Disagree';

  if (lower.includes('must be false') || lower.includes('cannot be true') ||
      (lower.includes('false') && lower.includes('if the statements above are true'))) return 'Must Be False';

  if (lower.includes('useful to know') || lower.includes('useful to evaluate') ||
      lower.includes('helpful to determine') || lower.includes('most relevant to evaluating') ||
      (lower.includes('useful') && lower.includes('evaluat'))) return 'Evaluate';

  if (lower.includes('weaken') || lower.includes('undermines') || lower.includes('casts doubt') ||
      lower.includes('calls into question') || lower.includes('most seriously damages') ||
      lower.includes('count(s)? against')) return 'Weaken';

  // Principle variants — before generic strengthen.
  if (lower.includes('principle') &&
      (lower.includes('conform') || lower.includes('illustrate') ||
       lower.includes('judgment') || lower.includes('underl') || lower.includes('application'))) {
    return 'Principle-Conform';
  }
  if (lower.includes('principle') &&
      (lower.includes('justif') || lower.includes('support') || lower.includes('most helps'))) {
    return 'Principle-Strengthen';
  }

  if (lower.includes('strengthen') || lower.includes('most supports') || lower.includes('supports the argument') ||
      (lower.includes('justif') && lower.includes('argument')) || lower.includes('provides the strongest support')) {
    return 'Strengthen';
  }

  if (lower.includes('flaw') || lower.includes('vulnerable to criticism') ||
      (lower.includes('questionable') && lower.includes('technique')) ||
      (lower.includes('error') && lower.includes('reasoning'))) {
    return 'Flaw';
  }

  // Sufficient assumption signals.
  if ((lower.includes('assumption') || lower.includes('assumed')) &&
      (lower.includes('if assumed') || lower.includes('allow the conclusion') || lower.includes('properly drawn if'))) {
    return 'Sufficient Assumption';
  }
  if (lower.includes('conclusion follows logically if') || lower.includes('conclusion is properly drawn if')) {
    return 'Sufficient Assumption';
  }

  // Necessary assumption signals.
  if ((lower.includes('assumption') || lower.includes('assumes') || lower.includes('assuming')) &&
      (lower.includes('requires') || lower.includes('required') || lower.includes('depends') ||
       lower.includes('presupposes') || lower.includes('relies on') || lower.includes('relies upon'))) {
    return 'Necessary Assumption';
  }
  if (lower.includes('argument relies on assuming') || lower.includes('argument depends on the assumption') ||
      lower.includes('required by the argument') || lower.includes('assumption on which')) return 'Necessary Assumption';

  // Parallel reasoning (post flaw check above).
  if (lower.includes('parallel') || lower.includes('most similar in its reasoning') ||
      lower.includes('same pattern of reasoning') || lower.includes('most logically completes the argument')) {
    return 'Parallel Reasoning';
  }

  // Role.
  if (lower.includes('role') && (lower.includes('plays') || lower.includes('argument') || lower.includes('function'))) {
    return 'Role';
  }
  if (lower.match(/most accurately describes the role/) || lower.match(/claim.*figures/)) return 'Role';
  if (lower.match(/point of .* mentioning/) || lower.match(/purpose of .* mentioning/) ||
      lower.match(/point of .*'s reference/)) return 'Role';

  // Method.
  if (lower.includes('proceeds by') || lower.includes('argumentative strategy') ||
      lower.includes('technique of argumentation') || lower.match(/method.*argument/) ||
      lower.match(/most accurately describes the (method|manner|technique)/)) return 'Method of Reasoning';

  // Main conclusion.
  if (lower.match(/main (point|conclusion)/) || lower.match(/expresses the (main |overall )?conclusion/) ||
      lower.match(/most accurately (expresses|states) the (main |overall )?conclusion/) ||
      lower.includes('overall conclusion')) return 'Main Conclusion';

  // Must be true — after MBF check.
  if (lower.includes('must be true') || lower.includes('properly inferred') ||
      lower.includes('follows logically from the statements') ||
      (lower.includes('logically follows') && lower.includes('statements'))) return 'Must Be True';

  // Most strongly supported.
  if (lower.match(/most (strongly )?support/) || lower.includes('most justifies') ||
      lower.includes('information above most strongly supports')) return 'Most Strongly Supported';

  return null;
}

function normalizeQtype(raw, stem) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return inferTypeFromStem(stem);
  if (CANONICAL.has(trimmed)) return trimmed;
  if (SYNONYMS[trimmed]) return SYNONYMS[trimmed];
  // Raw doesn't match a known type → treat as corrupted, recover from stem.
  return inferTypeFromStem(stem);
}

function repairFences() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  let touched = 0;
  for (const f of files) {
    const abs = path.join(DATA_DIR, f);
    const raw = fs.readFileSync(abs, 'utf8');
    // If already parses clean, skip.
    try {
      JSON.parse(raw);
      continue;
    } catch {}
    // Strip everything after the final `]` (the JSON root's closer) in the file.
    const lastBracket = raw.lastIndexOf(']');
    if (lastBracket === -1) {
      console.error(`  [!] ${f}: no closing ] found, skipping`);
      continue;
    }
    const cleaned = raw.slice(0, lastBracket + 1) + '\n';
    try {
      JSON.parse(cleaned);
    } catch (e) {
      console.error(`  [!] ${f}: still invalid after strip — ${e.message}`);
      continue;
    }
    fs.writeFileSync(abs, cleaned);
    console.log(`  [fixed] ${f}`);
    touched++;
  }
  return touched;
}

function recoverCorruptedQtypes() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  let touched = 0;
  let filesTouched = 0;
  const residuals = [];
  for (const f of files) {
    const abs = path.join(DATA_DIR, f);
    let doc;
    try { doc = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch { continue; }
    const questions = Array.isArray(doc) ? doc : (doc.questions || []);
    let changed = false;
    for (const q of questions) {
      const raw = q.questionType;
      if (typeof raw !== 'string') continue;
      if (CANONICAL.has(raw) || SYNONYMS[raw]) continue;
      // Candidate for recovery.
      const recovered = normalizeQtype(raw, q.questionStem);
      if (recovered && CANONICAL.has(recovered)) {
        q.questionType = recovered;
        changed = true;
        touched++;
      } else {
        residuals.push({ file: f, qnum: q.questionNumber, raw: raw.slice(0, 60), stem: (q.questionStem || '').slice(0, 60) });
      }
    }
    if (changed) {
      // Preserve pretty-print style (2-space indent, trailing newline).
      fs.writeFileSync(abs, JSON.stringify(doc, null, 2) + '\n');
      filesTouched++;
    }
  }
  return { touched, filesTouched, residuals };
}

console.log('=== Bank hygiene ===');
console.log('\n[1/2] Repair malformed JSONs (trailing markdown fence)...');
const fenceFixed = repairFences();
console.log(`  total: ${fenceFixed} file(s) fixed`);

console.log('\n[2/2] Recover corrupted questionType fields via stem inference...');
const rec = recoverCorruptedQtypes();
console.log(`  total: ${rec.touched} row(s) across ${rec.filesTouched} file(s) recovered`);
if (rec.residuals.length) {
  console.log(`  ${rec.residuals.length} row(s) could not be recovered (listed below):`);
  for (const r of rec.residuals.slice(0, 20)) {
    console.log(`    - ${r.file} q${r.qnum}: raw="${r.raw}..." stem="${r.stem}..."`);
  }
  if (rec.residuals.length > 20) console.log(`    … and ${rec.residuals.length - 20} more`);
}
console.log('\nDone.');

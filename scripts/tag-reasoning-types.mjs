#!/usr/bin/env node
// Reasoning-type tagger: adds a `reasoningType` field to every bank question
// so the edge function can look up reasoning_type_guidance and concept_library.
//
// Tags with one of the 5 seeded reasoning types (from the 20251018010708
// migration): Causation, Conditional Logic, Comparison, Curious Fact,
// Famous Flaws. Signals come from the stimulus, questionStem, and — where
// weak — questionType. Conservative: emits null when signals aren't strong
// enough, relying on the edge function's related_reasoning_types[0] fallback.
//
// Idempotent. Preserves field order by re-serializing the question object
// with `reasoningType` slotted after `questionType`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../public/data');

const SEEDED_TYPES = new Set([
  'Causation', 'Conditional Logic', 'Comparison', 'Curious Fact', 'Famous Flaws',
]);

// Regex helpers, compiled once.
const RE_CAUSE = /\b(cause|caused|causes|causing|causation|causal|because of|due to|owing to|results? in|leading to|led to|responsible for|produces?|produced|brings? about|brought about|attributable to)\b/i;
const RE_CAUSE_EXPLICIT = /\b(cause and effect|effect of|the effect)\b/i;

const RE_COND = /\b(if\b|only if\b|unless\b|whenever\b|provided that|as long as)\b/i;
const RE_COND_WORDS = /\b(necessary|sufficient|requires?|required|must\b|all\b|every\b|none\b|no one\b|any\b|each\b)\b/i;

const RE_COMPARE = /\b(compared to|compared with|in comparison|whereas|unlike|more than|less than|greater than|fewer than|higher than|lower than|in contrast|contrasted with|than (are|is|do|does|did|the))\b/i;

const RE_CURIOUS = /\b(surprisingly|surprising|puzzling|puzzle|unexpected|despite|although|even though|nevertheless|nonetheless|yet still|paradox|discrepancy|anomaly|curiously|oddly)\b/i;

// Famous-flaw signals — illegal moves on the conditional, causal, sampling,
// or terminological axes.
const RE_FLAW_SIGNALS = /\b(ad hominem|attacks the (person|character)|circular|begs the question|begging the question|equivocat|ambigu|straw ?man|false (dilemma|dichotomy|choice)|either\/or|hasty generaliz|small sample|unrepresentative|post hoc|after .* therefore|confuses? correlation|affirming the consequent|denying the antecedent|illegal reversal|illegal negation|necessary .* sufficient|sufficient .* necessary|mistakes? .* for|confuses? .* with|overlook|fails? to consider|takes? for granted|presumes? without (warrant|justification)|generaliz.* from)\b/i;

function tagQuestion(q) {
  const qtype = q.questionType || '';
  const text = `${q.stimulus || ''}\n${q.questionStem || ''}`.toLowerCase();

  // 1) Famous Flaws — only for Flaw-family questions when classic flaw signals fire.
  if ((qtype === 'Flaw' || qtype === 'Parallel Flaw') && RE_FLAW_SIGNALS.test(text)) {
    return 'Famous Flaws';
  }

  // 2) Curious Fact — only for Paradox + MSS, and only when curiosity signals present.
  if ((qtype === 'Paradox' || qtype === 'Most Strongly Supported') && RE_CURIOUS.test(text)) {
    return 'Curious Fact';
  }

  // 3) Causation — strong signal wins if present.
  if (RE_CAUSE.test(text) || RE_CAUSE_EXPLICIT.test(text)) {
    return 'Causation';
  }

  // 4) Conditional Logic — if/only if/unless or necessary/sufficient vocabulary.
  if (RE_COND.test(text) || RE_COND_WORDS.test(text)) {
    return 'Conditional Logic';
  }

  // 5) Comparison — contrastive structure.
  if (RE_COMPARE.test(text)) {
    return 'Comparison';
  }

  // 6) Qtype-default for Flaw: if no other signal, Famous Flaws is still the
  // most useful guidance block for a Flaw question.
  if (qtype === 'Flaw' || qtype === 'Parallel Flaw') {
    return 'Famous Flaws';
  }

  // 7) Qtype-default for Paradox: Curious Fact even without explicit signal word
  // (the entire stimulus structure is a curious fact pair).
  if (qtype === 'Paradox') {
    return 'Curious Fact';
  }

  return null;
}

// Insert `reasoningType` into a question object right after `questionType` so
// downstream diffs are easy to read. If the field already exists and the new
// value is the same, preserve original ordering; if different, overwrite
// in place.
function slotReasoningType(q, value) {
  if ('reasoningType' in q) {
    if (q.reasoningType === value) return q; // no change
    q.reasoningType = value;
    return q;
  }
  // Build new object preserving order, slotting after questionType.
  const out = {};
  for (const k of Object.keys(q)) {
    out[k] = q[k];
    if (k === 'questionType') {
      out.reasoningType = value;
    }
  }
  // If questionType wasn't present (shouldn't happen for the bank), append.
  if (!('reasoningType' in out)) out.reasoningType = value;
  return out;
}

function run() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  let totalQ = 0, tagged = 0, nullCount = 0, changedFiles = 0;
  const byType = {};

  for (const f of files) {
    const abs = path.join(DATA_DIR, f);
    const before = fs.readFileSync(abs, 'utf8');
    let doc;
    try { doc = JSON.parse(before); } catch (e) {
      console.error(`[!] ${f}: parse error, skipping — ${e.message}`);
      continue;
    }
    const isArrayRoot = Array.isArray(doc);
    const questions = isArrayRoot ? doc : (doc.questions || []);

    const rebuilt = questions.map(q => {
      totalQ++;
      const value = tagQuestion(q);
      if (value) {
        tagged++;
        byType[value] = (byType[value] || 0) + 1;
      } else {
        nullCount++;
      }
      return slotReasoningType(q, value);
    });

    const newDoc = isArrayRoot ? rebuilt : { ...doc, questions: rebuilt };
    const after = JSON.stringify(newDoc, null, 2) + '\n';
    if (after !== before) {
      fs.writeFileSync(abs, after);
      changedFiles++;
    }
  }

  console.log('=== Reasoning type tagger ===');
  console.log(`Total questions: ${totalQ}`);
  console.log(`Tagged:          ${tagged} (${(100 * tagged / totalQ).toFixed(1)}%)`);
  console.log(`Untagged (null): ${nullCount} (${(100 * nullCount / totalQ).toFixed(1)}%)`);
  console.log(`Files updated:   ${changedFiles}`);
  console.log('\nTag distribution:');
  for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    if (!SEEDED_TYPES.has(t)) {
      console.log(`  [!] ${t}: ${n}  (NOT IN SEEDED TYPES — would not resolve guidance)`);
    } else {
      console.log(`  ${t}: ${n}`);
    }
  }
}

run();

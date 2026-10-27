import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeQType, inferTypeFromStem, CANONICAL_QTYPES } from './questionLoader';

// The question bank's `questionType` field is hand-entered across 158 section
// files in public/data and has drifted into 111 distinct spellings of 18 real
// types. These tests run the real normalizer over the real bank so a regression
// in the synonym table shows up as a number, not as a console warning nobody
// reads.

const DATA_DIR = join(process.cwd(), 'public', 'data');

type BankItem = { questionType?: string; questionStem?: string };

function loadBank(): BankItem[] {
  const items: BankItem[] = [];
  for (const file of readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))) {
    if (file.startsWith('_')) continue; // _bank.generated.json is a build artifact
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
    } catch {
      continue;
    }
    const arr = Array.isArray(parsed)
      ? parsed
      : ((parsed as { questions?: BankItem[] })?.questions ?? []);
    items.push(...arr);
  }
  return items;
}

describe('normalizeQType over the real question bank', () => {
  const bank = loadBank();

  it('finds the bank on disk', () => {
    expect(bank.length).toBeGreaterThan(3900);
  });

  it('resolves all but a tiny residue to canonical types', () => {
    const unknown = bank.filter(
      (q) => normalizeQType(q.questionType || '', q.questionStem) === 'Unknown',
    );
    // 322 before the case-folding + decoration-stripping pass; 5 after. The
    // five that remain have both a useless label and a truncated stem.
    expect(unknown.length).toBeLessThanOrEqual(10);
  });

  // Guards the stem-inference rules against a well-meaning edit that widens one
  // pattern and quietly starts swallowing a neighbouring type. Scored only on
  // questions whose label resolves on its own, so the label is the answer key
  // and the stem is the guess.
  it('infers the type from the stem accurately enough to be a fallback', () => {
    let agree = 0;
    let disagree = 0;
    for (const q of bank) {
      const truth = normalizeQType(q.questionType || '');
      if (truth === 'Unknown' || !q.questionStem) continue;
      const guess = inferTypeFromStem(q.questionStem);
      if (guess === 'Unknown') continue;
      if (guess === truth) agree++;
      else disagree++;
    }
    // 80.4% over 2530 scored before this pass, 83.7% over 3245 after — both
    // coverage and accuracy have to hold.
    expect(agree + disagree).toBeGreaterThan(3100);
    expect(agree / (agree + disagree)).toBeGreaterThan(0.82);
  });

  it('only ever returns a canonical type or Unknown', () => {
    const allowed = new Set([...CANONICAL_QTYPES.allTypes, 'Unknown']);
    const rogue = new Set<string>();
    for (const q of bank) {
      const t = normalizeQType(q.questionType || '', q.questionStem);
      if (!allowed.has(t)) rogue.add(t);
    }
    expect([...rogue]).toEqual([]);
  });
});

describe('normalizeQType label handling', () => {
  it('folds case', () => {
    expect(normalizeQType('Must be true')).toBe('Must Be True');
    expect(normalizeQType('Necessary assumption')).toBe('Necessary Assumption');
    expect(normalizeQType('Most strongly supported')).toBe('Most Strongly Supported');
    expect(normalizeQType('sufficient ASSUMPTION')).toBe('Sufficient Assumption');
  });

  it('files EXCEPT questions under their family', () => {
    expect(normalizeQType('Weaken EXCEPT')).toBe('Weaken');
    expect(normalizeQType('Strengthen (EXCEPT)')).toBe('Strengthen');
    expect(normalizeQType('Weaken Except')).toBe('Weaken');
    expect(normalizeQType('Must be false EXCEPT')).toBe('Must Be False');
    expect(normalizeQType('Resolve/Reconcile/Explain EXCEPT')).toBe('Paradox');
  });

  it('drops trailing parenthetical tags', () => {
    expect(normalizeQType('Flaw (Flaw)')).toBe('Flaw');
    expect(normalizeQType('Flaw (Principle)')).toBe('Flaw');
    expect(normalizeQType('Point at Issue (Disagree)')).toBe('Agree/Disagree');
    expect(normalizeQType('Parallel method of reasoning (Parallel)')).toBe('Parallel Reasoning');
    expect(normalizeQType('PSA - Find the rule (Principle)')).toBe('Principle-Strengthen');
  });

  it('maps the longhand and 7Sage-style labels', () => {
    expect(normalizeQType('Argument Part')).toBe('Role');
    expect(normalizeQType('Argument part')).toBe('Role');
    expect(normalizeQType('Inference')).toBe('Must Be True');
    expect(normalizeQType('Fill in the blank')).toBe('Most Strongly Supported');
    expect(normalizeQType('Principle-PSA')).toBe('Principle-Strengthen');
    expect(normalizeQType('Parallel flawed method of reasoning')).toBe('Parallel Flaw');
    expect(normalizeQType('Resolve, reconcile, or explain')).toBe('Paradox');
  });

  it('falls back to the stem when the label is useless', () => {
    expect(normalizeQType('Miscellaneous', 'Which one of the following most weakens the argument?')).toBe('Weaken');
    expect(normalizeQType('Except', 'The argument above is most vulnerable to criticism on the grounds that')).toBe('Flaw');
    expect(normalizeQType('', 'Which one of the following most helps to resolve the apparent paradox?')).toBe('Paradox');
  });

  it('returns Unknown when there is nothing to go on', () => {
    expect(normalizeQType('')).toBe('Unknown');
    expect(normalizeQType('Miscellaneous')).toBe('Unknown');
  });
});

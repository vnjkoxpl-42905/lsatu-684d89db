import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY_ANCHORS,
  effectiveDifficulty,
  empiricalDifficulty,
  isInBandFractional,
  normalizeTrapTag,
  trapScore,
} from './questionSelectionSignals';
import type { QuestionStat } from '@/lib/questionStats';

function stat(over: Partial<QuestionStat> = {}): QuestionStat {
  return {
    correctChoice: 'B',
    correctPct: 70,
    empiricalDifficulty: 3.5,
    topTrapLetter: 'A',
    topTrapTag: 'Too Strong',
    topTrapTagRaw: 'Too Strong: must / ensure',
    topTrapPct: 15,
    trapSpread: 0.5,
    choicePcts: { A: 15, B: 70, C: 5, D: 1, E: 9 },
    ...over,
  } as QuestionStat;
}

describe('empiricalDifficulty', () => {
  it('returns each anchor difficulty at its measured accuracy', () => {
    for (const a of DIFFICULTY_ANCHORS) {
      expect(empiricalDifficulty(a.correctPct)).toBeCloseTo(a.difficulty, 5);
    }
  });

  it('interpolates between anchors rather than rounding to one', () => {
    // Midway between difficulty 2 (84.4%) and 3 (75.2%) is 79.8%.
    expect(empiricalDifficulty(79.8)).toBeCloseTo(2.5, 2);
  });

  it('clamps outside the measured range instead of extrapolating off-scale', () => {
    expect(empiricalDifficulty(99)).toBe(1);
    expect(empiricalDifficulty(4)).toBe(5);
  });

  it('is monotonic: harder questions never score easier', () => {
    let previous = -Infinity;
    for (let pct = 40; pct <= 100; pct += 1) {
      const d = empiricalDifficulty(pct)!;
      expect(d).toBeLessThanOrEqual(previous === -Infinity ? Infinity : previous + 1e-9);
      previous = d;
    }
  });

  it('treats missing data as unknown, not as easy', () => {
    expect(empiricalDifficulty(null)).toBeNull();
    expect(empiricalDifficulty(undefined)).toBeNull();
    expect(empiricalDifficulty(Number.NaN)).toBeNull();
  });
});

describe('effectiveDifficulty', () => {
  it('returns the label untouched at weight 0, whatever the stat says', () => {
    expect(effectiveDifficulty(2, stat({ correctPct: 54 }), 0)).toBe(2);
  });

  it('returns the label untouched when there is no stat', () => {
    expect(effectiveDifficulty(2, null, 1)).toBe(2);
  });

  it('blends label and measurement at the default weight', () => {
    // Label 2, cohort 75.2% (an empirical 3) → halfway is 2.5.
    expect(effectiveDifficulty(2, stat({ correctPct: 75.2 }))).toBeCloseTo(2.5, 5);
  });

  it('follows the measurement entirely at weight 1', () => {
    expect(effectiveDifficulty(2, stat({ correctPct: 66.4 }), 1)).toBeCloseTo(4, 5);
  });

  it('falls back to the measurement when the label is missing', () => {
    expect(effectiveDifficulty(null, stat({ correctPct: 84.4 }), 0.5)).toBeCloseTo(2, 5);
  });

  it('returns null when neither signal exists', () => {
    expect(effectiveDifficulty(null, null, 0.5)).toBeNull();
  });
});

describe('isInBandFractional', () => {
  it('accepts a fraction that rounds into the band', () => {
    expect(isInBandFractional(2.7, { min: 3, max: 5 })).toBe(true);
    expect(isInBandFractional(3.4, { min: 1, max: 3 })).toBe(true);
  });

  it('rejects a fraction that rounds outside it', () => {
    expect(isInBandFractional(2.4, { min: 3, max: 5 })).toBe(false);
    expect(isInBandFractional(3.6, { min: 1, max: 3 })).toBe(false);
  });

  it('breaks the .5 tie upward, consistently', () => {
    expect(isInBandFractional(2.5, { min: 3, max: 5 })).toBe(true);
    expect(isInBandFractional(2.5, { min: 1, max: 2 })).toBe(false);
  });

  it('never counts an unknown difficulty as in band', () => {
    expect(isInBandFractional(null, { min: 1, max: 5 })).toBe(false);
    expect(isInBandFractional(Number.NaN, { min: 1, max: 5 })).toBe(false);
  });
});

describe('normalizeTrapTag', () => {
  it('keeps only the base taxonomy', () => {
    expect(normalizeTrapTag('Too Strong: must / ensure')).toBe('too strong');
    expect(normalizeTrapTag('Too Strong; Greatest Risk')).toBe('too strong');
  });

  it('matches across the corpus casing drift', () => {
    expect(normalizeTrapTag('Not A Flaw')).toBe(normalizeTrapTag('Not a Flaw'));
  });

  it('collapses whitespace so a stray double space still matches', () => {
    expect(normalizeTrapTag('Out  Of   Scope')).toBe('out of scope');
  });

  it('returns null for nothing worth comparing', () => {
    expect(normalizeTrapTag(null)).toBeNull();
    expect(normalizeTrapTag('   ')).toBeNull();
  });
});

describe('trapScore', () => {
  it('is zero with no targets', () => {
    expect(trapScore(stat(), [])).toBe(0);
    expect(trapScore(stat(), null)).toBe(0);
  });

  it('is zero when the question leans on a different trap', () => {
    expect(trapScore(stat({ topTrapTag: 'Out Of Scope' }), ['Too Strong'])).toBe(0);
  });

  it('scores a match by how much of the wrong mass sits on that trap', () => {
    expect(trapScore(stat({ trapSpread: 0.8 }), ['Too Strong'])).toBeCloseTo(0.8, 5);
    expect(trapScore(stat({ trapSpread: 0.25 }), ['Too Strong'])).toBeCloseTo(0.25, 5);
  });

  it('matches on the base tag when the corpus wrote a compound one', () => {
    expect(trapScore(stat({ topTrapTag: 'Too Strong; Greatest Risk' }), ['too strong'])).toBeGreaterThan(0);
  });

  it('clamps a spread that overshoots rather than trusting it', () => {
    expect(trapScore(stat({ trapSpread: 1.4 }), ['Too Strong'])).toBe(1);
  });

  it('is zero without a stat, never a guess', () => {
    expect(trapScore(null, ['Too Strong'])).toBe(0);
  });
});

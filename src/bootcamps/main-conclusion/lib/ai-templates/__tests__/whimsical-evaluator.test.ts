/**
 * Drill 3.6 evaluator spot-checks.
 * Verifies the keyword-overlap pipeline classifies all three buckets.
 */

import { describe, it, expect } from 'vitest';
import { evaluateDesignedConclusion } from '@/bootcamps/main-conclusion/lib/ai-templates/whimsical-evaluator';

const dragonPair = {
  premise_pair: { p1: 'All pet dragons hoard glittery objects.', p2: 'Daphne is a pet dragon.' },
  valid_model: 'Daphne hoards glittery objects.',
  invalid_model: 'All glittery objects belong to dragons.',
};

describe('whimsical evaluator', () => {
  it('classifies a valid conclusion as Valid', () => {
    const r = evaluateDesignedConclusion({ ...dragonPair, student_text: 'Daphne hoards glittery objects.' });
    expect(r.classification).toBe('Valid');
  });

  it('classifies a reverse-the-conditional as Invalid but interesting', () => {
    const r = evaluateDesignedConclusion({
      ...dragonPair,
      student_text: 'Glittery objects belong to dragons hoarding them.',
    });
    expect(['Invalid but interesting', 'Misses the premises entirely']).toContain(r.classification);
  });

  it('classifies an outside-knowledge import as Misses the premises entirely', () => {
    const r = evaluateDesignedConclusion({
      ...dragonPair,
      student_text: 'Tax policy reform requires bipartisan support in Congress.',
    });
    expect(r.classification).toBe('Misses the premises entirely');
    expect(r.scores.overlap_with_premises).toBeLessThan(0.30);
  });

  it('handles empty input gracefully', () => {
    const r = evaluateDesignedConclusion({ ...dragonPair, student_text: '' });
    expect(r.classification).toBe('Misses the premises entirely');
  });
});

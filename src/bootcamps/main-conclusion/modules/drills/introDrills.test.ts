import { describe, expect, it } from 'vitest';

import { INTRO_DRILLS } from '@/bootcamps/main-conclusion/modules/drills/introDrills';

describe('INTRO_DRILLS', () => {
  it('keeps the native drill lineup in the intended order', () => {
    expect(INTRO_DRILLS.map((drill) => drill.slug)).toEqual([
      'main-conclusion-lab',
      'first-sentence-vs-rebuttal-lab',
      'conclusion-type-lab',
    ]);
  });

  it('numbers the drill cards to match the lesson sequence', () => {
    expect(INTRO_DRILLS.map((drill) => drill.number)).toEqual(['1', '2', '3']);
  });
});

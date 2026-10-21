import { describe, expect, it } from 'vitest';
import type { DrillRunSpec } from './drillRunSpec';
import { hasSelectedQidList, reviewPolicyForRun, pickModelForRun } from './drillReviewPolicy';

const kinds = ['guided-drill', 'assignment', 'saved-set', 'questions', 'practice-set', 'bootcamp-day', 'filter'] as const;

describe('Drill review policy', () => {
  it.each(kinds)('%s is fixed', (launchKind) => {
    expect(reviewPolicyForRun({ launchKind } as DrillRunSpec)).toBe('fixed');
  });

  it('keeps Smart Drill adaptive and sections outside review controls', () => {
    expect(reviewPolicyForRun({ launchKind: 'smart-drill' } as DrillRunSpec)).toBe('adaptive');
    expect(reviewPolicyForRun({ launchKind: 'section' } as DrillRunSpec)).toBe('none');
  });

  it('keeps sealed and practice-test runs outside review controls', () => {
    expect(reviewPolicyForRun({ launchKind: 'assignment', sealed: true } as DrillRunSpec)).toBe('none');
    expect(reviewPolicyForRun({ launchKind: 'questions', ptRun: {} as never } as DrillRunSpec)).toBe('none');
  });

  it('uses the list pick model only for a type drill with selected qids', () => {
    const list = { launchKind: 'questions', mode: 'type-drill', config: { selectedQids: ['q1'] } } as DrillRunSpec;
    const natural = { ...list, mode: 'natural-drill' } as DrillRunSpec;
    expect(hasSelectedQidList(list)).toBe(true);
    expect(pickModelForRun(list)).toBe('list');
    expect(hasSelectedQidList(natural)).toBe(false);
    expect(pickModelForRun(natural)).toBe('commit');
  });
});

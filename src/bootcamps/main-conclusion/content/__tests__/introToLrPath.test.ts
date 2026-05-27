import { describe, expect, it } from 'vitest';

import { INTEGRATED_PATH } from '@/bootcamps/main-conclusion/content/introToLrPath';

describe('Intro to LR guided path order', () => {
  it('starts with the rebalance sequence', () => {
    expect(INTEGRATED_PATH.slice(0, 5).map((action) => action.id)).toEqual([
      'stimulus-first',
      'argument-anatomy',
      'core-indicators',
      'two-part-check',
      'structure-reading',
    ]);
  });

  it('keeps validity and flaw language out of the first item metadata', () => {
    const firstItem = INTEGRATED_PATH[0];
    const visibleMetadata = [firstItem.id, firstItem.title, firstItem.description, firstItem.phase]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    expect(visibleMetadata).not.toMatch(/\bvalid\b/);
    expect(visibleMetadata).not.toMatch(/\binvalid\b/);
    expect(visibleMetadata).not.toMatch(/\bgap\b/);
    expect(visibleMetadata).not.toMatch(/\bflaw\b/);
  });
});

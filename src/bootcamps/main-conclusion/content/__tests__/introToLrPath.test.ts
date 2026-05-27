import { describe, expect, it } from 'vitest';

import { INTEGRATED_PATH } from '@/bootcamps/main-conclusion/content/introToLrPath';

describe('Intro to LR guided path order', () => {
  it('starts with the eight-page note sequence', () => {
    expect(INTEGRATED_PATH.slice(0, 8).map((action) => action.id)).toEqual([
      'how-to-read-lr-stimulus',
      'three-parts-lr-question',
      'so-an-argument',
      'premises',
      'conclusions',
      'five-types-of-conclusions',
      'beyond-premises-and-conclusions',
      'two-part-conclusion-check',
    ]);
  });

  it('keeps page one metadata free of drills and quizzes', () => {
    const firstItem = INTEGRATED_PATH[0];
    const visibleMetadata = [firstItem.id, firstItem.title, firstItem.description, firstItem.phase]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    expect(visibleMetadata).not.toMatch(/\bquiz\b/);
    expect(visibleMetadata).not.toMatch(/\bdrill\b/);
    expect(visibleMetadata).not.toMatch(/\bmastered\b/);
  });
});

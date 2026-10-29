import { describe, expect, it } from 'vitest';

import { INTEGRATED_PATH, getCurrentActionIndex, normalizePathnameForAction } from '@/bootcamps/main-conclusion/content/introToLrPath';

describe('Intro to LR guided path order', () => {
  it('places the conclusion type lab right after five types of conclusions', () => {
    expect(INTEGRATED_PATH.slice(0, 10).map((action) => action.id)).toEqual([
      'three-parts-lr-question',
      'so-an-argument',
      'premises',
      'conclusions',
      'five-types-of-conclusions',
      'conclusion-type-lab',
      'beyond-premises-and-conclusions',
      'two-part-conclusion-check',
      'main-conclusion-lab',
      'first-sentence-vs-rebuttal-structures',
    ]);
  });

  it('places the first-sentence and rebuttal practice drills after the structures note', () => {
    // The first-sentence-vs-rebuttal lab is now step 11 of the path; the two
    // practice drills follow it.
    expect(INTEGRATED_PATH.slice(10).map((action) => action.id)).toEqual([
      'first-sentence-vs-rebuttal-lab',
      'first-sentence-main-conclusion',
      'rebuttal-main-conclusion',
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

  it('treats drill /run routes as part of the parent drill action', () => {
    expect(normalizePathnameForAction('/bootcamp/intro-to-lr/drills/main-conclusion-lab/run')).toBe(
      '/bootcamp/intro-to-lr/drills/main-conclusion-lab/run',
    );
    expect(getCurrentActionIndex('/bootcamp/intro-to-lr/drills/main-conclusion-lab/run')).toBe(8);
    // The first-sentence-vs-rebuttal lab is now step 11 (index 10); its /run
    // subroute resolves to that parent action.
    expect(getCurrentActionIndex('/bootcamp/intro-to-lr/drills/first-sentence-vs-rebuttal-lab/run')).toBe(10);
  });

  it('normalizes the mixed classification alias to the native first sentence vs rebuttal drill', () => {
    expect(normalizePathnameForAction('/bootcamp/intro-to-lr/drills/mixed-classification')).toBe(
      '/bootcamp/intro-to-lr/drills/first-sentence-vs-rebuttal-lab',
    );
  });
});

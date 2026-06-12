import { describe, expect, it } from 'vitest';

import { INTEGRATED_PATH, getCurrentActionIndex, normalizePathnameForAction } from '@/bootcamps/main-conclusion/content/introToLrPath';

describe('Intro to LR guided path order', () => {
  it('places the main conclusion drill right after beyond premises and conclusions', () => {
    expect(INTEGRATED_PATH.slice(0, 9).map((action) => action.id)).toEqual([
      'three-parts-lr-question',
      'so-an-argument',
      'premises',
      'conclusions',
      'five-types-of-conclusions',
      'beyond-premises-and-conclusions',
      'main-conclusion-lab',
      'two-part-conclusion-check',
      'first-sentence-vs-rebuttal-structures',
    ]);
  });

  it('places the first-sentence and rebuttal practice drills after the structures note', () => {
    // The first-sentence-vs-rebuttal lab is now step 10 of the path; the two
    // practice drills follow it.
    expect(INTEGRATED_PATH.slice(9).map((action) => action.id)).toEqual([
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
    expect(getCurrentActionIndex('/bootcamp/intro-to-lr/drills/main-conclusion-lab/run')).toBe(6);
    // The first-sentence-vs-rebuttal lab is now step 10 (index 9); its /run
    // subroute resolves to that parent action.
    expect(getCurrentActionIndex('/bootcamp/intro-to-lr/drills/first-sentence-vs-rebuttal-lab/run')).toBe(9);
  });

  it('normalizes the mixed classification alias to the native first sentence vs rebuttal drill', () => {
    expect(normalizePathnameForAction('/bootcamp/intro-to-lr/drills/mixed-classification')).toBe(
      '/bootcamp/intro-to-lr/drills/first-sentence-vs-rebuttal-lab',
    );
  });
});

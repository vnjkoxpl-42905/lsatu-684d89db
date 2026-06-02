import { describe, expect, it } from 'vitest';

import { INTEGRATED_PATH, getCurrentActionIndex, normalizePathnameForAction } from '@/bootcamps/main-conclusion/content/introToLrPath';

describe('Intro to LR guided path order', () => {
  it('places the main conclusion drill right after beyond premises and conclusions', () => {
    expect(INTEGRATED_PATH.slice(0, 10).map((action) => action.id)).toEqual([
      'how-to-read-lr-stimulus',
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

  it('keeps the remaining replica drills at the end of the path', () => {
    expect(INTEGRATED_PATH.slice(10).map((action) => action.id)).toEqual([
      'first-sentence-vs-rebuttal-lab',
      'argument-structure-lab',
      'structure-reveal-review',
      'final-mixed-structure-check',
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
    expect(getCurrentActionIndex('/bootcamp/intro-to-lr/drills/main-conclusion-lab/run')).toBe(7);
  });
});

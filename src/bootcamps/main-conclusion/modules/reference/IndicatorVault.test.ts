import { describe, expect, it } from 'vitest';
import vault from '@/bootcamps/main-conclusion/data/indicator-vault.generated.json';
import { buildCoreIndicatorSections } from '@/bootcamps/main-conclusion/modules/reference/IndicatorVault';

describe('buildCoreIndicatorSections', () => {
  it('returns the approved premise and conclusion sections in the expected order', () => {
    const sections = buildCoreIndicatorSections(vault);

    expect(sections.map((section) => section.id)).toEqual([
      'IND-premise-FABS',
      'IND-conclusion',
    ]);
    expect(sections[0].title).toBe('Premises: Statements of Fact');
    expect(sections[1].title).toBe("Conclusions: The Author's Claim");
  });

  it('reuses generated indicator words for the premise and conclusion sections', () => {
    const sections = buildCoreIndicatorSections(vault);

    // Words come straight from indicator-vault.generated.json (source of truth).
    // The conclusion sequence was intentionally restaged/expanded as a pedagogy
    // update (commit 2a2120d9); this assertion tracks the generated order, it is
    // not a hand-curated subset.
    expect(sections[0].words).toEqual(['for', 'after all', 'because', 'since']);
    expect(sections[1].words).toEqual([
      'therefore',
      'thus',
      'hence',
      'so',
      'consequently',
      'as a result',
      'it follows that',
      'this shows that',
    ]);
  });

  it('includes the approved are and are-not teaching copy', () => {
    const sections = buildCoreIndicatorSections(vault);

    expect(sections[0].are).toEqual(['Facts', 'Evidence', 'Support', 'Building blocks']);
    expect(sections[0].areNot).toEqual([
      'Main judgments',
      'The part you attack',
      'Final claims',
    ]);
    expect(sections[1].are).toEqual([
      "Author's claim",
      'The point argued for',
      'Part you question',
    ]);
    expect(sections[1].areNot).toEqual([
      'Automatically proven',
      'Self-supporting',
      'Always clear',
    ]);
  });
});

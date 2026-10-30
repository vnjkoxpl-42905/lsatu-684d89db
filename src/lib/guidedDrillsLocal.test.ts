import { describe, it, expect } from 'vitest';
import { getLocalGuidedDrillBySlug, isEmptyBankFilter } from './guidedDrillsLocal';

describe('guidedDrillsLocal', () => {
  it('resolves the previously-broken Assumption Family drill from the bundled seed', () => {
    const drill = getLocalGuidedDrillBySlug('w1-03-assumption-family-easier-set-1');
    expect(drill).not.toBeNull();
    expect(drill?.title).toContain('Assumption Family');
    expect(drill?.question_count).toBe(9);
    // A usable pool filter must be present so the drill can resolve client-side.
    expect(isEmptyBankFilter(drill?.bank_filter)).toBe(false);
    expect(drill?.bank_filter.qtypes?.length).toBeGreaterThan(0);
    expect(drill?.is_published).toBe(true);
  });

  it('also resolves the working First Sentence drill', () => {
    const drill = getLocalGuidedDrillBySlug('w1-01-first-sentence-conclusions');
    expect(drill?.bank_filter.features).toContain('First Sentence Conclusion');
  });

  it('returns null for unknown or empty slugs', () => {
    expect(getLocalGuidedDrillBySlug('does-not-exist')).toBeNull();
    expect(getLocalGuidedDrillBySlug(undefined)).toBeNull();
    expect(getLocalGuidedDrillBySlug(null)).toBeNull();
  });

  it('treats null/empty filters as empty, populated filters as non-empty', () => {
    expect(isEmptyBankFilter(null)).toBe(true);
    expect(isEmptyBankFilter({})).toBe(true);
    expect(isEmptyBankFilter({ qtypes: [], features: [] })).toBe(true);
    expect(isEmptyBankFilter({ difficulty_min: 1 })).toBe(false);
    expect(isEmptyBankFilter({ qtypes: ['Flaw'] })).toBe(false);
  });
});

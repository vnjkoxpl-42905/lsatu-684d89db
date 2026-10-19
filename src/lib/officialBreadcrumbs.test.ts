import { describe, it, expect } from 'vitest';
import { officialLeadCrumbLabel } from './officialBreadcrumbs';

describe('officialLeadCrumbLabel', () => {
  it('names the PrepTest when the question has one', () => {
    expect(officialLeadCrumbLabel({ pt: 74 })).toBe('The Official LSAT PrepTest 74');
  });

  it('names the PrepTest even when the drill has a return target', () => {
    expect(officialLeadCrumbLabel({ pt: 74, returnTo: '/classroom/drill' })).toBe(
      'The Official LSAT PrepTest 74'
    );
  });

  it('keeps the flagged crumb', () => {
    expect(officialLeadCrumbLabel({ pt: 74, returnTo: '/flagged' })).toBe('Flagged Questions');
  });

  it('names the PrepTest on a guided drill too', () => {
    expect(
      officialLeadCrumbLabel({ pt: 74, returnTo: '/guided/abc', isGuidedDrillReturn: true })
    ).toBe('The Official LSAT PrepTest 74');
  });

  it('falls back to Library on a guided drill with no PrepTest', () => {
    expect(
      officialLeadCrumbLabel({ pt: null, returnTo: '/guided/abc', isGuidedDrillReturn: true })
    ).toBe('Library');
  });

  it('falls back to Library only when there is no PrepTest', () => {
    expect(officialLeadCrumbLabel({ pt: null })).toBe('Library');
    expect(officialLeadCrumbLabel({ pt: undefined, returnTo: '/classroom/drill' })).toBe('Library');
    expect(officialLeadCrumbLabel({ pt: '' })).toBe('Library');
  });
});

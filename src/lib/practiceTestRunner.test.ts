import { describe, it, expect } from 'vitest';
import { isSittingReturn, practiceTestPath } from './practiceTestRunner';

describe('practiceTestPath', () => {
  it('builds the invigilator path for a run', () => {
    expect(practiceTestPath('run-1')).toBe('/testing/test/run-1');
  });
});

describe('isSittingReturn', () => {
  it('recognises the path practiceTestPath builds', () => {
    // The pair that must never drift: whatever we navigate TO, we recognise.
    expect(isSittingReturn(practiceTestPath('abc-123'))).toBe(true);
  });

  it('is false for a missing return path', () => {
    expect(isSittingReturn(undefined)).toBe(false);
    expect(isSittingReturn(null)).toBe(false);
    expect(isSittingReturn('')).toBe(false);
  });

  it('is false for standalone drill routes', () => {
    expect(isSittingReturn('/classroom')).toBe(false);
    expect(isSittingReturn('/drill')).toBe(false);
    expect(isSittingReturn('/rc')).toBe(false);
  });

  it('does not match the Testing Centre landing page itself', () => {
    // /testing is the two doors, not a sitting. Suppressing score UI there
    // would hide the finished-run report the student came to read.
    expect(isSittingReturn('/testing')).toBe(false);
  });

  it('does not match a lookalike prefix', () => {
    expect(isSittingReturn('/testing/tests/run-1')).toBe(false);
    expect(isSittingReturn('/x/testing/test/run-1')).toBe(false);
  });
});

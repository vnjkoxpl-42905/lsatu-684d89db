import { describe, it, expect } from 'vitest';
import { reviewTabsFor } from './SectionReviewWalk';

describe('reviewTabsFor', () => {
  it('offers Clean and Actual when no blind review was sat', () => {
    expect(reviewTabsFor(undefined)).toEqual(['clean', 'actual']);
    expect(reviewTabsFor(null)).toEqual(['clean', 'actual']);
  });

  it('does not offer a BR tab for an empty result set', () => {
    // The same empty-array trap that made the score report announce a blind
    // review nobody sat. An empty array is not a review.
    expect(reviewTabsFor([])).toEqual(['clean', 'actual']);
  });

  it('offers the BR tab once a review actually happened', () => {
    expect(reviewTabsFor([{ qid: 'q1', brAnswer: 'C' } as never])).toEqual([
      'clean',
      'actual',
      'br',
    ]);
  });
});

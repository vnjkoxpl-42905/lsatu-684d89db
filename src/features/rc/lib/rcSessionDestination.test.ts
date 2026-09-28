import { expect, it } from 'vitest';
import { completedRcDestination, rcReviewRedirect } from './rcSessionDestination';

it('continues an unfinished RC session without the answer-revealing review mode', () => {
  expect(rcReviewRedirect('in_progress', true, '?sessionId=rc-session&review=1&q=123&returnTo=%2Freview%2Fto-review'))
    .toBe('/rc/drill?sessionId=rc-session&q=123&returnTo=%2Freview%2Fto-review');
  expect(rcReviewRedirect('completed', true, '?review=1')).toBeNull();
  expect(rcReviewRedirect('in_progress', false, '')).toBeNull();
  expect(() => rcReviewRedirect('abandoned', true, '?review=1')).toThrow('not available for review');
});

it('returns a completed practice-test leg to the active sitting', () => {
  expect(completedRcDestination('rc-session', '/testing/test/run-123'))
    .toBe('/testing/test/run-123');
  expect(completedRcDestination('rc-session', null, 'run-123'))
    .toBe('/testing/test/run-123');
});

it('sends a completed standalone drill to its results, preserving a non-sitting return', () => {
  expect(completedRcDestination('rc-session', null)).toBe('/rc/results/rc-session');
  expect(completedRcDestination('rc-session', '/classroom'))
    .toBe('/rc/results/rc-session?returnTo=%2Fclassroom');
});

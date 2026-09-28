import { expect, it } from 'vitest';
import { completedRcDestination } from './rcSessionDestination';

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

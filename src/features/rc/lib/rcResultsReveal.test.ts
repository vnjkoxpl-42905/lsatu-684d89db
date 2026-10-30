import { describe, expect, it } from 'vitest';
import { canRevealRcResults } from './rcResultsReveal';
import type { RcDrillConfig } from './rcTypes';
const config = { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' } } as RcDrillConfig;
describe('RC result disclosure across generic history and protected reports', () => {
  it('hides completed full-test child scores without verified parent release, even with a drill reveal marker', () => {
    const session = { status: 'completed' as const, config: { ...config, practiceTestRunId: 'exam', resultsRevealedAt: '2026-10-18T00:00:00Z' } };
    expect(canRevealRcResults(session)).toBe(false);
    expect(canRevealRcResults(session, true)).toBe(true);
    expect(canRevealRcResults({ ...session, status: 'in_progress' }, true)).toBe(false);
  });
  it('preserves standalone completed release and ordinary explicit disclosure', () => {
    expect(canRevealRcResults({ status: 'completed', config: { ...config, timedSectionSittingId: 'sitting' } })).toBe(true);
    expect(canRevealRcResults({ status: 'completed', config })).toBe(false);
    expect(canRevealRcResults({ status: 'completed', config: { ...config, resultsRevealedAt: '2026-10-18T00:00:00Z' } })).toBe(true);
  });
});

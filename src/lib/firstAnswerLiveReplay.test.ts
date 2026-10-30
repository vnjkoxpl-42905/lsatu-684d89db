import { describe, expect, it } from 'vitest';
import raw from './__fixtures__/progress-live-20261028.json';
import baseline from './__fixtures__/progress-live-baseline-20261028.json';
import { adaptLrAttempts, adaptLrSections, adaptRcAttempts, completedPracticeTestIds, orderedDistinctAnswers, projectFirstAnswerProgress, type LrAttemptSourceRow, type RcSessionSourceRow } from './firstAnswerProgress';
import { firstAnswerDetails } from './firstAnswerDetails';

describe('redacted actual-source replay against executed pre-unification adapter', () => {
  const runs = completedPracticeTestIds(raw.practiceTests, baseline.ownerId);
  const answers = [...adaptLrAttempts(raw.lrAttempts as LrAttemptSourceRow[], baseline.ownerId), ...adaptLrSections(raw.lrSections, baseline.ownerId, runs), ...adaptRcAttempts(raw.rcAttempts, raw.rcSessions as RcSessionSourceRow[], baseline.ownerId, runs)];
  const coverage = { includedSources: [], missingSources: [], excludedRows: {} };
  it('preserves actual persisted identities, chronology and global first-answer identity', () => {
    expect(answers.map(({ correct, resultVisibility, provenance, ...identity }) => identity)).toEqual(baseline.answers.map(({ correct, ...identity }) => identity));
    const first = new Map<string, string>();
    for (const row of orderedDistinctAnswers(answers)) if (!first.has(row.questionKey)) first.set(row.questionKey, row.attemptId);
    expect([...first]).toEqual(baseline.firstIdentities);
    expect(answers).toHaveLength(88);
  });
  it('withholds only actual unrevealed RC outcomes without promoting a later answer', () => {
    const progress = projectFirstAnswerProgress({ answers, coverage, window: 'all', asOf: raw.asOf });
    expect(progress.LR).toEqual(baseline.progress.LR);
    const withheld = answers.filter(row => row.resultVisibility === 'withheld');
    expect(withheld.every(row => row.area === 'RC' && row.correct === null)).toBe(true);
    const detail = firstAnswerDetails(answers, 'all', raw.asOf);
    expect(detail.history.filter(row => row.isFirst).map(row => row.attemptId).sort()).toEqual(baseline.firstIdentities.map(([, id]) => id).sort());
    expect(progress.RC.denominator).toBe(baseline.progress.RC.denominator - detail.history.filter(row => row.area === 'RC' && row.isFirst && row.resultVisibility === 'withheld').length);
    expect(progress.repeatCount).toBe(baseline.progress.repeatCount);
  });
});

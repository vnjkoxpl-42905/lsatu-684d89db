import type { StandaloneDrillRun } from '@/lib/drillRunLedger';
import { launchDrill } from '@/lib/drillLaunch';
import type { RcAttempt, RcDrillSession } from '@/features/rc/lib/rcTypes';
import type { DrillResumeSession } from '@/lib/drillResumeSession';

export type StandaloneDrillHistoryItem = {
  key: string;
  title: string;
  detail: string;
  date: string;
  status: 'in_progress' | 'completed';
  continueTo: string;
  resultsTo: string;
  reviewTo: string;
};

/** Account-owned sittings, including repeated sets; an unfinished run needs saved work. */
export function buildStandaloneDrillHistory(
  lrRuns: StandaloneDrillRun[],
  rcSessions: RcDrillSession[],
  rcAttempts: Map<string, RcAttempt[]>,
  smartDrill: DrillResumeSession | null = null,
): StandaloneDrillHistoryItem[] {
  const lr: StandaloneDrillHistoryItem[] = lrRuns
    .filter((run) => !run.source_key.startsWith('guided::'))
    .filter((run) => run.session.status === 'completed' || run.session.attempts.length > 0)
    .map((run) => ({
      key: `lr:${run.id}`,
      title: run.source_key === 'drill::adaptive' ? 'Smart Drill' : run.label || 'LR drill',
      detail: run.source_key === 'drill::adaptive'
        ? `${run.session.attempts.length} answer${run.session.attempts.length === 1 ? '' : 's'} saved`
        : `${run.session.attempts.length} of ${run.session.question_queue.length} answered`,
      date: run.updated_at,
      status: run.session.status,
      continueTo: run.source_key === 'drill::adaptive'
        ? `/drill?${launchDrill({ kind: 'smart-drill', options: { returnTo: '/practice/drills' } })}&run=${encodeURIComponent(run.id)}`
        : `/drill?${launchDrill({ kind: 'questions', qids: run.session.question_queue, options: { returnTo: '/practice/drills' } })}&run=${encodeURIComponent(run.id)}`,
      resultsTo: `/practice/drills/runs/${run.id}?view=results`,
      reviewTo: `/practice/drills/runs/${run.id}?view=review`,
    }));

  const rc: StandaloneDrillHistoryItem[] = rcSessions
    .filter((session) => !session.config.practiceTestRunId && session.config.source !== 'assignment' &&
      (session.status === 'completed' || session.status === 'in_progress'))
    .filter((session) => session.status === 'completed' || (rcAttempts.get(session.id)?.length ?? 0) > 0)
    .map((session) => {
      const firstAnswers = (rcAttempts.get(session.id) ?? []).filter((answer) => answer.isFirstAttempt);
      return {
        key: `rc:${session.id}`,
        title: `RC drill · ${session.passageIds.length} passage${session.passageIds.length === 1 ? '' : 's'}`,
        detail: `${firstAnswers.length} first answer${firstAnswers.length === 1 ? '' : 's'} saved`,
        date: session.completedAt ?? session.config.lastActiveAt ?? session.startedAt,
        status: session.status as 'completed' | 'in_progress',
        continueTo: `/rc/drill?sessionId=${encodeURIComponent(session.id)}`,
        resultsTo: `/rc/results/${encodeURIComponent(session.id)}`,
        reviewTo: `/rc/drill?sessionId=${encodeURIComponent(session.id)}&review=1`,
      };
    });

  // The old shared resume row may still exist for an active sitting. Account
  // ledger rows own distinct finished sittings and supersede that active row.
  const smart: StandaloneDrillHistoryItem[] = smartDrill?.pool_slug === 'drill::adaptive' &&
    smartDrill.status === 'in_progress' && smartDrill.attempts.length > 0 &&
    smartDrill.question_queue.length > 0 &&
    !lrRuns.some((run) => run.source_key === 'drill::adaptive' && run.session.status === 'in_progress')
    ? [{
      key: 'smart:adaptive',
      title: 'Smart Drill',
      detail: `${smartDrill.attempts.length} answer${smartDrill.attempts.length === 1 ? '' : 's'} saved`,
      date: smartDrill.updated_at,
      status: 'in_progress',
      continueTo: `/drill?${launchDrill({ kind: 'smart-drill', options: { returnTo: '/classroom' } })}`,
      resultsTo: '',
      reviewTo: '',
    }]
    : [];

  return [...lr, ...rc, ...smart].sort((a, b) => b.date.localeCompare(a.date));
}

import type { StandaloneDrillRun } from '@/lib/drillRunLedger';
import { launchDrill } from '@/lib/drillLaunch';
import type { RcAttempt, RcDrillSession } from '@/features/rc/lib/rcTypes';

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
): StandaloneDrillHistoryItem[] {
  const lr: StandaloneDrillHistoryItem[] = lrRuns
    .filter((run) => run.session.status === 'completed' || run.session.attempts.length > 0)
    .map((run) => ({
      key: `lr:${run.id}`,
      title: run.label || 'LR drill',
      detail: `${run.session.attempts.length} of ${run.session.question_queue.length} answered`,
      date: run.updated_at,
      status: run.session.status,
      continueTo: `/drill?${launchDrill({ kind: 'questions', qids: run.session.question_queue, options: { returnTo: '/practice/drills' } })}&run=${encodeURIComponent(run.id)}`,
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

  return [...lr, ...rc].sort((a, b) => b.date.localeCompare(a.date));
}

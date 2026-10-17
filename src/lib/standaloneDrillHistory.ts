import type { StandaloneDrillRun } from '@/lib/drillRunLedger';
import { launchDrill } from '@/lib/drillLaunch';
import type { RcAttempt, RcDrillSession } from '@/features/rc/lib/rcTypes';
import { readRcDraftAnswers } from '@/features/rc/lib/rcTypes';
import type { DrillResumeSession } from '@/lib/drillResumeSession';

export type StandaloneDrillHistoryItem = {
  key: string;
  section: 'lr' | 'rc';
  title: string;
  detail: string;
  date: string;
  status: 'in_progress' | 'completed';
  continueTo: string;
  resultsTo: string;
  reviewTo: string;
  /** RC only: the session an unfinished card can discard. */
  discardId?: string;
};

/** What a card needs to name a passage the way the student knows it. */
export type RcCardPassage = { preptest: number; section: number; setNumber: number; title: string | null };

/** `PT 139 · S3 · P1 · Improving Farm Economics`, or the address alone if untitled. */
export function rcPassageLabel(p: RcCardPassage): string {
  const address = `PT ${p.preptest} · S${p.section} · P${p.setNumber}`;
  return p.title ? `${address} · ${p.title}` : address;
}

function rcCardTitle(passageIds: number[], names: Map<number, RcCardPassage> | undefined): string {
  const known = passageIds.map((id) => names?.get(id)).filter((p): p is RcCardPassage => Boolean(p));
  if (known.length === 0 || known.length !== passageIds.length) {
    return `RC drill · ${passageIds.length} passage${passageIds.length === 1 ? '' : 's'}`;
  }
  if (known.length === 1) return rcPassageLabel(known[0]);
  const short = (p: RcCardPassage) => `PT ${p.preptest} S${p.section} P${p.setNumber}`;
  const shown = known.slice(0, 2).map(short).join(', ');
  return `RC drill · ${known.length} passages · ${shown}${known.length > 2 ? ` +${known.length - 2} more` : ''}`;
}

/** Account-owned sittings, including repeated sets; an unfinished run needs saved work. */
export function buildStandaloneDrillHistory(
  lrRuns: StandaloneDrillRun[],
  rcSessions: RcDrillSession[],
  rcAttempts: Map<string, RcAttempt[]>,
  smartDrill: DrillResumeSession | null = null,
  rcPassages?: Map<number, RcCardPassage>,
): StandaloneDrillHistoryItem[] {
  const lr: StandaloneDrillHistoryItem[] = lrRuns
    .filter((run) => !run.source_key.startsWith('guided::'))
    .filter((run) => run.session.status === 'completed' || run.session.attempts.length > 0)
    .map((run) => ({
      key: `lr:${run.id}`,
      section: 'lr',
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
    .filter((session) => !session.config.practiceTestRunId && !session.config.timedSectionSittingId && session.config.source !== 'assignment' &&
      (session.status === 'completed' || session.status === 'in_progress'))
    .filter((session) => session.status === 'completed' || (rcAttempts.get(session.id)?.length ?? 0) > 0
      || readRcDraftAnswers(session.config.draftAnswers).length > 0)
    .map((session) => {
      const firstAnswers = (rcAttempts.get(session.id) ?? []).filter((answer) => answer.isFirstAttempt);
      const drafts = readRcDraftAnswers(session.config.draftAnswers);
      const rightCount = firstAnswers.filter((answer) => answer.isCorrect === true).length;
      const savedCount = new Set([...firstAnswers.map((answer) => answer.questionId), ...drafts.map((draft) => draft.questionId)]).size;
      return {
        key: `rc:${session.id}`,
        section: 'rc',
        title: rcCardTitle(session.passageIds, rcPassages),
        detail: session.status === 'completed' && firstAnswers.length > 0
          ? `${rightCount}/${firstAnswers.length} correct · ${Math.round((rightCount / firstAnswers.length) * 100)}%`
          : drafts.length > 0 && session.status === 'in_progress'
            ? `${savedCount} answer${savedCount === 1 ? '' : 's'} saved`
            : `${firstAnswers.length} first answer${firstAnswers.length === 1 ? '' : 's'} saved`,
        date: session.completedAt ?? session.config.lastActiveAt ?? session.startedAt,
        status: session.status as 'completed' | 'in_progress',
        continueTo: `/rc/drill?sessionId=${encodeURIComponent(session.id)}`,
        resultsTo: `/rc/results/${encodeURIComponent(session.id)}`,
        reviewTo: `/rc/drill?sessionId=${encodeURIComponent(session.id)}&review=1`,
        ...(session.status === 'in_progress' ? { discardId: session.id } : {}),
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
      section: 'lr',
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

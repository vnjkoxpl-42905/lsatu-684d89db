import type { StandaloneDrillRun } from '@/lib/drillRunLedger';

/**
 * One definition of "what needs review" for a finished LR or Smart Drill sitting.
 * Results, the Review page and the drill history all call this, so the three can
 * never disagree about what was missed or how far the student has got.
 *
 * A question needs review when the student got it wrong or never answered it.
 * It counts as reviewed once the student has opened it on the Review page; the
 * page saves that to the sitting's `reviewed_qids`.
 */

export type DrillReviewSource = Pick<StandaloneDrillRun, 'source_key' | 'session'> & { reviewed_qids?: string[] };
export type DrillQuestionOutcome = 'correct' | 'incorrect' | 'unanswered';

/** Smart Drill and early-ended guided queues hold questions never reached; review only what was attempted. */
export function drillQuestionIds(run: DrillReviewSource): string[] {
  const attempted = run.source_key === 'drill::adaptive' || run.source_key.startsWith('guided::');
  return attempted ? [...new Set(run.session.attempts.map((attempt) => attempt.qid))] : run.session.question_queue;
}

export function questionOutcome(run: DrillReviewSource, qid: string): DrillQuestionOutcome {
  const attempt = run.session.attempts.find((item) => item.qid === qid);
  return !attempt ? 'unanswered' : attempt.correct ? 'correct' : 'incorrect';
}

export function missedQuestionIds(run: DrillReviewSource): string[] {
  return drillQuestionIds(run).filter((qid) => questionOutcome(run, qid) !== 'correct');
}

export type DrillReviewProgress = {
  /** Questions that need review, in drill order. */
  missed: string[];
  /** How many of those the student has opened. */
  reviewed: number;
  /** The first missed question not yet opened, if any. */
  next: string | null;
  /** Everything that needs review has been opened (also true when nothing was missed). */
  done: boolean;
};

export function drillReviewProgress(run: DrillReviewSource, reviewedOverride?: ReadonlySet<string>): DrillReviewProgress {
  const seen = reviewedOverride ?? new Set(run.reviewed_qids ?? []);
  const missed = missedQuestionIds(run);
  const reviewed = missed.filter((qid) => seen.has(qid)).length;
  return { missed, reviewed, next: missed.find((qid) => !seen.has(qid)) ?? null, done: reviewed === missed.length };
}

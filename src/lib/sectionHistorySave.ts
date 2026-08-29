/**
 * Persisting the result of a full LR section.
 *
 * This used to live inside `LRSectionResults`, in a mount effect. That was fine
 * while the only way to finish a section was to look at the results screen, and
 * wrong the moment a practice test needed to finish a section WITHOUT showing
 * one: the sitting's scorer (`readLrLegResult`) reads back the `section_history`
 * row that effect wrote, so skipping the screen skipped the row and every leg
 * read as unfinished.
 *
 * So the writing lives here and the screen calls it, rather than the other way
 * round.
 *
 * Two behaviours are deliberate and differ from the old inline code:
 *
 * 1. `user_id` is set explicitly. The column is nullable with no default and no
 *    trigger, the old insert omitted it, and `readLrLegResult` filters on it —
 *    so LR leg readback almost certainly never matched in production.
 * 2. `persistSectionResults` THROWS on failure. The results screen catches and
 *    toasts (a standalone student can retry by other means), but the practice
 *    test closeout must be able to tell that the write failed, because it
 *    decides whether the leg counts as finished.
 */

import { supabase } from '@/integrations/supabase/client';
import { questionBank } from '@/lib/questionLoader';
import type { DrillSession, BlindReviewResult } from '@/types/drill';

/** One question's outcome in a sat section. */
export interface SectionQuestionStat {
  qid: string;
  qnum: number;
  qtype: string;
  difficulty: number;
  initialAnswer: string;
  correctAnswer: string;
  initialCorrect: boolean;
  brAnswer?: string;
  brCorrect?: boolean;
  brChanged?: boolean;
  timeMs: number;
  brTimeMs?: number;
  switchCount: number;
  flagged: boolean;
}

/** The answer a student never gave. Rendered, and counted as unanswered. */
export const UNANSWERED = '—';

/**
 * Per-question stats for a sat section, in the order the questions were served.
 *
 * Pure, and shared by the results screen and the practice-test closeout so the
 * two can never compute a different row for the same section.
 */
export function buildSectionStats(
  session: DrillSession,
  brResults?: BlindReviewResult[],
): SectionQuestionStat[] {
  return session.questionQueue
    .map((qid, idx) => {
      const question = questionBank.getQuestion(qid);
      const attempt = session.attempts.get(qid);
      const brResult = brResults?.find((br) => br.qid === qid);

      if (!question) return null;

      // No attempt means the question was never answered, which counts as wrong.
      return {
        qid,
        qnum: idx + 1,
        qtype: question.qtype,
        difficulty: question.difficulty,
        initialAnswer: attempt?.selectedAnswer || UNANSWERED,
        correctAnswer: question.correctAnswer,
        initialCorrect: attempt?.correct || false,
        brAnswer: brResult?.brAnswer,
        brCorrect: brResult?.correct,
        brChanged: brResult?.brChanged,
        timeMs: attempt?.timeMs || 0,
        brTimeMs: brResult?.brTimeMs,
        switchCount: attempt?.switchCount || 0,
        flagged: attempt?.brMarked || false,
      };
    })
    .filter(Boolean) as SectionQuestionStat[];
}

/** The scores and timings a `section_history` row is built from. */
export interface SectionTotals {
  initialScore: number;
  initialTotal: number;
  initialPercent: number;
  brScore: number | null;
  brPercent: number | null;
  delta: number | null;
  totalTimeMs: number;
  avgTimeMs: number;
  unansweredCount: number;
}

/**
 * Totals over the per-question stats.
 *
 * Guards the division: a section with no resolvable questions used to produce
 * `NaN` for both percent and average, and Postgres rejects `NaN` on a numeric
 * column, so the whole insert failed on an edge case that should simply record
 * zeroes.
 */
/**
 * Was a blind review actually done? One predicate, used by both the totals and
 * the persisted row, so the score on screen and the row in section_history can
 * never disagree about whether a review happened.
 */
const hasBlindReview = (brResults?: BlindReviewResult[]): boolean =>
  Array.isArray(brResults) && brResults.length > 0;

export function buildSectionTotals(
  stats: SectionQuestionStat[],
  brResults?: BlindReviewResult[],
): SectionTotals {
  const initialTotal = stats.length;
  const initialScore = stats.filter((s) => s.initialCorrect).length;
  const initialPercent = initialTotal
    ? Math.round((initialScore / initialTotal) * 100)
    : 0;

  // An EMPTY array is not a blind review. `brResults ?` treated `[]` as one,
  // so a student who skipped straight to the score report was told they had
  // scored 0 on a review they never sat, with a delta to match. Null is the
  // only honest answer when there is nothing to report.
  const brScore = hasBlindReview(brResults) ? stats.filter((s) => s.brCorrect).length : null;
  const brPercent =
    brScore !== null && initialTotal
      ? Math.round((brScore / initialTotal) * 100)
      : null;
  const delta = brScore !== null ? brScore - initialScore : null;

  const totalTimeMs = stats.reduce((sum, s) => sum + s.timeMs, 0);
  const avgTimeMs = initialTotal ? Math.round(totalTimeMs / initialTotal) : 0;
  const unansweredCount = stats.filter(
    (s) => s.initialAnswer === UNANSWERED,
  ).length;

  return {
    initialScore,
    initialTotal,
    initialPercent,
    brScore,
    brPercent,
    delta,
    totalTimeMs,
    avgTimeMs,
    unansweredCount,
  };
}

/** A `{ correct, total }` tally keyed however the caller groups the stats. */
function tally<K extends string | number>(
  stats: SectionQuestionStat[],
  key: (s: SectionQuestionStat) => K,
): Record<K, { correct: number; total: number }> {
  const out = {} as Record<K, { correct: number; total: number }>;
  stats.forEach((s) => {
    const k = key(s);
    if (!out[k]) out[k] = { correct: 0, total: 0 };
    out[k].total++;
    if (s.initialCorrect) out[k].correct++;
  });
  return out;
}

export interface PersistSectionResultsArgs {
  session: DrillSession;
  stats: SectionQuestionStat[];
  brResults?: BlindReviewResult[];
  classId: string;
  /**
   * Required. `section_history.user_id` has no default and no trigger, and the
   * practice-test scorer matches on it.
   */
  userId: string;
}

/**
 * Writes the `section_history` row for a sat section.
 *
 * Throws on failure. Callers decide what that means: the results screen toasts,
 * the practice-test closeout treats the leg as unfinished and retries.
 */
export async function persistSectionResults({
  session,
  stats,
  brResults,
  classId,
  userId,
}: PersistSectionResultsArgs): Promise<void> {
  const totals = buildSectionTotals(stats, brResults);

  const { error } = await supabase.from('section_history').insert({
    class_id: classId,
    user_id: userId,
    pt: session.fullSectionConfig?.pt || 0,
    section: session.fullSectionConfig?.section || 0,
    mode: session.mode,
    initial_score: totals.initialScore,
    initial_total: totals.initialTotal,
    initial_percent: totals.initialPercent,
    br_score: totals.brScore,
    br_total: totals.brScore !== null ? totals.initialTotal : null,
    br_percent: totals.brPercent,
    br_delta: totals.delta,
    total_time_ms: totals.totalTimeMs,
    avg_time_ms: totals.avgTimeMs,
    unanswered_count: totals.unansweredCount,
    by_qtype_json: tally(stats, (s) => s.qtype),
    by_difficulty_json: tally(stats, (s) => s.difficulty),
    br_used: hasBlindReview(brResults),
  });

  if (error) throw error;
}

/**
 * The questions that belong in the Wrong Answer Journal for this section.
 *
 * Every question the student did not get right, answered or not. `Drill`'s
 * `commitSessionAttempts` journals only ANSWERED misses (it has no attempt row
 * to read for the rest), so the unanswered ones are the gap this covers.
 */
export function wajQidsForSection(stats: SectionQuestionStat[]): string[] {
  return stats.filter((s) => !s.initialCorrect).map((s) => s.qid);
}

/** The subset of {@link wajQidsForSection} that `commitSessionAttempts` skips. */
export function unansweredWajQids(stats: SectionQuestionStat[]): string[] {
  return stats
    .filter((s) => !s.initialCorrect && s.initialAnswer === UNANSWERED)
    .map((s) => s.qid);
}

/**
 * Journals the given questions as wrong answers.
 *
 * Returns the qids it actually wrote. The caller compares that against what it
 * expected: a short list means closeout work is still outstanding, and for a
 * practice-test leg that is the difference between finished and not.
 */
export async function logSectionWrongAnswers(args: {
  stats: SectionQuestionStat[];
  qids: string[];
  classId: string;
}): Promise<string[]> {
  const { stats, qids, classId } = args;
  if (qids.length === 0) return [];

  const wanted = new Set(qids);
  const { logWrongAnswer } = await import('@/lib/wajService');
  const written: string[] = [];

  for (const stat of stats) {
    if (!wanted.has(stat.qid)) continue;
    const question = questionBank.getQuestion(stat.qid);
    if (!question) continue;

    try {
      await logWrongAnswer({
        class_id: classId,
        qid: stat.qid,
        pt: question.pt,
        section: question.section,
        qnum: question.qnum,
        qtype: stat.qtype,
        level: stat.difficulty,
        chosen_answer: stat.initialAnswer,
        correct_answer: stat.correctAnswer,
        time_ms: stat.timeMs,
        confidence_1_5: null,
        review: { q1: '', q2: '', q3: '' },
      });
      written.push(stat.qid);
    } catch (error) {
      // Swallowed on purpose: the caller decides what an incomplete journal
      // means. Reporting WHICH qids landed is more useful than a throw, because
      // a retry should only redo the ones that did not.
      console.error('[sectionHistorySave] WAJ write failed', {
        qid: stat.qid,
        error,
      });
    }
  }

  return written;
}

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
import type { Json } from '@/integrations/supabase/types';
import { questionBank } from '@/lib/questionLoader';
import type { DrillSession, BlindReviewResult } from '@/types/drill';
import { analyseSection, type AnalysisInput } from '@/lib/sectionAnalysis';
import { UNANSWERED } from '@/lib/sectionAnswer';
export { UNANSWERED } from '@/lib/sectionAnswer';

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
  /**
   * What the bank knows about the question, copied onto the sitting so the
   * record survives the bank changing under it. A report read next year has to
   * describe the question as it was when it was sat, and re-reading the bank at
   * display time cannot promise that.
   */
  reasoningTypes?: string[];
  questionFeatures?: string[];
  /** How many times the student opened it, and how many of those changed nothing. */
  visitCount?: number;
  noChangeRevisits?: number;
  /** Choices crossed off. Three of them is "down to two", the flag criterion. */
  eliminations?: string[];
  /**
   * Did they ever open it? A question worked and left blank is a decision; one
   * never reached is the clock. Both are "unanswered" without this.
   */
  everVisited?: boolean;
  /**
   * Every choice put down on this question, in order, each stamped with how
   * far into the question it was made. The results screen draws it as a
   * timeline; an unanswered question has none.
   */
  answerTrail?: Array<{ answer: string; atMs: number }>;
  /**
   * Answered after the section clock ran out. Undefined for a section that
   * never ran out, which is not the same as false on one that did.
   */
  answeredInOvertime?: boolean;
  flagged: boolean;
}

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
  // Who was already answered at the buzzer. A section that never ran out has
  // no mark, and no question on it is in overtime.
  const atBuzzer = session.regulationMark
    ? new Set(session.regulationMark.answeredQids)
    : null;
  const visited = new Set(session.visitedQids ?? []);

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
        reasoningTypes: question.reasoningType?.length ? question.reasoningType : undefined,
        questionFeatures: question.questionFeatures?.length
          ? question.questionFeatures
          : undefined,
        answerTrail: attempt?.answerTrail,
        visitCount: attempt?.visitCount,
        noChangeRevisits: attempt?.noChangeRevisits,
        eliminations: attempt?.eliminations,
        // Undefined rather than false when nothing was recorded at all: a
        // sitting from before visits were tracked must not report every
        // question as one the student never opened.
        everVisited: visited.size > 0 ? visited.has(qid) : undefined,
        answeredInOvertime: atBuzzer ? !atBuzzer.has(qid) : undefined,
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

/**
 * The analysis input for a sat section, enriched from the question bank.
 *
 * The bank already knows which reasoning each question runs on — conditional,
 * causal, quantifier — and that is the cleanest signal we have for a
 * fundamentals gap, which is otherwise the hardest category to tell apart from
 * a process one. It has been sitting unread; this is what reads it.
 */
export function buildAnalysisInput(
  session: DrillSession,
  stats: SectionQuestionStat[],
  brResults?: BlindReviewResult[],
): AnalysisInput {
  const timer = session.fullSectionConfig?.timer;
  const minutes =
    !timer || timer.mode === 'unlimited'
      ? null
      : timer.mode === 'custom'
        ? (timer.customMinutes ?? null)
        : Number(timer.mode);

  return {
    // The stats already carry the bank's tags, copied at build time.
    questions: stats,
    // The student's own clock over the section's questions, so an accommodated
    // section is judged against the time it was actually given.
    paceMsPerQuestion:
      minutes && stats.length ? (minutes * 60_000) / stats.length : null,
    blindReviewDone: hasBlindReview(brResults),
  };
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
  practiceTestRun?: { runId: string; legIndex: number };
}

/**
 * Writes the `section_history` row for a sat section.
 *
 * Throws on failure. Callers decide what that means: the results screen toasts,
 * the practice-test closeout treats the leg as unfinished and retries.
 *
 * Returns the new row's id, which is what the report email is addressed by. A
 * caller that does not want the email can ignore it.
 */
export async function persistSectionResults({
  session,
  stats,
  brResults,
  classId,
  userId,
  practiceTestRun,
}: PersistSectionResultsArgs): Promise<string | null> {
  const totals = buildSectionTotals(stats, brResults);

  // The generated Supabase types are regenerated from the deployed schema, so
  // they lag a migration that has not been applied yet. `analysis_json` is real
  // in the migration and absent from the types until then; casting the row is
  // the honest way to say that, rather than hand-editing a generated file.
  const row = {
    class_id: classId,
    user_id: userId,
    practice_test_run_id: practiceTestRun?.runId ?? null,
    practice_test_leg: practiceTestRun?.legIndex ?? null,
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
    // The per-question record. Without it the row holds totals and nothing
    // else, so the Section Results table — which answer, which correct, how
    // long, flagged or not — exists only for the single render that follows
    // the sitting and is unrecoverable afterwards. Writing it is what makes a
    // sat section a thing a student can come back to.
    // Cast because `Json` demands an index signature and a named interface has
    // none. The value is plain JSON-safe data; the shape is `SectionQuestionStat[]`
    // and `sectionHistory.ts` reads it back as exactly that.
    questions_json: stats as unknown as Json,
    // The diagnosis, written once. Everything above is what happened; this is
    // what it means, and it is stored rather than recomputed on read so a
    // student can be shown next month exactly what they were told today.
    analysis_json: analyseSection(
      buildAnalysisInput(session, stats, brResults),
    ) as unknown as Json,
    // Legacy NOT NULL columns. Nothing writes them, so every row has carried
    // two zeroes that read as "no questions, no time". `readLrLegResult` only
    // survives it by falling back to initial_total / total_time_ms; any query
    // that trusts these instead gets nothing. Same numbers, stated honestly.
    total_questions: totals.initialTotal,
    time_taken_ms: totals.totalTimeMs,
  };

  const { data, error } = await supabase
    .from('section_history')
    .insert(row as unknown as never)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return (data as { id?: string } | null)?.id ?? null;
}

/**
 * Sends the teacher the finished section: the whole record, then the diagnosis.
 *
 * Fire and forget by design. The sitting is already saved and the student is
 * already looking at their results; an email that cannot be sent must not take
 * the results screen down with it. The failure is recorded on the row by the
 * function itself, so it is visible rather than lost.
 */
export async function emailSectionReport(sectionHistoryId: string | null): Promise<void> {
  if (!sectionHistoryId) return;
  try {
    const { data, error } = await supabase.functions.invoke('send-section-report', {
      body: { sectionHistoryId },
    });
    if (error) throw error;
    if (data && data.ok === false) {
      console.error('[section-report] not sent', data.error);
    }
  } catch (e) {
    console.error('[section-report] invoke failed', e);
  }
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

/**
 * Sat sections — reading `section_history` back out.
 *
 * The table has been written since the first full section shipped and, until
 * now, read by exactly two things: the dashboard's last-five widget and the
 * practice-test scorer. No page ever showed a student the sections they had
 * sat. A section was a screen you got once, at the moment you finished, and
 * never again.
 *
 * This is the reader. A sat section becomes an object with a history: a score,
 * a blind review or the honest absence of one, timing, and — for rows written
 * after `questions_json` started being persisted — the question-by-question
 * record behind the totals.
 *
 * Rows written before that carry `questions_json: []`. They are not broken and
 * they are not empty sections; the detail simply was not kept. {@link hasDetail}
 * is the distinction, so the UI can say so rather than render a blank table.
 */

import { supabase } from '@/integrations/supabase/client';
import type { SectionQuestionStat } from '@/lib/sectionHistorySave';
import type { SectionAnalysis } from '@/lib/sectionAnalysis';
import { buildBlindReviewAnalysisFromSaved, fetchSectionReviewRecords, hasCompletedBlindReview, type SectionReviewRecord } from '@/lib/sectionReviewRecord';
import {
  completedBlindReviewIds,
  readReleasedSectionRows,
  isPracticeTestRunComplete,
} from '@/lib/sectionRelease';

export interface SectionHistoryRow {
  id: string;
  practiceTestRunId: string | null;
  pt: number;
  section: number;
  mode: string | null;
  initialScore: number;
  initialTotal: number;
  initialPercent: number;
  /** null when no blind review was sat. Never 0 — that would be a review scored. */
  brScore: number | null;
  brPercent: number | null;
  brDelta: number | null;
  brUsed: boolean;
  totalTimeMs: number;
  avgTimeMs: number;
  unansweredCount: number;
  byQtype: Record<string, { correct: number; total: number }>;
  byDifficulty: Record<string, { correct: number; total: number }>;
  /** Empty for sections sat before the per-question record was persisted. */
  questions: SectionQuestionStat[];
  /**
   * The diagnosis written at completion. Null for sittings from before the
   * engine existed, which must render as "no report" rather than as an empty
   * one — an empty report reads as "nothing was wrong".
   */
  analysis: SectionAnalysis | null;
  /** Which diagnosis `analysis` is: the one written at close-out, or the one updated after blind review. */
  analysisSource?: 'first-pass' | 'blind-review';
  /** Assigned section: sealed until blind review is complete. */
  releaseRequiresBr?: boolean;
  /** Homework assignment id, when this section belongs to a classroom assignment. */
  assignmentId?: string | null;
  /** Server-owned sitting id for legacy standalone close-outs (used to link journal items). */
  clientSittingId?: string | null;
  /** Saved score guess, from the review record. Null when none was saved. */
  predictedScore?: number | null;
  /** Blind review answers from the review record, when one was completed. */
  brResults?: SectionReviewRecord['brResults'];
  completedAt: string;
}

/** Did this row keep its question-by-question record? */
export const hasDetail = (row: SectionHistoryRow): boolean => row.questions.length > 0;

/** `PT105.S2`, the label 7Sage uses and the one that reads fastest. */
export const sectionLabel = (row: SectionHistoryRow): string =>
  `PT${row.pt}.S${row.section}`;

const asTally = (v: unknown): Record<string, { correct: number; total: number }> =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, { correct: number; total: number }>)
    : {};

const asQuestions = (v: unknown): SectionQuestionStat[] =>
  Array.isArray(v) ? (v as SectionQuestionStat[]) : [];

/**
 * Every section this student has sat, newest first.
 *
 * Filtered on `user_id` rather than `class_id`: the row carries both, and the
 * question "which sections have I sat" is about the person, not the class they
 * happened to be in at the time.
 */
export async function fetchSectionHistory(
  userId: string,
): Promise<SectionHistoryRow[]> {
  return fetchSectionHistoryBy('user_id', userId);
}

/**
 * The same list, addressed by class rather than by user.
 *
 * The teacher workspace knows a student by their class_id — it is what the
 * roster, the classroom items and every assignment are keyed on — and has no
 * reason to hold their auth user id. Reading these rows at all depends on the
 * admin SELECT policy; without it this returns an empty list rather than an
 * error, which is why the teacher surface must never render an empty result
 * as "this student has done nothing".
 */
export async function fetchSectionHistoryByClass(
  classId: string,
): Promise<SectionHistoryRow[]> {
  return fetchSectionHistoryBy('class_id', classId);
}

/** Load one completed section for its owning account, including saved question outcomes. */
export async function fetchOwnedSectionHistoryItem(
  userId: string,
  historyId: string,
): Promise<SectionHistoryRow | null> {
  const result = await fetchOwnedSectionReport(userId, historyId, { standaloneOnly: true });
  return result.state === 'released' ? result.row : null;
}

export type OwnedSectionReportResult =
  | { state: 'not-found' }
  | {
      state: 'sealed';
      reason: 'blind-review' | 'practice-test';
      id: string;
      pt: number;
      section: number;
      completedAt: string;
      /** Ordered qids only (no answers, no scores) so blind review can launch when reason === 'blind-review'. */
      questionQids: string[];
      blindReviewPreparationFailed?: boolean;
    }
  | {
      state: 'released';
      row: SectionHistoryRow;
    };

const NON_OUTCOME_COLUMNS =
  'id,user_id,mode,completed_at,created_at,pt,section,practice_test_run_id,assignment_id,release_requires_br,client_sitting_id';

/**
 * Loads one section for its owning account, preserving the sealed state so
 * `/review/section/:historyId` can show "Section complete" + "Do blind review"
 * without leaking score, first answers, or credited answers.
 *
 * Step 1 selects only non-outcome metadata columns and resolves release before
 * any outcome columns (`initial_score`, `questions_json`, `analysis_json`,
 * `br_*`) are fetched. Fails closed on any lookup error.
 */
export async function fetchOwnedSectionReport(
  userId: string,
  historyId: string,
  { standaloneOnly = false }: { standaloneOnly?: boolean } = {},
): Promise<OwnedSectionReportResult> {
  let query = supabase
    .from('section_history')
    .select(NON_OUTCOME_COLUMNS as '*')
    .eq('id', historyId)
    .eq('user_id', userId)
    .eq('mode', 'full-section')
    .not('completed_at', 'is', null);
  if (standaloneOnly) query = query.is('practice_test_run_id', null);
  const { data: metaRaw, error } = await query.maybeSingle();
  if (error) throw error;
  const meta = metaRaw as Record<string, any> | null;
  if (
    !meta ||
    meta.id !== historyId ||
    meta.user_id !== userId ||
    meta.mode !== 'full-section' ||
    (standaloneOnly && meta.practice_test_run_id != null) ||
    typeof meta.completed_at !== 'string' ||
    !Number.isFinite(Date.parse(meta.completed_at))
  ) {
    return { state: 'not-found' };
  }

  const completedAt = meta.completed_at as string;
  const practiceTestRunId = (meta.practice_test_run_id as string | null) ?? null;
  const releaseRequiresBr = Boolean(meta.release_requires_br);

  // Practice-test leg: verify the parent run is complete; fail closed if unknown.
  let runComplete: boolean | undefined = undefined;
  if (practiceTestRunId) {
    const { data: runData, error: runError } = await supabase
      .from('practice_test_runs' as never)
      .select('status')
      .eq('id', practiceTestRunId)
      .eq('user_id', userId)
      .maybeSingle();
    if (runError) {
      return {
        state: 'sealed',
        reason: 'practice-test',
        id: meta.id,
        pt: meta.pt,
        section: meta.section,
        completedAt,
        questionQids: [],
      };
    }
    const status = (runData as { status?: string } | null)?.status;
    runComplete = isPracticeTestRunComplete(status);
    if (!runComplete) {
      return {
        state: 'sealed',
        reason: 'practice-test',
        id: meta.id,
        pt: meta.pt,
        section: meta.section,
        completedAt,
        questionQids: [],
      };
    }
  }

  if (releaseRequiresBr) {
    let released = false;
    try {
      released = (await completedBlindReviewIds([historyId])).has(historyId);
    } catch (err) {
      console.error('[sectionHistory] review release lookup failed', err);
    }
    if (!released) {
      let questionQids: string[] = [];
      try {
        questionQids = await fetchFrozenBlindReviewQids(historyId);
      } catch (err) {
        console.error('[sectionHistory] blind review preparation failed', err);
      }
      return {
        state: 'sealed',
        reason: 'blind-review',
        id: meta.id,
        pt: meta.pt,
        section: meta.section,
        completedAt,
        questionQids,
        blindReviewPreparationFailed: questionQids.length === 0,
      };
    }
  }

  // Step 2: fetch full outcome columns ONLY after release is confirmed.
  const { data, error: fullError } = await supabase
    .from('section_history')
    .select('*')
    .eq('id', historyId)
    .eq('user_id', userId)
    .eq('mode', 'full-section')
    .not('completed_at', 'is', null)
    .maybeSingle();
  if (fullError) throw fullError;
  if (!data) return { state: 'not-found' };

  let record: SectionReviewRecord | undefined;
  try {
    record = (await fetchSectionReviewRecords([historyId])).get(historyId);
  } catch (err) {
    if (releaseRequiresBr) throw err;
    console.error('[sectionHistory] review record lookup failed', err);
  }

  const merged = applySavedReview(toHistoryRow(data as Record<string, any>), record);

  return { state: 'released', row: merged };
}

/** The database returns only ordered frozen QIDs for the owner of an assigned section. */
export async function fetchFrozenBlindReviewQids(historyId: string): Promise<string[]> {
  const rpc = supabase.rpc as unknown as (
    name: string,
    args: { p_history_id: string },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc.call(supabase, 'section_blind_review_qids_v1', {
    p_history_id: historyId,
  });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data) || !data.every((qid) => typeof qid === 'string' && qid.length > 0)) {
    throw new Error('Saved blind review questions are unavailable.');
  }
  return data;
}

function applySavedReview(row: SectionHistoryRow, record: SectionReviewRecord | undefined): SectionHistoryRow {
  const merged: SectionHistoryRow = { ...row, predictedScore: record?.predictedScore ?? null };
  if (!hasCompletedBlindReview(record)) return merged;

  merged.brUsed = true;
  merged.brScore = record.brScore;
  merged.brPercent = record.brPercent;
  merged.brDelta = record.brDelta;
  merged.brResults = record.brResults;
  const analysis = record.brAnalysis as SectionAnalysis | null
    ?? (row.questions.length > 0
      ? buildBlindReviewAnalysisFromSaved(
          row.questions,
          record.brResults ?? [],
          row.analysis?.totals?.paceMsPerQuestion ?? null,
        )
      : null);
  if (analysis) {
    merged.analysis = analysis;
    merged.analysisSource = 'blind-review';
  }
  return merged;
}

/** True if the signed-in student owns this completed section row (released or sealed). */
export async function ownsSectionHistoryRow(
  userId: string,
  historyId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('section_history')
    .select('id')
    .eq('id', historyId)
    .eq('user_id', userId)
    .eq('mode', 'full-section')
    .not('completed_at', 'is', null)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/**
 * Lays the review record over each row: blind review and its diagnosis only
 * when the record is complete, the prediction on its own. The reader has
 * already resolved release. Older rows keep their historical br_* columns.
 */
async function mergeReviewRecords(rows: SectionHistoryRow[]): Promise<SectionHistoryRow[]> {
  if (rows.length === 0) return rows;
  let records = new Map<string, SectionReviewRecord>();
  try {
    records = await fetchSectionReviewRecords(rows.map((r) => r.id));
  } catch (error) {
    console.error('[sectionHistory] review records unavailable', error);
  }
  return rows.map((row) => applySavedReview(row, records.get(row.id)));
}

function toHistoryRow(r: Record<string, any>): SectionHistoryRow {
  return {
    id: r.id,
    practiceTestRunId: r.practice_test_run_id ?? null,
    pt: r.pt,
    section: r.section,
    mode: r.mode,
    initialScore: r.initial_score ?? 0,
    initialTotal: r.initial_total ?? 0,
    initialPercent: r.initial_percent ?? 0,
    brScore: r.br_used ? r.br_score : null,
    brPercent: r.br_used ? r.br_percent : null,
    brDelta: r.br_used ? r.br_delta : null,
    brUsed: Boolean(r.br_used),
    totalTimeMs: r.total_time_ms ?? 0,
    avgTimeMs: r.avg_time_ms ?? 0,
    unansweredCount: r.unanswered_count ?? 0,
    byQtype: asTally(r.by_qtype_json),
    byDifficulty: asTally(r.by_difficulty_json),
    questions: asQuestions(r.questions_json),
    analysis: (r.analysis_json as SectionAnalysis) ?? null,
    analysisSource: 'first-pass',
    releaseRequiresBr: Boolean(r.release_requires_br),
    assignmentId: (r.assignment_id as string | null) ?? null,
    clientSittingId: (r.client_sitting_id as string | null) ?? null,
    predictedScore: null,
    brResults: null,
    completedAt: r.completed_at ?? r.created_at ?? new Date().toISOString(),
  };
}

async function fetchSectionHistoryBy(
  column: 'user_id' | 'class_id',
  value: string,
): Promise<SectionHistoryRow[]> {
  const rows = await readReleasedSectionRows<Record<string, any> & { id: string }>(
    { column, value, order: 'completed_at' },
    '*',
  );
  return mergeReviewRecords(rows.map(toHistoryRow));
}

export interface SectionSummary {
  sections: number;
  /** Highest percent scored. null when nothing has been sat. */
  bestPercent: number | null;
  bestLabel: string | null;
  averagePercent: number | null;
  totalTimeMs: number;
}

/**
 * Best and average across a set of sections, 7Sage's two headline tiles.
 *
 * Averages the percent rather than the raw score, because sections are not all
 * the same length and a mean of raw scores across a 24 and a 26 is a number
 * that means nothing.
 */
export function summarizeSections(rows: SectionHistoryRow[]): SectionSummary {
  if (rows.length === 0) {
    return {
      sections: 0,
      bestPercent: null,
      bestLabel: null,
      averagePercent: null,
      totalTimeMs: 0,
    };
  }

  const best = rows.reduce((a, b) => (b.initialPercent > a.initialPercent ? b : a));
  const sum = rows.reduce((n, r) => n + r.initialPercent, 0);

  return {
    sections: rows.length,
    bestPercent: best.initialPercent,
    bestLabel: sectionLabel(best),
    averagePercent: Math.round(sum / rows.length),
    totalTimeMs: rows.reduce((n, r) => n + r.totalTimeMs, 0),
  };
}

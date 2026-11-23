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
import { fetchSectionReviewRecords, hasCompletedBlindReview, type SectionReviewRecord } from '@/lib/sectionReviewRecord';
import { sectionReleaseState } from '@/lib/sectionRelease';

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
  const { data, error } = await supabase
    .from('section_history')
    .select('*')
    .eq('id', historyId)
    .eq('user_id', userId)
    .eq('mode', 'full-section')
    .is('practice_test_run_id', null)
    .not('completed_at', 'is', null)
    .maybeSingle();
  if (error) throw error;
  // Detail release requires the persisted completion, never the list reader's
  // created_at/current-time fallback for historical summary rows.
  if (!data || data.id !== historyId || data.user_id !== userId || data.mode !== 'full-section'
    || data.practice_test_run_id != null || typeof data.completed_at !== 'string'
    || !Number.isFinite(Date.parse(data.completed_at))) return null;
  const [merged] = await mergeReviewRecords([toHistoryRow(data as Record<string, any>)]);
  return merged ?? null;
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
): Promise<OwnedSectionReportResult> {
  const { data: metaRaw, error } = await supabase
    .from('section_history')
    .select(NON_OUTCOME_COLUMNS as '*')
    .eq('id', historyId)
    .eq('user_id', userId)
    .eq('mode', 'full-section')
    .not('completed_at', 'is', null)
    .maybeSingle();
  if (error) throw error;
  const meta = metaRaw as Record<string, any> | null;
  if (
    !meta ||
    meta.id !== historyId ||
    meta.user_id !== userId ||
    meta.mode !== 'full-section' ||
    typeof meta.completed_at !== 'string' ||
    !Number.isFinite(Date.parse(meta.completed_at))
  ) {
    return { state: 'not-found' };
  }

  const completedAt = meta.completed_at as string;
  const practiceTestRunId = (meta.practice_test_run_id as string | null) ?? null;
  const releaseRequiresBr = Boolean(meta.release_requires_br);
  const assignmentId = (meta.assignment_id as string | null) ?? null;

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
    runComplete = status === 'complete';
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

  const loadAssignmentQids = async (): Promise<string[]> => {
    if (!assignmentId) return [];
    try {
      const { data: asgData, error: asgErr } = await supabase
        .from('homework_assignments' as never)
        .select('question_qids')
        .eq('id', assignmentId)
        .eq('student_id', userId)
        .maybeSingle();
      if (asgErr || !asgData) return [];
      const qids = (asgData as { question_qids?: unknown }).question_qids;
      return Array.isArray(qids) ? qids.filter((q): q is string => typeof q === 'string') : [];
    } catch {
      return [];
    }
  };

  let record: SectionReviewRecord | undefined;
  try {
    const records = await fetchSectionReviewRecords([meta.id]);
    record = records.get(meta.id);
  } catch (err) {
    console.error('[sectionHistory] review record lookup failed', err);
    if (releaseRequiresBr) {
      return {
        state: 'sealed',
        reason: 'blind-review',
        id: meta.id,
        pt: meta.pt,
        section: meta.section,
        completedAt,
        questionQids: await loadAssignmentQids(),
      };
    }
  }

  if (sectionReleaseState({ practiceTestRunId, releaseRequiresBr }, record, runComplete) === 'sealed') {
    const reason = practiceTestRunId && runComplete !== true ? 'practice-test' : 'blind-review';
    return {
      state: 'sealed',
      reason,
      id: meta.id,
      pt: meta.pt,
      section: meta.section,
      completedAt,
      questionQids: reason === 'blind-review' ? await loadAssignmentQids() : [],
    };
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

  const baseRow = toHistoryRow(data as Record<string, any>);
  const merged: SectionHistoryRow = {
    ...baseRow,
    predictedScore: record?.predictedScore ?? null,
  };
  if (hasCompletedBlindReview(record)) {
    merged.brUsed = true;
    merged.brScore = record.brScore;
    merged.brPercent = record.brPercent;
    merged.brDelta = record.brDelta;
    merged.brResults = record.brResults;
    if (record.brAnalysis) {
      merged.analysis = record.brAnalysis as SectionAnalysis;
      merged.analysisSource = 'blind-review';
    }
  }

  return { state: 'released', row: merged };
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
 * when the record is complete, the prediction on its own. Sealed rows are
 * dropped. Older rows keep their historical br_* columns.
 */
export async function mergeReviewRecords(rows: SectionHistoryRow[]): Promise<SectionHistoryRow[]> {
  if (rows.length === 0) return rows;
  let records = new Map<string, SectionReviewRecord>();
  try {
    records = await fetchSectionReviewRecords(rows.map((r) => r.id));
  } catch (error) {
    // Without records, flagged rows stay sealed and the rest show as before.
    console.error('[sectionHistory] review records unavailable', error);
  }
  const out: SectionHistoryRow[] = [];
  for (const row of rows) {
    const record = records.get(row.id);
    if (sectionReleaseState(row, record) === 'sealed') continue;
    const next: SectionHistoryRow = { ...row, predictedScore: record?.predictedScore ?? null };
    if (hasCompletedBlindReview(record)) {
      next.brUsed = true;
      next.brScore = record.brScore;
      next.brPercent = record.brPercent;
      next.brDelta = record.brDelta;
      next.brResults = record.brResults;
      if (record.brAnalysis) {
        next.analysis = record.brAnalysis as SectionAnalysis;
        next.analysisSource = 'blind-review';
      }
    }
    out.push(next);
  }
  return out;
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
  // `*` rather than a column list, because the generated types are regenerated
  // from the deployed schema and reject `analysis_json` by name until the
  // migration that adds it has been applied. A star select is valid against
  // both, returns the column once it exists, and simply omits it before then —
  // which is exactly what the `?? null` below is for.
  const { data, error } = await supabase
    .from('section_history')
    .select('*')
    .eq(column, value)
    .order('completed_at', { ascending: false });

  if (error) throw error;

  return mergeReviewRecords(((data ?? []) as unknown as Array<Record<string, any>>).map(toHistoryRow));
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

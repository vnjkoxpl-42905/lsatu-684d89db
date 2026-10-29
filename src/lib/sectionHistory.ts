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
  return toHistoryRow(data as Record<string, any>);
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

  return ((data ?? []) as unknown as Array<Record<string, any>>).map(toHistoryRow);
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

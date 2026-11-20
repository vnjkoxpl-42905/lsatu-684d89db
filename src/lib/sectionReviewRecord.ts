/**
 * Prediction and blind review for a saved section (sections rebuild Phase 2).
 *
 * Both live in `section_review_records`, written only through two server
 * functions. `section_history` (first answers) is never updated. Blind review
 * is graded on the server from the saved credited answers, so a late blind
 * review is not affected by later answer-key edits, and it never writes rows
 * into `attempts`.
 */
import { supabase } from '@/integrations/supabase/client';
import { analyseSection } from '@/lib/sectionAnalysis';
import { buildAnalysisInput, buildSectionStats } from '@/lib/sectionHistorySave';
import type { BlindReviewResult, DrillSession } from '@/types/drill';

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const rpc = (fn: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as Rpc).call(supabase, fn, args);

export interface SectionReviewRecord {
  historyId: string;
  predictedScore: number | null;
  brResults: BlindReviewResult[] | null;
  brScore: number | null;
  brTotal: number | null;
  brPercent: number | null;
  brDelta: number | null;
  brAnalysis: unknown | null;
  brCompletedAt: string | null;
}

export async function saveSectionPrediction(historyId: string, score: number): Promise<void> {
  const { error } = await rpc('save_section_prediction_v1', { p_history_id: historyId, p_score: Math.round(score) });
  if (error) throw new Error(error.message);
}

export interface SavedBlindReview {
  status: 'saved' | 'already_saved';
  brScore: number | null;
  brTotal: number | null;
  results: BlindReviewResult[] | null;
}

/**
 * Saves a finished blind review. `session` supplies the diagnosis input only;
 * correctness comes back from the server.
 */
export async function saveSectionBlindReview(
  historyId: string,
  results: BlindReviewResult[],
  session?: DrillSession,
): Promise<SavedBlindReview> {
  const analysis = session
    ? analyseSection(buildAnalysisInput(session, buildSectionStats(session, results), results))
    : null;
  const { data, error } = await rpc('save_section_blind_review_v1', {
    p_history_id: historyId,
    p_answers: results.map((r) => ({
      qid: r.qid,
      brAnswer: r.brAnswer,
      brTimeMs: Math.max(0, Math.round(r.brTimeMs || 0)),
      brRationale: r.brRationale ?? '',
    })),
    p_analysis: analysis,
  });
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    status: d.status as SavedBlindReview['status'],
    brScore: (d.br_score as number | undefined) ?? null,
    brTotal: (d.br_total as number | undefined) ?? null,
    results: (d.br_results as BlindReviewResult[] | undefined) ?? null,
  };
}

type RecordRow = {
  history_id: string;
  predicted_score: number | null;
  br_results: BlindReviewResult[] | null;
  br_score: number | null;
  br_total: number | null;
  br_percent: number | null;
  br_delta: number | null;
  br_analysis_json: unknown | null;
  br_completed_at: string | null;
};

const fromRow = (r: RecordRow): SectionReviewRecord => ({
  historyId: r.history_id,
  predictedScore: r.predicted_score,
  brResults: r.br_results,
  brScore: r.br_score,
  brTotal: r.br_total,
  brPercent: r.br_percent,
  brDelta: r.br_delta,
  brAnalysis: r.br_analysis_json,
  brCompletedAt: r.br_completed_at,
});

/** Records for many history rows at once, keyed by history id. Owner or admin only (RLS). */
export async function fetchSectionReviewRecords(historyIds: string[]): Promise<Map<string, SectionReviewRecord>> {
  const out = new Map<string, SectionReviewRecord>();
  if (historyIds.length === 0) return out;
  const { data, error } = await supabase
    .from('section_review_records' as never)
    .select('history_id,predicted_score,br_results,br_score,br_total,br_percent,br_delta,br_analysis_json,br_completed_at')
    .in('history_id', historyIds);
  if (error) throw error;
  for (const row of (data ?? []) as unknown as RecordRow[]) out.set(row.history_id, fromRow(row));
  return out;
}

/** A blind review record counts only when it is complete and carries results. */
export function hasCompletedBlindReview(record: SectionReviewRecord | null | undefined): record is SectionReviewRecord {
  return !!record?.brCompletedAt && Array.isArray(record.brResults);
}

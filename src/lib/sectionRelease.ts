/**
 * One release rule for a saved section (sections rebuild Phase 3.1).
 *
 * - A practice-test leg is sealed until its run is complete. Readers that
 *   handle legs already apply that against their completed-run set, so this
 *   module takes the run state as an input rather than fetching it.
 * - A row written with `release_requires_br` (an assigned section) is sealed
 *   until its review record has a completed blind review.
 * - Every other row is released. Rows from before the rebuild have no flag
 *   and behave as today.
 */
import { supabase } from '@/integrations/supabase/client';
import { fetchSectionReviewRecords, hasCompletedBlindReview, type SectionReviewRecord } from '@/lib/sectionReviewRecord';

export type ReleaseState = 'sealed' | 'released';

export interface ReleaseInputs {
  practiceTestRunId?: string | null;
  releaseRequiresBr?: boolean | null;
}

export function sectionReleaseState(
  row: ReleaseInputs,
  record: SectionReviewRecord | null | undefined,
  runComplete?: boolean,
): ReleaseState {
  if (row.practiceTestRunId && runComplete === false) return 'sealed';
  if (row.releaseRequiresBr && !hasCompletedBlindReview(record)) return 'sealed';
  return 'released';
}

/**
 * Ids among `ids` that are sealed behind blind review. Throws on a failed
 * lookup; callers treat that as "hide", since the safe failure is not showing
 * an outcome early.
 */
export async function brSealedIds(ids: string[]): Promise<Set<string>> {
  const sealed = new Set<string>();
  if (ids.length === 0) return sealed;
  // `release_requires_br` is newer than the generated types, hence the casts.
  const { data, error } = await supabase
    .from('section_history')
    .select('id')
    .in('id', ids)
    .eq('release_requires_br' as never, true as never);
  if (error) throw error;
  const flagged = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  if (flagged.length === 0) return sealed;
  const records = await fetchSectionReviewRecords(flagged);
  for (const id of flagged) if (!hasCompletedBlindReview(records.get(id))) sealed.add(id);
  return sealed;
}

/** Drops raw `section_history` rows sealed behind blind review. */
export async function withoutBrSealedRows<T extends { id: string }>(rows: T[]): Promise<T[]> {
  if (rows.length === 0) return rows;
  let sealed: Set<string>;
  try {
    sealed = await brSealedIds(rows.map((r) => r.id));
  } catch (error) {
    // Which rows are sealed is unknown, so show none rather than risk
    // revealing an assigned section before its blind review.
    console.error('[sectionRelease] seal lookup failed; hiding rows', error);
    return [];
  }
  return rows.filter((r) => !sealed.has(r.id));
}

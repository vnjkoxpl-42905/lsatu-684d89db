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
import { hasCompletedBlindReview, type SectionReviewRecord } from '@/lib/sectionReviewRecord';

export type ReleaseState = 'sealed' | 'released';

export interface ReleaseInputs {
  practiceTestRunId?: string | null;
  releaseRequiresBr?: boolean | null;
}

const RELEASE_CHUNK_SIZE = 200;

/** Canonical check for a finished Practice Test run (`practice_test_runs.status`). */
export function isPracticeTestRunComplete(status: string | null | undefined): boolean {
  return status === 'complete';
}

export function sectionReleaseState(
  row: ReleaseInputs,
  record: SectionReviewRecord | null | undefined,
  runComplete?: boolean,
): ReleaseState {
  if (row.practiceTestRunId && runComplete !== true) return 'sealed';
  if (row.releaseRequiresBr && !hasCompletedBlindReview(record)) return 'sealed';
  return 'released';
}

/**
 * Among `runIds`, returns the subset whose `practice_test_runs.status = 'complete'`.
 * Fails closed (returns an empty set) on lookup failure so an unverified leg
 * stays hidden rather than leaking.
 */
export async function completedPracticeTestRunIds(runIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(runIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  const completed = new Set<string>();
  if (unique.length === 0) return completed;
  try {
    for (let i = 0; i < unique.length; i += RELEASE_CHUNK_SIZE) {
      const chunk = unique.slice(i, i + RELEASE_CHUNK_SIZE);
      const { data, error } = await supabase
        .from('practice_test_runs' as never)
        .select('id,status')
        .in('id', chunk)
        .eq('status', 'complete');
      if (error) throw error;
      for (const row of (data ?? []) as Array<{ id?: string; status?: string | null }>) {
        if (typeof row.id === 'string' && isPracticeTestRunComplete(row.status)) {
          completed.add(row.id);
        }
      }
    }
    return completed;
  } catch (error) {
    console.error('[sectionRelease] practice-test run lookup failed; hiding legs', error);
    return new Set();
  }
}

/**
 * Client sitting ids among `sittingIds` that are sealed behind blind review.
 * Throws on lookup failure so callers fail closed and hide sitting-linked work.
 */
export async function brSealedSittingIds(sittingIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(sittingIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  const sealed = new Set<string>();
  if (unique.length === 0) return sealed;

  const flagged: Array<{ id: string; sittingId: string }> = [];
  for (let i = 0; i < unique.length; i += RELEASE_CHUNK_SIZE) {
    const chunk = unique.slice(i, i + RELEASE_CHUNK_SIZE);
    const { data, error } = await supabase
      .from('section_history')
      .select('id,client_sitting_id')
      .in('client_sitting_id' as never, chunk as never)
      .eq('release_requires_br' as never, true as never);
    if (error) throw error;
    for (const row of (data ?? []) as Array<{ id?: string; client_sitting_id?: string | null }>) {
      if (typeof row.id === 'string' && typeof row.client_sitting_id === 'string' && row.client_sitting_id.length > 0) {
        flagged.push({ id: row.id, sittingId: row.client_sitting_id });
      }
    }
  }
  if (flagged.length === 0) return sealed;

  const completed = await completedBlindReviewIds(flagged.map((row) => row.id));
  for (const row of flagged) if (!completed.has(row.id)) sealed.add(row.sittingId);
  return sealed;
}

/** Reads the persisted release marker without returning review outcomes. */
export async function completedBlindReviewIds(ids: string[]): Promise<Set<string>> {
  const completed = new Set<string>();
  for (let offset = 0; offset < ids.length; offset += RELEASE_CHUNK_SIZE) {
    const { data, error } = await supabase
      .from('section_review_records' as never)
      .select('history_id')
      .in('history_id', ids.slice(offset, offset + RELEASE_CHUNK_SIZE))
      .not('br_completed_at', 'is', null)
      .contains('br_results', '[]');
    if (error) throw error;
    for (const row of (data ?? []) as Array<{ history_id: string }>) {
      completed.add(row.history_id);
    }
  }
  return completed;
}

interface SectionReadScope {
  column: 'user_id' | 'class_id';
  value: string;
  order: 'id' | 'created_at' | 'completed_at';
  standalone?: boolean;
  limit?: number;
  completedRuns?: ReadonlySet<string>;
}

interface SectionReleaseMetadata {
  id: string;
  practice_test_run_id?: string | null;
  release_requires_br?: boolean | null;
}

/** Page scoped metadata first and request outcomes only for IDs cleared for release. */
export async function readReleasedSectionRows<T extends { id: string }>(
  scope: SectionReadScope,
  outcomeColumns: string,
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = Math.min(scope.limit ?? 500, 500);
  for (let offset = 0; ; offset += pageSize) {
    let metadataQuery = supabase.from('section_history')
      .select('id,practice_test_run_id,release_requires_br')
      .eq(scope.column, scope.value);
    if (scope.standalone) {
      metadataQuery = metadataQuery.eq('mode', 'full-section').is('practice_test_run_id', null);
    }
    const { data, error } = await metadataQuery
      .order(scope.order, { ascending: scope.order === 'id' })
      .order('id')
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as SectionReleaseMetadata[];
    const parentIds = page.flatMap((row) => row.practice_test_run_id ? [row.practice_test_run_id] : []);
    const completedRuns = scope.completedRuns ?? await completedPracticeTestRunIds(parentIds);
    const eligible = page.filter((row) => !row.practice_test_run_id || completedRuns.has(row.practice_test_run_id));

    let reviewed = new Set<string>();
    try {
      reviewed = await completedBlindReviewIds(eligible.filter((row) => row.release_requires_br).map((row) => row.id));
    } catch (error) {
      console.error('[sectionRelease] review completion unavailable; hiding assigned sections', error);
    }

    const ids = eligible
      .filter((row) => !row.release_requires_br || reviewed.has(row.id))
      .map((row) => row.id);
    for (let i = 0; i < ids.length; i += RELEASE_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + RELEASE_CHUNK_SIZE);
      const { data: outcomes, error: outcomeError } = await supabase.from('section_history')
        .select(outcomeColumns)
        .eq(scope.column, scope.value)
        .in('id', chunk);
      if (outcomeError) throw outcomeError;
      const byId = new Map(((outcomes ?? []) as unknown as T[]).map((row) => [row.id, row]));
      for (const id of chunk) {
        const row = byId.get(id);
        if (row) rows.push(row);
      }
    }
    if (page.length < pageSize || (scope.limit !== undefined && offset + pageSize >= scope.limit)) return rows;
  }
}

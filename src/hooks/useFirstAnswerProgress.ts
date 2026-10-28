import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStudentSubjectScope } from '@/hooks/useStudentSubjectScope';
import { loadFirstAnswerLedger } from '@/lib/firstAnswerSources';
import { projectFirstAnswerProgress, type ProgressWindow } from '@/lib/firstAnswerProgress';

export interface FirstAnswerProgressOptions {
  /** A route or capability gate must resolve before any protected ledger read. */
  enabled?: boolean;
  /**
   * Progress opts in to a fresh read on every mount (tabs included). Focus and
   * reconnect refetches stay off so evidence does not clear when the tab regains focus.
   */
  revalidateOnMount?: boolean;
}

/** One calculator for student Progress and Joshua's selected-student Insights. */
export function useFirstAnswerProgress(window: ProgressWindow, selectedStudentId?: string | null, options: FirstAnswerProgressOptions = {}) {
  const resolution = useStudentSubjectScope(selectedStudentId);
  const scope = resolution.state === 'ready' && options.enabled !== false ? resolution.scope : null;
  const revalidate = !!options.revalidateOnMount;
  const query = useQuery({
    queryKey: ['first-answer-ledger', scope?.actorId, scope?.studentId],
    enabled: !!scope,
    staleTime: revalidate ? 0 : 5 * 60_000,
    refetchOnMount: revalidate ? 'always' : true,
    ...(revalidate ? { refetchOnWindowFocus: false, refetchOnReconnect: false } : {}),
    queryFn: () => loadFirstAnswerLedger(scope!),
  });
  // One boundary per successful read: re-renders cannot move it, a refreshed read advances it.
  const dataUpdatedAt = scope && query.data ? query.dataUpdatedAt : 0;
  const asOf = useMemo(() => dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null, [dataUpdatedAt]);
  const progress = useMemo(() => query.data && asOf
    ? projectFirstAnswerProgress({ ...query.data, window, asOf })
    : null, [query.data, window, asOf]);
  const hasData = !!scope && !!query.data;
  return {
    resolution,
    progress: scope ? progress : null,
    ledger: hasData ? query.data : null,
    accountId: hasData ? query.data.ownerId : null,
    asOf: hasData ? asOf : null,
    dataUpdatedAt: hasData ? dataUpdatedAt : null,
    loading: resolution.state === 'loading' || (!!scope && query.isPending),
    fetching: !!scope && query.isFetching,
    error: query.error,
    /** A failed refresh after a successful read: stale data stays visible, so say so. */
    refreshError: hasData && query.isRefetchError ? query.error : null,
    refresh: query.refetch,
  };
}

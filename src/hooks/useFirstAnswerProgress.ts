import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStudentSubjectScope } from '@/hooks/useStudentSubjectScope';
import { loadFirstAnswerLedger } from '@/lib/firstAnswerSources';
import { projectFirstAnswerProgress, type ProgressWindow } from '@/lib/firstAnswerProgress';

/** One calculator for student Progress and Joshua's selected-student Insights. */
export function useFirstAnswerProgress(window: ProgressWindow, selectedStudentId?: string | null) {
  const resolution = useStudentSubjectScope(selectedStudentId);
  const scope = resolution.state === 'ready' ? resolution.scope : null;
  const query = useQuery({
    queryKey: ['first-answer-ledger', scope?.actorId, scope?.studentId],
    enabled: !!scope,
    staleTime: 5 * 60_000,
    queryFn: () => loadFirstAnswerLedger(scope!),
  });
  const progress = useMemo(() => query.data
    ? projectFirstAnswerProgress({ ...query.data, window, asOf: new Date().toISOString() })
    : null, [query.data, window]);
  return {
    resolution,
    progress: scope ? progress : null,
    ledger: scope ? query.data ?? null : null,
    loading: resolution.state === 'loading' || (!!scope && query.isPending),
    error: query.error,
    refresh: query.refetch,
  };
}

import { useQuery } from '@tanstack/react-query';
import { useStudentSubjectScope } from '@/hooks/useStudentSubjectScope';
import { loadScopedStudentWorkSources } from '@/lib/studentScopedWork';
import { studentScopeQueryKey } from '@/lib/studentSubjectScope';

/**
 * Loads the same assignment sources for a student or Joshua's selected-student
 * view. Cache keys include both actor and subject so changing the selection
 * cannot display the previous student's records.
 */
export function useScopedStudentWork(selectedStudentId?: string | null) {
  const resolution = useStudentSubjectScope(selectedStudentId);
  const scope = resolution.state === 'ready' ? resolution.scope : null;
  const query = useQuery({
    queryKey: scope ? studentScopeQueryKey(scope) : ['student-work-scope', 'inactive'],
    enabled: !!scope,
    staleTime: 30_000,
    queryFn: () => loadScopedStudentWorkSources(scope!),
  });
  return {
    resolution,
    sources: scope ? query.data ?? null : null,
    loading: resolution.state === 'loading' || (!!scope && query.isPending),
    error: query.error,
    refresh: query.refetch,
  };
}

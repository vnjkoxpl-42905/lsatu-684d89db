import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { listFlagged, type FlaggedQuestionRow } from '@/lib/flaggedService';

export function flaggedQueryKey(userId: string | undefined) {
  return ['flagged-questions', userId] as const;
}

/**
 * The student's flagged questions, newest first.
 *
 * Callers must keep the three states distinct: only a query that SUCCEEDED
 * with zero rows may render the empty state. A failed fetch has to show the
 * error and a retry, never a calm "nothing flagged".
 */
export function useFlagged() {
  const { user } = useAuth();
  return useQuery<FlaggedQuestionRow[]>({
    queryKey: flaggedQueryKey(user?.id),
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: () => listFlagged(user!.id),
  });
}

/** Write helpers need to invalidate the same key the list reads. */
export function useInvalidateFlagged() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: flaggedQueryKey(user?.id) });
}

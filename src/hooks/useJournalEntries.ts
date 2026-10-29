import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useClassId } from "@/hooks/useClassId";
import {
  getWrongAnswerSmartRows,
  type WrongAnswerSmartRow,
} from "@/lib/journalService";

export function journalEntriesQueryKey(classId: string) {
  return ["journal", "entries", classId] as const;
}

export function useJournalEntries(enabled = true, expectedOwner?: string) {
  const { classId, loading: classLoading } = useClassId();
  const query = useQuery<WrongAnswerSmartRow[]>({
    queryKey: journalEntriesQueryKey(classId),
    enabled: enabled && !classLoading && !!classId && (!expectedOwner || classId === expectedOwner),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: () => getWrongAnswerSmartRows(classId),
  });

  return {
    ...query,
    classId,
    isLoading: classLoading || query.isLoading,
  };
}

export function useInvalidateJournalEntries() {
  const { classId } = useClassId();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: journalEntriesQueryKey(classId),
    });
}

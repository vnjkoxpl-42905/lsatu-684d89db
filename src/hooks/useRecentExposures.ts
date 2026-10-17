import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getRecentExposureSet } from "@/lib/questionExposure";

const EMPTY_SET: Set<string> = new Set();

export function useRecentExposures(windowSize = 500) {
  const { user, authReady } = useAuth();
  const query = useQuery<Set<string>>({
    queryKey: ["question_exposures", user?.id ?? null, windowSize],
    enabled: authReady && !!user,
    queryFn: () => getRecentExposureSet(user!.id, windowSize),
    staleTime: 60_000,
  });
  return {
    excludedQids: query.data ?? EMPTY_SET,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

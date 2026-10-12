import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getLastActivity, type LastActivityRow } from "@/lib/lastActivity";

export function useLastActivity() {
  const { user, authReady } = useAuth();
  return useQuery<LastActivityRow | null>({
    queryKey: ["user_last_activity", user?.id ?? null],
    enabled: authReady && !!user,
    queryFn: () => getLastActivity(user!.id),
    staleTime: 30_000,
  });
}

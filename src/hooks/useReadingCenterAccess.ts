import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { hasReadingCenterAccess } from '@/lib/readingCenterAccess';

/** One account-scoped grant read shared by the reader, Home and its launcher. */
export function useReadingCenterAccess(enabled = true) {
  const { user, authReady } = useAuth();
  const query = useQuery({
    queryKey: ['reading-center-access', user?.id],
    enabled: enabled && authReady && !!user,
    queryFn: hasReadingCenterAccess,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
    retry: false,
  });
  return { ...query, allowed: enabled && !!user && authReady && !query.isPending && !query.isError && query.data === true };
}

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { activityRevocationAvailable } from '../api/activityRevocation';

/** A missing backend keeps controls disabled; account changes get a fresh key. */
export function useActivityRevocationCapability() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['activity-revocation-capability', user?.id],
    enabled: !!user,
    queryFn: () => activityRevocationAvailable(),
    staleTime: 30_000,
  });
  return query.data === true;
}

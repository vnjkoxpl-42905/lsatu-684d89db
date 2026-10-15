import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { resolveStudentSubjectScope } from '@/lib/studentSubjectScope';

/** The selected student is a view target. The signed-in teacher remains actor. */
export function useStudentSubjectScope(selectedStudentId?: string | null) {
  const { user, authReady } = useAuth();
  const permissions = useUserPermissions();
  if (!authReady) return { state: 'loading' } as const;
  return resolveStudentSubjectScope({
    actorId: user?.id,
    selectedStudentId,
    roleLoading: permissions.loading,
    isAdmin: permissions.is_admin,
  });
}

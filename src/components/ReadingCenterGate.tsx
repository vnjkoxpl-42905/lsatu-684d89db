import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import ProtectedRoute from '@/components/ProtectedRoute';
import LockedModule from '@/components/LockedModule';
import { useReadingCenterAccess } from '@/hooks/useReadingCenterAccess';

export default function ReadingCenterGate({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const permissions = useUserPermissions();
  const access = useReadingCenterAccess(!permissions.is_admin);

  if (!authReady || permissions.loading || (!!user && !permissions.is_admin && access.isPending)) {
    return <div role="status" className="flex min-h-screen items-center justify-center">Checking Reading Center access…</div>;
  }
  return <ProtectedRoute allowSignedIn>
    {permissions.is_admin ? children : access.isError
        ? <div role="alert" className="p-6">We could not verify Reading Center access. <button className="underline" onClick={() => void access.refetch()}>Try again</button></div>
        : access.data === true ? children : <LockedModule />}
  </ProtectedRoute>;
}

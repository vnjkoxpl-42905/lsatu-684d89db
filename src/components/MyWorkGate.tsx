import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useReadingCenterAccess } from '@/hooks/useReadingCenterAccess';
import ProtectedRoute from '@/components/ProtectedRoute';
import LockedModule from '@/components/LockedModule';

/** The list opens for Classroom access or a verified Reading Center grant.
 * MyWorkPage narrows the latter account to that one tool. Notes use their own gate. */
export default function MyWorkGate({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const permissions = useUserPermissions();
  const generalAccess = permissions.is_admin || permissions.has_classroom_access;
  const readingCenter = useReadingCenterAccess(!generalAccess);
  // My Work is the student's list. The teacher reads what was assigned, to whom,
  // and how far they got, on the teaching side.
  if (!permissions.loading && permissions.is_admin) return <Navigate to="/teacher/library/assignments" replace />;
  if (!authReady || permissions.loading || (!!user && !generalAccess && readingCenter.isPending)) {
    return <div role="status" className="student-destination-message">Checking assigned work access…</div>;
  }
  return <ProtectedRoute allowSignedIn>
    {generalAccess || readingCenter.allowed ? children : readingCenter.isError
      ? <div role="alert" className="student-destination-message">We could not verify access to assigned work. <button type="button" className="classroom-button" onClick={() => void readingCenter.refetch()}>Try again</button></div>
      : <LockedModule />}
  </ProtectedRoute>;
}

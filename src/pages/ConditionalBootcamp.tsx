import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { ConditionalBootcampRoutes } from '@/bootcamps/conditionals/routes';
import { useConditionalAssignments } from '@/bootcamps/conditionals/useConditionalAssignments';
import '@/bootcamps/main-conclusion/styles/scoped.css';
import '@/bootcamps/conditionals/styles.css';

export default function ConditionalBootcamp() {
  const { user, loading } = useAuth();
  const permissions = useUserPermissions();
  const assignments = useConditionalAssignments(permissions.loading ? undefined : user?.id, permissions.is_admin);
  const location = useLocation();
  if (loading || permissions.loading || (user && assignments.isPending)) return <p role="status">Loading your work...</p>;
  if (!user) return <Navigate to="/auth" replace />;
  if (assignments.isError) return <section className="cb-main"><h1>Your work could not load</h1><p>Please try again.</p><button onClick={() => void assignments.refetch()}>Try again</button></section>;
  if (!location.pathname.startsWith('/bootcamp/conditionals')) return <div className="mc-bootcamp conditional-bootcamp"><section className="cb-main"><h1>Conditional Logic</h1><Link className="cb-button cb-primary" to="/bootcamp/conditionals">Open your work</Link></section></div>;
  return <div className="mc-bootcamp conditional-bootcamp"><ConditionalBootcampRoutes key={user.id} userId={user.id} isAdmin={permissions.is_admin} assignments={assignments.data ?? []} /></div>;
}

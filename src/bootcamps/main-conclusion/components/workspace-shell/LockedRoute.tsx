import { Navigate, useSearchParams } from 'react-router-dom';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { ROUTE_REQUIREMENTS } from '@/bootcamps/main-conclusion/lib/ordering';
import { LockedState } from '@/bootcamps/main-conclusion/components/primitives/LockedState';
import { useUserPermissions } from '@/hooks/useUserPermissions';

/**
 * Per architecture-plan.md §5.3.
 * Wraps any gated route; checks module_progress.unlocked_routes; renders LockedState
 * if not unlocked. The Intro drill path → Simulator gate flows through here.
 */
export function LockedRoute({
  routeId,
  children,
}: {
  routeId: string;
  children: JSX.Element;
}): JSX.Element {
  const { progress } = useModuleProgress();
  const permissions = useUserPermissions();
  const [searchParams] = useSearchParams();
  // Admin-only preview: lets reviewers walk every surface end-to-end without
  // dropping the gate for students.
  const previewOpen = permissions.is_admin && searchParams.get('preview') === '1';
  if (previewOpen) return children;
  if (!progress) return <></>;
  const accessible = progress.unlocked_routes.includes(routeId);
  if (accessible) return children;
  const req = ROUTE_REQUIREMENTS[routeId];
  if (!req) return <Navigate to="/bootcamp/intro-to-lr" replace />;
  return (
    <LockedState
      blockedBy={req.blocker}
      unlockHint={req.hint}
      gotoBlockerHref={`/bootcamp/intro-to-lr/lessons#simulator-assessment`}
    />
  );
}

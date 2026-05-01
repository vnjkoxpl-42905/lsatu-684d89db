import { Navigate } from 'react-router-dom';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { ROUTE_REQUIREMENTS } from '@/bootcamps/main-conclusion/lib/ordering';
import { LockedState } from '@/bootcamps/main-conclusion/components/primitives/LockedState';

/**
 * Per architecture-plan.md §5.3.
 * Wraps any gated route; checks module_progress.unlocked_routes; renders LockedState
 * if not unlocked. The Drill 3.4 → Simulator gate (G2.DRL-3.4) flows through here.
 */
export function LockedRoute({
  routeId,
  children,
}: {
  routeId: string;
  children: JSX.Element;
}): JSX.Element {
  const { progress } = useModuleProgress();
  if (!progress) return <></>;
  const accessible = progress.unlocked_routes.includes(routeId);
  if (accessible) return children;
  const req = ROUTE_REQUIREMENTS[routeId];
  if (!req) return <Navigate to="/bootcamp/structure-v2" replace />;
  return (
    <LockedState
      blockedBy={req.blocker}
      unlockHint={req.hint}
      gotoBlockerHref={`/bootcamp/structure-v2/drills/${req.blocker.replace('MC-DRL-', '')}`}
    />
  );
}

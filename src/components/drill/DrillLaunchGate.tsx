/**
 * Sits in front of the runner and makes sure the address bar says what the
 * student is doing.
 *
 * Two jobs, both of them about surviving a refresh:
 *
 *  1. A short link (`?drill=saved-set&set=…`) arrives. The gate reads it,
 *     fetches whatever row it names, and rewrites the address bar into the long
 *     form the runner already understands.
 *  2. A button hands a drill over in memory with nothing in the address bar,
 *     which is how eight of them still work. The gate names what it was given
 *     and writes that into the address bar instead.
 *
 * Either way the runner is rendered untouched, and a refresh now lands on a URL
 * that can rebuild the run. The rewrite is a `replace`, so Back still goes back
 * where the student came from rather than to a blank drill.
 *
 * This exists so `Drill.tsx` did not have to change. When the runner reads a
 * Drill Launch directly, the second half of this component goes away and the
 * first becomes a plain loader.
 */

import * as React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import {
  DrillLaunchError,
  expandToLegacySearch,
  launchFromRouteState,
  launchNeedsResolution,
  parseDrillLaunch,
  type DrillLaunch,
  type PtLegRef,
} from '@/lib/drillLaunch';
import { resolveDrillLaunch } from '@/lib/drillLaunchResolve';
import { recordExposures } from '@/lib/questionExposure';
import type { DrillRouteState } from '@/lib/drillRouteState';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
}

export default function DrillLaunchGate({ children }: Props) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLoading: questionBankLoading } = useQuestionBank();
  const [failure, setFailure] = React.useState<string | null>(null);

  const isCanonicalLink = !!searchParams.get('drill');

  // What the button passed in memory, if anything. Only consulted when the
  // address bar says nothing, so an already-expanded URL is left alone and the
  // gate cannot loop.
  const stateLaunch = React.useMemo<DrillLaunch | null>(() => {
    if (isCanonicalLink || searchParams.get('mode')) return null;
    const routeState = location.state as (DrillRouteState & { ptRun?: PtLegRef }) | null;
    const launch = launchFromRouteState(routeState, routeState?.ptRun);
    if (!launch) return null;
    // Some callers put the way back in the query string rather than in state
    // (`/drill?returnTo=/flagged`). The rewrite below emits only what the
    // launch names, so carry that param onto the launch or the exit falls back
    // to Classroom Home.
    const queryReturnTo = searchParams.get('returnTo');
    if (queryReturnTo && !launch.options?.returnTo) {
      return { ...launch, options: { ...(launch.options ?? {}), returnTo: queryReturnTo } };
    }
    return launch;
  }, [isCanonicalLink, searchParams, location.state]);

  const hasWorkToDo = isCanonicalLink || !!stateLaunch;
  const canonicalKind = searchParams.get('drill');
  const waitsForQuestionBank =
    isCanonicalLink &&
    (canonicalKind === 'bootcamp-day' || canonicalKind === 'guided-drill');

  React.useEffect(() => {
    if (!hasWorkToDo || (waitsForQuestionBank && questionBankLoading)) return;
    let cancelled = false;

    const run = async () => {
      try {
        const launch = isCanonicalLink ? parseDrillLaunch(searchParams) : stateLaunch;
        if (!launch) return;

        const qids = launchNeedsResolution(launch)
          ? await resolveDrillLaunch(launch, user?.id)
          : undefined;

        if (launch.kind === 'bootcamp-day' && user?.id && qids?.length) {
          void recordExposures(user.id, qids).catch((error) => {
            console.error('[DrillLaunchGate] recordExposures failed', error);
          });
        }

        if (cancelled) return;
        navigate(
          { pathname: '/drill', search: expandToLegacySearch(launch, qids) },
          // `state: null` is load-bearing: it is what stops this effect from
          // seeing the same handover again and rewriting forever.
          { replace: true, state: null },
        );
      } catch (error) {
        if (cancelled) return;
        setFailure(
          error instanceof DrillLaunchError
            ? error.message
            : 'That drill link could not be opened.',
        );
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [hasWorkToDo, waitsForQuestionBank, questionBankLoading, isCanonicalLink, stateLaunch, searchParams, user?.id, navigate]);

  if (failure) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">This drill isn't available</h1>
          <p className="text-sm text-muted-foreground">{failure}</p>
          <Button onClick={() => navigate('/classroom')}>Back to classroom</Button>
        </div>
      </div>
    );
  }

  if (hasWorkToDo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Opening your drill…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

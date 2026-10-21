/**
 * Sits in front of the runner and turns a link into a run.
 *
 * It reads the launch out of the address bar, reads whatever row that launch
 * names, and hands the runner a Drill Run Spec. The address bar keeps the short
 * link it arrived with, so a refresh re-reads the row rather than replaying a
 * question list frozen into a URL.
 *
 * It has one other job. Eight buttons still hand a drill over in memory with
 * nothing in the address bar at all; those runs died on refresh. The gate names
 * what it was given and writes that into the address bar, once, as a `replace`
 * so Back still goes where the student came from.
 *
 * An older link — `?mode=type-drill&qids=…` — is read but never rewritten.
 * Everything such a link says is read in `parseDrillLaunch`, because there is
 * no second reader left to pick up what this one drops.
 */

import * as React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import {
  DrillLaunchError,
  launchDrill,
  launchFromRouteState,
  launchNeedsResolution,
  parseDrillLaunch,
  type DrillHandoverState,
  type DrillLaunch,
  type PtLegRef,
} from '@/lib/drillLaunch';
import { resolveDrillLaunch } from '@/lib/drillLaunchResolve';
import { drillRunSpecFromLaunch, type DrillRunSpec } from '@/lib/drillRunSpec';
import { recordExposures } from '@/lib/questionExposure';
import { Button } from '@/components/ui/button';
import { DrillRunSpecProvider } from '@/components/drill/DrillRunSpecContext';

interface Props {
  children: React.ReactNode;
}

const EMPTY_SPEC: DrillRunSpec = {};

/** Whatever the URL already said that a launch has no opinion about. */
function mergeUnclaimedParams(canonical: string, existing: URLSearchParams): string {
  const merged = new URLSearchParams(canonical);
  existing.forEach((value, key) => {
    if (!merged.has(key)) merged.set(key, value);
  });
  return merged.toString();
}

export default function DrillLaunchGate({ children }: Props) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLoading: questionBankLoading } = useQuestionBank();
  const [failure, setFailure] = React.useState<string | null>(null);
  const [resolved, setResolved] = React.useState<{ key: string; spec: DrillRunSpec } | null>(
    null,
  );

  const namedInUrl = !!searchParams.get('drill') || !!searchParams.get('mode');

  const { launch, parseError } = React.useMemo<{
    launch: DrillLaunch | null;
    parseError: string | null;
  }>(() => {
    try {
      const fromUrl = parseDrillLaunch(searchParams);
      if (fromUrl) return { launch: fromUrl, parseError: null };
    } catch (error) {
      return {
        launch: null,
        parseError:
          error instanceof DrillLaunchError
            ? error.message
            : 'That drill link could not be opened.',
      };
    }

    // Nothing in the address bar. What a button passed in memory, if anything.
    const routeState = location.state as (DrillHandoverState & { ptRun?: PtLegRef }) | null;
    const fromState = launchFromRouteState(routeState, routeState?.ptRun);
    if (!fromState) return { launch: null, parseError: null };
    // Some callers put the way back in the query string rather than in state
    // (`/drill?returnTo=/flagged`). Carry it onto the launch or the exit falls
    // back to Classroom Home.
    const queryReturnTo = searchParams.get('returnTo');
    if (queryReturnTo && !fromState.options?.returnTo) {
      return {
        launch: {
          ...fromState,
          options: { ...(fromState.options ?? {}), returnTo: queryReturnTo },
        },
        parseError: null,
      };
    }
    return { launch: fromState, parseError: null };
  }, [searchParams, location.state]);

  // Stable name for this run. The rewrite below produces the same key, which is
  // what stops the effect from resolving the same launch a second time.
  const launchKey = React.useMemo(() => (launch ? launchDrill(launch) : null), [launch]);

  const needsResolution = !!launch && launchNeedsResolution(launch);
  const waitsForQuestionBank =
    needsResolution && (launch.kind === 'bootcamp-day' || launch.kind === 'guided-drill');

  // The kinds that carry their own questions need no round trip, so they start
  // without a spinner.
  const syncSpec = React.useMemo(
    () => (launch && !needsResolution ? drillRunSpecFromLaunch(launch) : null),
    [launch, needsResolution],
  );

  React.useEffect(() => {
    if (!launch || !launchKey) return;
    if (!needsResolution) return;
    if (resolved?.key === launchKey) return;
    if (waitsForQuestionBank && questionBankLoading) return;
    let cancelled = false;

    const run = async () => {
      try {
        const qids = await resolveDrillLaunch(launch, user?.id);

        if (launch.kind === 'bootcamp-day' && user?.id && qids?.length) {
          void recordExposures(user.id, qids).catch((error) => {
            console.error('[DrillLaunchGate] recordExposures failed', error);
          });
        }

        if (cancelled) return;
        setResolved({ key: launchKey, spec: drillRunSpecFromLaunch(launch, qids) });
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
  }, [
    launch,
    launchKey,
    needsResolution,
    resolved?.key,
    waitsForQuestionBank,
    questionBankLoading,
    user?.id,
  ]);

  // A handover with nothing in the address bar gets one written for it, so the
  // next refresh has something to rebuild the run from.
  React.useEffect(() => {
    if (namedInUrl || !launchKey) return;
    navigate(
      { pathname: '/drill', search: mergeUnclaimedParams(launchKey, searchParams) },
      // `state: null` is load-bearing: it is what stops this effect from seeing
      // the same handover again and rewriting forever.
      { replace: true, state: null },
    );
  }, [namedInUrl, launchKey, searchParams, navigate]);

  const spec = syncSpec ?? (resolved?.key === launchKey ? resolved.spec : null);

  if (failure || parseError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">This drill isn't available</h1>
          <p className="text-sm text-muted-foreground">{failure ?? parseError}</p>
          <Button onClick={() => navigate('/classroom')}>Back to classroom</Button>
        </div>
      </div>
    );
  }

  if (launch && !spec) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Opening your drill…
        </div>
      </div>
    );
  }

  return <DrillRunSpecProvider spec={spec ?? EMPTY_SPEC}>{children}</DrillRunSpecProvider>;
}

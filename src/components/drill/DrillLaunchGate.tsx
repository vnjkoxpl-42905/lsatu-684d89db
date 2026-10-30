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
import { loadStandaloneDrillRun } from '@/lib/drillRunLedger';
import { standaloneDrillResumeSpec } from '@/lib/standaloneDrillResumeSpec';
import { drillRunSpecFromLaunch, type DrillRunSpec } from '@/lib/drillRunSpec';
import { recordExposures } from '@/lib/questionExposure';
import { Button } from '@/components/ui/button';
import { DrillRunSpecProvider } from '@/components/drill/DrillRunSpecContext';
import { manualSectionCoverage, manualSectionsEnabled, newManualSectionHref, sectionPace, timedSectionResumeHref } from '@/lib/timedSectionAdoption';

interface Props {
  children: React.ReactNode;
  /** Resolved by an enclosing authorized activity. Never supplied from a raw URL. */
  launch?: DrillLaunch;
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

export default function DrillLaunchGate({ children, launch: embeddedLaunch }: Props) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const { isLoading: questionBankLoading } = useQuestionBank();
  const [failure, setFailure] = React.useState<string | null>(null);
  const [resolved, setResolved] = React.useState<{ key: string; spec: DrillRunSpec } | null>(
    null,
  );

  const namedInUrl = !!embeddedLaunch || !!searchParams.get('drill') || !!searchParams.get('mode');

  const { launch, parseError } = React.useMemo<{
    launch: DrillLaunch | null;
    parseError: string | null;
  }>(() => {
    if (embeddedLaunch) return { launch: embeddedLaunch, parseError: null };
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
  }, [searchParams, location.state, embeddedLaunch]);

  // Stable name for this run. The rewrite below produces the same key, which is
  // what stops the effect from resolving the same launch a second time.
  const launchKey = React.useMemo(() => (launch ? launchDrill(launch) : null), [launch]);
  const requestedGuidedRunId = launch?.kind === 'guided-drill' ? searchParams.get('run') : null;
  const requestedStandaloneRunId = launch && ['questions', 'filter', 'smart-drill', 'saved-set'].includes(launch.kind)
    ? searchParams.get('run') : null;
  const resolutionKey = `${user?.id ?? ''}:${launchKey ?? ''}:${requestedGuidedRunId ?? requestedStandaloneRunId ?? ''}`;
  const protectedResume = embeddedLaunch ? null : searchParams.get('timedSectionSittingId');
  const eligible = launch?.kind === 'section' && !launch.ptLeg && !launch.sealed &&
    !searchParams.has('assignment') && !searchParams.has('assignmentId') && !searchParams.has('legacySectionResume') &&
    manualSectionCoverage('lr', launch.pt, launch.section);
  const pace = launch?.kind === 'section' ? sectionPace(launch.timerMode === 'unlimited' ? null :
    launch.timerMode === '52.5' ? 52.5 : launch.timerMode === '70' ? 70 : launch.timerMode === 'custom' ? -1 : 35) : null;
  const [adoption, setAdoption] = React.useState<{ key: string; redirect: boolean } | null>(null);
  const checkingAdoption = !!eligible && !!pace && adoption?.key !== resolutionKey;
  React.useEffect(() => {
    let cancelled = false;
    if (protectedResume) {
      try { navigate(timedSectionResumeHref(protectedResume), { replace: true, state: null }); }
      catch { setFailure('The saved section identity is invalid.'); }
      return;
    }
    if (!eligible || !pace || launch?.kind !== 'section') return;
    void manualSectionsEnabled(user?.id).then(enabled => {
      if (cancelled) return;
      if (enabled) navigate(newManualSectionHref('lr', launch.pt, launch.section, pace), { replace: true, state: null });
      setAdoption({ key: resolutionKey, redirect: enabled });
    });
    return () => { cancelled = true; };
  }, [eligible, pace, launch, protectedResume, resolutionKey, user?.id, navigate]);

  const needsResolution = !!launch && (launchNeedsResolution(launch) || !!requestedStandaloneRunId);
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
    if (resolved?.key === resolutionKey) return;
    if (waitsForQuestionBank && questionBankLoading) return;
    // A saved-drill link proves itself against the account, so it must wait
    // for sign-in to finish restoring. Treating a still-loading session as
    // signed out flashes "This drill isn't available" on every cold open.
    if (requestedStandaloneRunId && !authReady) return;
    let cancelled = false;
    setFailure(null);

    const run = async () => {
      try {
        if (requestedStandaloneRunId) {
          if (!user?.id) throw new DrillLaunchError('Sign in to open your saved drill.');
          const run = await loadStandaloneDrillRun(user.id, requestedStandaloneRunId);
          if (!run) throw new DrillLaunchError('This saved drill was not found in your account.');
          const spec = standaloneDrillResumeSpec(run);
          if (!cancelled) setResolved({ key: resolutionKey, spec });
          return;
        }
        const qids = requestedGuidedRunId
          ? await resolveDrillLaunch(launch, user?.id, requestedGuidedRunId)
          : await resolveDrillLaunch(launch, user?.id);

        if (launch.kind === 'bootcamp-day' && user?.id && qids?.length) {
          void recordExposures(user.id, qids).catch((error) => {
            console.error('[DrillLaunchGate] recordExposures failed', error);
          });
        }

        if (cancelled) return;
        setResolved({ key: resolutionKey, spec: drillRunSpecFromLaunch(launch, qids) });
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
    resolutionKey,
    requestedGuidedRunId,
    requestedStandaloneRunId,
    needsResolution,
    resolved?.key,
    waitsForQuestionBank,
    questionBankLoading,
    user?.id,
    authReady,
  ]);

  // A handover with nothing in the address bar gets one written for it, so the
  // next refresh has something to rebuild the run from.
  React.useEffect(() => {
    if (namedInUrl || !launchKey || checkingAdoption || protectedResume || adoption?.redirect) return;
    navigate(
      { pathname: '/drill', search: mergeUnclaimedParams(launchKey, searchParams) },
      // `state: null` is load-bearing: it is what stops this effect from seeing
      // the same handover again and rewriting forever.
      { replace: true, state: null },
    );
  }, [namedInUrl, launchKey, searchParams, navigate, checkingAdoption, protectedResume, adoption?.redirect]);

  const spec = syncSpec ?? (resolved?.key === resolutionKey ? resolved.spec : null);

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

  if (protectedResume || checkingAdoption || adoption?.key === resolutionKey && adoption.redirect || launch && !spec) {
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

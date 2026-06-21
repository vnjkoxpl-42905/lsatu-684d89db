import React from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  getAssignment,
  getGuidedDrillBySlug,
  markCardRead,
  markStarted,
  resolveExactGuidedDrillQids,
  resolveGuidedDrillPool,
  type GuidedDrill,
  type GuidedDrillAssignment,
} from '@/lib/guidedDrills';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { questionBank } from '@/lib/questionLoader';
import {
  findGuidedDrillHtmlByDrill,
  findGuidedDrillHtmlBySlug,
} from '@/data/guidedDrillHtmlManifest';
import { toast } from 'sonner';
import type { TypeDrillConfig } from '@/types/drill';
import {
  getPracticePool,
  type PracticePool,
} from '@/bootcamps/main-conclusion/data/practiceDrillPools';

type AssignmentWithDrill = GuidedDrillAssignment & { guided_drill: GuidedDrill };

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/classroom';
  return value;
}

export interface GuidedDrillStartProps {
  /** When embedded (not routed), the drill slug to render. Falls back to the URL param. */
  slug?: string;
  /** When embedded, the assignment id to render. Falls back to the URL param. */
  assignmentId?: string;
  /** When embedded, called instead of navigating away on return. */
  onReturn?: () => void;
}

export default function GuidedDrillStart({
  slug: slugProp,
  assignmentId: assignmentIdProp,
  onReturn,
}: GuidedDrillStartProps = {}) {
  const params = useParams<{ assignmentId?: string; slug?: string }>();
  const assignmentId = assignmentIdProp ?? params.assignmentId;
  const slug = slugProp ?? params.slug;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: qbLoading } = useQuestionBank();

  const stateBootcampOverride = (location.state as any)?.bootcampOverride as PracticePool | undefined;
  const slugBootcampOverride = slug ? getPracticePool(slug) : undefined;
  const bootcampOverride: PracticePool | undefined = stateBootcampOverride ?? slugBootcampOverride;

  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const cleanupIframeListenersRef = React.useRef<(() => void) | null>(null);
  const [assignment, setAssignment] = React.useState<AssignmentWithDrill | null>(null);
  const [directDrill, setDirectDrill] = React.useState<GuidedDrill | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    setAssignment(null);
    setDirectDrill(null);

    if (assignmentId) {
      getAssignment(assignmentId).then((a) => {
        setAssignment(a as AssignmentWithDrill | null);
        setLoading(false);
      }).catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : 'Failed to load assignment');
        setLoading(false);
      });
      return;
    }

    if (slug) {
      getGuidedDrillBySlug(slug).then((drill) => {
        setDirectDrill(drill);
        setLoading(false);
      }).catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : 'Failed to load guided drill');
        setLoading(false);
      });
      return;
    }

    setLoading(false);
  }, [assignmentId, slug]);

  const drill = assignment?.guided_drill ?? directDrill;
  const launchPage = React.useMemo(() => (
    findGuidedDrillHtmlByDrill(drill) ?? findGuidedDrillHtmlBySlug(slug)
  ), [drill, slug]);

  // Pool size for the native launch fallback (drills without a curated HTML page).
  const fallbackPoolSize = React.useMemo(() => {
    if (launchPage || !drill || qbLoading) return null;
    return resolveGuidedDrillPool(drill.bank_filter).length;
  }, [launchPage, drill, qbLoading]);

  const handleReturn = React.useCallback(() => {
    if (onReturn) {
      onReturn();
      return;
    }
    navigate(safeReturnPath(searchParams.get('returnTo')));
  }, [onReturn, navigate, searchParams]);

  const handleStart = React.useCallback(async () => {
    if (!drill && !bootcampOverride) return;
    if (qbLoading) {
      toast.info('Loading question bank...');
      return;
    }

    // Intro to LR practice drills — use prebuilt MAIN_CONCLUSION_PRACTICE_POOLS qids.
    if (bootcampOverride && bootcampOverride.source === 'intro-to-lr-practice-drills') {
      const ov = bootcampOverride;
      const feature = ov.qfeatures[0];

      if (!Array.isArray(ov.qids) || ov.qids.length === 0) {
        toast.error(
          `Practice drill pool is missing or empty for ${ov.slug}. Expected qtype = Main Conclusion, feature = ${feature}, count = ${ov.count}.`,
        );
        return;
      }

      const known = new Set(questionBank.getAllQuestions().map((q) => q.qid));
      const validQids = ov.qids.filter((qid) => known.has(qid));
      const invalidQids = ov.qids.filter((qid) => !known.has(qid));

      // eslint-disable-next-line no-console
      console.log('[intro-to-lr-practice-drills] launch', {
        slug: ov.slug,
        title: ov.title,
        qtypes: ov.qtypes,
        qfeatures: ov.qfeatures,
        difficulties: ov.difficulties,
        count: ov.count,
        poolQids: ov.qids,
        validQids,
        invalidQids,
      });

      if (invalidQids.length > 0) {
        toast.error('Practice drill pool contains invalid qids. Check practiceDrillPools.ts.');
        return;
      }

      if (assignment) {
        await markCardRead(assignment.id);
        await markStarted(assignment.id);
      }

      const params = new URLSearchParams();
      params.set('mode', 'type-drill');
      params.set('qids', validQids.join(','));
      params.set('returnTo', ov.returnTo);
      params.set('focus', ov.title);
      params.set('source', ov.source);
      navigate(`/drill?${params.toString()}`);
      return;
    }

    let selectedQids: string[];
    if ((bootcampOverride as any)?.selectedQids) {
      selectedQids = (bootcampOverride as any).selectedQids;
    } else if (drill) {
      const knownQids = new Set(questionBank.getAllQuestions().map((q) => q.qid));
      const exactQids = resolveExactGuidedDrillQids(drill, assignment, knownQids);
      if (exactQids.length > 0) {
        selectedQids = exactQids;
      } else {
        const pool = resolveGuidedDrillPool(drill.bank_filter);
        if (pool.length === 0) {
          toast.error('No matching questions found for this drill.');
          return;
        }
        const want = drill.question_count ?? Math.min(pool.length, 10);
        selectedQids = [...pool].sort(() => Math.random() - 0.5).slice(0, want).map((q) => q.qid);
      }
    } else {
      return;
    }

    if (assignment) {
      await markCardRead(assignment.id);
      await markStarted(assignment.id);
    }

    const config: TypeDrillConfig = {
      qtypes: drill?.question_types || (bootcampOverride as any)?.qtypes || ['Main Conclusion'],
      difficulties: [],
      pts: [],
      count: selectedQids.length,
      selectedQids,
      unseen_only: false,
    };

    const drillSearchParams = new URLSearchParams();
    drillSearchParams.set('mode', 'type-drill');
    drillSearchParams.set('qids', selectedQids.join(','));
    drillSearchParams.set('returnTo', (bootcampOverride as any)?.returnTo ?? safeReturnPath(searchParams.get('returnTo')));
    if ((bootcampOverride as any)?.title ?? drill?.title) {
      drillSearchParams.set('focus', (bootcampOverride as any)?.title ?? drill!.title);
    }
    if ((bootcampOverride as any)?.source) {
      drillSearchParams.set('source', (bootcampOverride as any).source);
    }
    if (assignment) drillSearchParams.set('guidedAssignmentId', assignment.id);

    navigate(`/drill?${drillSearchParams.toString()}`, {
      state: {
        mode: 'type-drill',
        config,
        practicingLabel: (bootcampOverride as any)?.title ?? drill?.title,
      },
    });
  }, [assignment, drill, navigate, qbLoading, searchParams, location.state, bootcampOverride]);

  const wireIframeControls = React.useCallback(() => {
    cleanupIframeListenersRef.current?.();
    cleanupIframeListenersRef.current = null;

    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      if (target.closest('[data-start-drill="true"]')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        void handleStart();
        return;
      }

      if (target.closest('[data-return="true"]')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        handleReturn();
      }
    };

    doc.addEventListener('click', onClick, true);
    cleanupIframeListenersRef.current = () => doc.removeEventListener('click', onClick, true);
  }, [handleReturn, handleStart]);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'lsatu:start-guided-drill') void handleStart();
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleStart]);

  React.useEffect(() => () => cleanupIframeListenersRef.current?.(), []);

  if (loading) {
    return <div className="min-h-screen bg-background text-foreground p-8">Loading...</div>;
  }

  if (!drill && !bootcampOverride) {
    return <div className="min-h-screen bg-background text-foreground p-8">Guided drill not found.</div>;
  }

  // No curated HTML launch page for this drill — render a native launch card
  // that starts the drill straight from its question pool.
  if (!launchPage) {
    if (!drill) {
      return <div className="min-h-screen bg-background text-foreground p-8">Guided drill not found.</div>;
    }

    const want = drill.question_count ?? 0;
    const poolShort = fallbackPoolSize != null && want > 0 && fallbackPoolSize < want;
    const canStart = qbLoading || fallbackPoolSize == null || fallbackPoolSize > 0;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8 text-foreground">
        <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 shadow-sm">
          {drill.category && (
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {drill.category}
            </div>
          )}
          <h1 className="mt-1 text-2xl font-bold">{drill.title}</h1>

          <div className="mt-4 flex flex-wrap gap-2">
            {drill.reasoning_types?.map((r) => (
              <span key={r} className="rounded border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {r}
              </span>
            ))}
            {drill.question_types?.map((q) => (
              <span key={q} className="rounded border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                {q}
              </span>
            ))}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Questions</dt>
              <dd className="font-semibold">{want > 0 ? want : '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Available in bank</dt>
              <dd className="font-semibold">
                {fallbackPoolSize == null ? 'Loading…' : fallbackPoolSize}
              </dd>
            </div>
            {drill.estimated_minutes != null && (
              <div>
                <dt className="text-muted-foreground">Estimated time</dt>
                <dd className="font-semibold">{drill.estimated_minutes} min</dd>
              </div>
            )}
          </dl>

          {poolShort && (
            <p className="mt-4 text-xs text-amber-600">
              Only {fallbackPoolSize} of {want} questions are available in the bank. The drill will run with
              what's available.
            </p>
          )}

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              disabled={!canStart}
              onClick={() => void handleStart()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {qbLoading ? 'Loading question bank…' : 'Start drill'}
            </button>
            <button
              type="button"
              onClick={handleReturn}
              className="inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={launchPage.htmlPath}
      title={`${launchPage.title} launch page`}
      className="block h-screen w-full border-0 bg-background"
      onLoad={wireIframeControls}
    />
  );
}

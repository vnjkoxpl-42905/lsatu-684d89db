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

type AssignmentWithDrill = GuidedDrillAssignment & { guided_drill: GuidedDrill };

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/classroom';
  return value;
}

export default function GuidedDrillStart() {
  const { assignmentId, slug } = useParams<{ assignmentId?: string; slug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: qbLoading } = useQuestionBank();
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

  const bootcampOverride = (location.state as any)?.bootcampOverride;

  const handleReturn = React.useCallback(() => {
    navigate(safeReturnPath(searchParams.get('returnTo')));
  }, [navigate, searchParams]);

  const handleStart = React.useCallback(async () => {
    if (!drill && !bootcampOverride) return;
    if (qbLoading) {
      toast.info('Loading question bank...');
      return;
    }

    let selectedQids: string[];
    if (bootcampOverride?.selectedQids) {
      selectedQids = bootcampOverride.selectedQids;
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
      qtypes: drill?.question_types || bootcampOverride?.qtypes || ['Main Conclusion'],
      difficulties: [],
      pts: [],
      count: selectedQids.length,
      selectedQids,
      unseen_only: false,
    };

    const drillSearchParams = new URLSearchParams();
    drillSearchParams.set('returnTo', bootcampOverride?.returnTo ?? safeReturnPath(searchParams.get('returnTo')));
    if (assignment) drillSearchParams.set('guidedAssignmentId', assignment.id);

    navigate(`/drill?${drillSearchParams.toString()}`, {
      state: { mode: 'type-drill', config },
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

  if (!launchPage) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        Approved launch page not found.
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

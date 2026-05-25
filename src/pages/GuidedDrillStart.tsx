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

const BOOTCAMP_GUIDED_DRILL_OVERRIDES = {
  'first-sentence-conclusions': {
    qtypes: ['Main Conclusion'],
    qfeatures: ['First Sentence Conclusion'],
    difficulties: [1, 2, 3, 4, 5],
    pts: [],
    count: 6,
    title: 'First-Sentence Main Conclusion',
    returnTo: '/bootcamp/intro-to-lr/practice-drills',
    source: 'intro-to-lr-practice-drills',
  },
  'rebuttal-conclusions': {
    qtypes: ['Main Conclusion'],
    qfeatures: ['Rebuttals'],
    difficulties: [1, 2, 3, 4, 5],
    pts: [],
    count: 4,
    title: 'Rebuttal Main Conclusion',
    returnTo: '/bootcamp/intro-to-lr/practice-drills',
    source: 'intro-to-lr-practice-drills',
  },
} as const;

export default function GuidedDrillStart() {
  const { assignmentId, slug } = useParams<{ assignmentId?: string; slug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: qbLoading } = useQuestionBank();

  const stateBootcampOverride = (location.state as any)?.bootcampOverride;
  const slugBootcampOverride = slug ? BOOTCAMP_GUIDED_DRILL_OVERRIDES[slug as keyof typeof BOOTCAMP_GUIDED_DRILL_OVERRIDES] : undefined;
  const bootcampOverride = stateBootcampOverride ?? slugBootcampOverride;

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

  const handleReturn = React.useCallback(() => {
    navigate(safeReturnPath(searchParams.get('returnTo')));
  }, [navigate, searchParams]);

  const handleStart = React.useCallback(async () => {
    if (!drill && !bootcampOverride) return;
    if (qbLoading) {
      toast.info('Loading question bank...');
      return;
    }

    // Intro to LR practice drills — Smart Drill TypeDrillConfig format
    if (bootcampOverride && (bootcampOverride as any).source === 'intro-to-lr-practice-drills') {
      const ov = bootcampOverride as {
        qtypes: string[];
        qfeatures: string[];
        difficulties: number[];
        pts: number[];
        count: number;
        title: string;
        returnTo: string;
        source: string;
      };

      if (!Array.isArray(ov.qtypes) || ov.qtypes.length === 0 ||
          !Array.isArray(ov.qfeatures) || ov.qfeatures.length === 0 ||
          !Array.isArray(ov.difficulties) || ov.difficulties.length === 0 ||
          typeof ov.count !== 'number' || ov.count <= 0) {
        toast.error('Invalid drill configuration: missing required metadata.');
        return;
      }

      const all = questionBank.getAllQuestions();
      const matched = all
        .filter((q) => ov.qtypes.includes(q.qtype as string))
        .filter((q) => Array.isArray(q.questionFeatures) && q.questionFeatures.some((f) => ov.qfeatures.includes(f)))
        .filter((q) => ov.difficulties.includes(q.difficulty as number))
        .sort((a, b) => (a.difficulty ?? 99) - (b.difficulty ?? 99));

      const selected = matched.slice(0, ov.count);

      // eslint-disable-next-line no-console
      console.log('[intro-to-lr-practice-drills] launch', {
        drillTitle: ov.title,
        qtypesUsed: ov.qtypes,
        qfeaturesUsed: ov.qfeatures,
        difficultiesUsed: ov.difficulties,
        requestedCount: ov.count,
        totalMatchesFound: matched.length,
        selectedQids: selected.map((q) => q.qid),
        selectedDifficulties: selected.map((q) => q.difficulty),
      });

      if (selected.length === 0) {
        toast.error(`No questions found for this drill. Filter attempted: qtype = Main Conclusion, feature = [${ov.qfeatures.join(', ')}], difficulties = [${ov.difficulties.join(',')}], requested count = ${ov.count}, matches found = 0.`);
        return;
      }

      if (selected.length < ov.count) {
        toast.warning(`Only ${selected.length} matching questions found. Requested ${ov.count}. Launching available questions.`);
      }

      if (assignment) {
        await markCardRead(assignment.id);
        await markStarted(assignment.id);
      }

      const qids = selected.map((q) => q.qid).join(',');
      const params = new URLSearchParams();
      params.set('mode', 'type-drill');
      params.set('qids', qids);
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

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
import { getLocalGuidedDrillBySlug, isEmptyBankFilter } from '@/lib/guidedDrillsLocal';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { questionBank } from '@/lib/questionLoader';
import {
  findGuidedDrillHtmlByDrill,
  findGuidedDrillHtmlBySlug,
} from '@/data/guidedDrillHtmlManifest';
import { GuidedDrillLaunchFrame } from '@/components/drill/GuidedDrillLaunchFrame';
import { buildGuidedDrillLaunchHtml } from '@/lib/guidedDrillLaunch';
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

/**
 * Merge a DB drill row with the bundled local definition so a guided drill
 * launches even when the live row is missing or its bank_filter is empty:
 *   - no DB row → use the local definition outright
 *   - DB row with empty/absent bank_filter → backfill it (and question_count)
 *     from the local seed; otherwise keep the DB row as-is.
 */
function reconcileWithLocal(drill: GuidedDrill | null, slug: string): GuidedDrill | null {
  const local = getLocalGuidedDrillBySlug(slug);
  if (!drill) return local;
  if (!local) return drill;
  if (isEmptyBankFilter(drill.bank_filter)) {
    return {
      ...drill,
      bank_filter: local.bank_filter,
      question_count: drill.question_count ?? local.question_count,
    };
  }
  return drill;
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
        // Fall back to the bundled definition when the DB row is missing, and
        // backfill an empty/absent bank_filter from the local seed so the pool
        // can still resolve client-side. Keeps launches working even when the
        // live guided_drills row is incomplete or undeployed.
        setDirectDrill(reconcileWithLocal(drill, slug));
        setLoading(false);
      }).catch((e: unknown) => {
        const local = getLocalGuidedDrillBySlug(slug);
        if (local) {
          setDirectDrill(local);
        } else {
          toast.error(e instanceof Error ? e.message : 'Failed to load guided drill');
        }
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
    if (!drill && !bootcampOverride) {
      // eslint-disable-next-line no-console
      console.error('[guided-drill] start blocked: no drill or override resolved', { slug });
      toast.error("Couldn't load this drill. Please refresh and try again.");
      return;
    }
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
      // Carry the pool slug so /drill can mark this practice set complete in
      // module progress when the student finishes (see runner path-completion).
      params.set('practiceSlug', ov.slug);
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
      // eslint-disable-next-line no-console
      console.error('[guided-drill] start blocked: no qids resolved', { slug });
      toast.error("Couldn't build this drill. Please refresh and try again.");
      return;
    }

    if (!selectedQids || selectedQids.length === 0) {
      toast.error('No questions are available for this drill yet.');
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
  }, [assignment, drill, navigate, qbLoading, searchParams, location.state, bootcampOverride, slug]);

  if (loading) {
    return <div className="min-h-screen bg-background text-foreground p-8">Loading...</div>;
  }

  if (!drill && !bootcampOverride) {
    return <div className="min-h-screen bg-background text-foreground p-8">Guided drill not found.</div>;
  }

  // No curated HTML launch page for this drill — build the identical premium
  // launch page from the drill's stored instruction_card content so every drill
  // renders in the same format (serif hero, black START card, notes drawer).
  if (!launchPage) {
    if (!drill) {
      return <div className="min-h-screen bg-background text-foreground p-8">Guided drill not found.</div>;
    }

    const count =
      drill.question_qids?.length ||
      drill.question_count ||
      fallbackPoolSize ||
      0;

    const html = buildGuidedDrillLaunchHtml({
      title: drill.title,
      estimatedMinutes: drill.estimated_minutes,
      questionCount: count,
      leftMd: drill.instruction_card?.left_md ?? null,
      rightMd: drill.instruction_card?.right_md ?? null,
    });

    return (
      <GuidedDrillLaunchFrame
        html={html}
        title={drill.title}
        onStart={() => void handleStart()}
        onReturn={handleReturn}
      />
    );
  }

  return (
    <GuidedDrillLaunchFrame
      src={launchPage.htmlPath}
      title={launchPage.title}
      onStart={() => void handleStart()}
      onReturn={handleReturn}
    />
  );
}

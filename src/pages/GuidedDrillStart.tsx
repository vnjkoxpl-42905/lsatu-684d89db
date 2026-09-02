import React from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  getAssignment,
  getGuidedDrillBySlug,
  markCardRead,
  markStarted,
  resolveGuidedDrillPool,
  resolveGuidedDrillQidsForLevel,
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
import { useAuth } from '@/contexts/AuthContext';
import { loadPracticeSession } from '@/bootcamps/main-conclusion/lib/practiceSessionStore';
import {
  buildGuidedLaunchReturnPath,
  parseGuidedResumeIndex,
  parseGuidedResumeQids,
  safeGuidedReturnPath,
  GUIDED_DRILLS_HOME_RETURN_TO,
} from '@/lib/guidedDrillNavigation';
import {
  guidedSessionKey,
  guidedResumeNotice,
  loadGuidedDrillSession,
  loadCompletedGuidedDrillSession,
  guidedSessionToDrillSession,
  type GuidedDrillSession,
} from '@/lib/guidedDrillSession';
import { PracticeSetResults } from '@/components/drill/PracticeSetResults';
import type { DrillSession } from '@/types/drill';
import { launchDrill } from '@/lib/drillLaunch';

type AssignmentWithDrill = GuidedDrillAssignment & { guided_drill: GuidedDrill };

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
  const { user } = useAuth();

  const stateBootcampOverride = (location.state as any)?.bootcampOverride as PracticePool | undefined;
  const slugBootcampOverride = slug ? getPracticePool(slug) : undefined;
  const bootcampOverride: PracticePool | undefined = stateBootcampOverride ?? slugBootcampOverride;
  const originReturnTo = safeGuidedReturnPath(
    searchParams.get('returnTo'),
    GUIDED_DRILLS_HOME_RETURN_TO,
  );
  const resumeQids = React.useMemo(
    () => parseGuidedResumeQids(searchParams.get('resumeQids')),
    [searchParams],
  );
  const resumeIndex = React.useMemo(
    () => parseGuidedResumeIndex(searchParams.get('resumeIndex'), resumeQids),
    [searchParams, resumeQids],
  );
  const launchReturnTo = React.useMemo(
    () => buildGuidedLaunchReturnPath({
      assignmentId,
      slug,
      originReturnTo,
    }),
    [assignmentId, slug, originReturnTo],
  );

  // Keys this drill's durable resume row. Assignment id when there is one, so a
  // re-assignment of the same drill later gets its own clean run.
  const guidedKey = React.useMemo(
    () => guidedSessionKey({ assignmentId, slug }),
    [assignmentId, slug],
  );

  // An unfinished guided run is loaded before Start so its frozen question queue
  // can be reused. Without this the level draw runs again on re-entry and
  // reshuffles the pool, which is what makes a guided drill look like it
  // "restarted" — the student gets different questions, not just question 1.
  const [storedGuided, setStoredGuided] = React.useState<GuidedDrillSession | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    setStoredGuided(null);
    if (!user || !guidedKey || bootcampOverride) return;
    void loadGuidedDrillSession(user.id, guidedKey).then((stored) => {
      if (cancelled) return;
      setStoredGuided(stored && stored.status === 'in_progress' ? stored : null);
    });
    return () => {
      cancelled = true;
    };
  }, [user, guidedKey, bootcampOverride]);

  // A finished run is shown back to the student instead of being silently
  // redrawn. Completion deliberately makes a row unresumable so a re-attempt is
  // fresh, but that also meant reopening a completed drill reshuffled the pool
  // and left no way to see the questions they had just answered — the work was
  // still in the store, just never read. `retaking` is the escape hatch: once
  // they ask for a fresh attempt we stop showing the review for this visit.
  const [completedGuided, setCompletedGuided] = React.useState<GuidedDrillSession | null>(null);
  const [retaking, setRetaking] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    setCompletedGuided(null);
    setRetaking(false);
    if (!user || !guidedKey || bootcampOverride) return;
    void loadCompletedGuidedDrillSession(user.id, guidedKey).then((stored) => {
      if (!cancelled) setCompletedGuided(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [user, guidedKey, bootcampOverride]);

  const completedSession = React.useMemo(
    () => guidedSessionToDrillSession(completedGuided),
    [completedGuided],
  );

  // An unfinished practice run is surfaced before the student presses Start, so
  // they know their earlier answers are still there rather than guessing.
  const [resumeNotice, setResumeNotice] = React.useState<string | undefined>(undefined);
  React.useEffect(() => {
    let cancelled = false;
    if (!user || !bootcampOverride || bootcampOverride.source !== 'intro-to-lr-practice-drills') {
      setResumeNotice(guidedResumeNotice(storedGuided));
      return;
    }
    void loadPracticeSession(user.id, bootcampOverride.slug).then((stored) => {
      if (cancelled) return;
      if (!stored || stored.status !== 'in_progress' || stored.attempts.length === 0) {
        setResumeNotice(undefined);
        return;
      }
      const total = stored.question_queue.length;
      const at = Math.min(stored.current_index + 1, total);
      setResumeNotice(
        `Picking up where you left off — question ${at} of ${total}, ${stored.attempts.length} already answered.`,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [user, bootcampOverride, storedGuided]);

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
    navigate(originReturnTo);
  }, [onReturn, navigate, originReturnTo]);

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

      const poolQids = resumeQids.length > 0 ? resumeQids : ov.qids;

      if (!Array.isArray(poolQids) || poolQids.length === 0) {
        toast.error(
          `Practice drill pool is missing or empty for ${ov.slug}. Expected qtype = Main Conclusion, feature = ${feature}, count = ${ov.count}.`,
        );
        return;
      }

      const known = new Set(questionBank.getAllQuestions().map((q) => q.qid));
      const validQids = poolQids.filter((qid) => known.has(qid));
      const invalidQids = poolQids.filter((qid) => !known.has(qid));

      // eslint-disable-next-line no-console
      console.log('[intro-to-lr-practice-drills] launch', {
        slug: ov.slug,
        title: ov.title,
        qtypes: ov.qtypes,
        qfeatures: ov.qfeatures,
        difficulties: ov.difficulties,
        count: ov.count,
        poolQids,
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

      // Named by the pool slug rather than by a copy of its questions. The
      // slug is also what lets /drill mark this practice set complete in module
      // progress when the student finishes (see runner path-completion), and
      // what its Run Record is keyed by, so a refresh finds the same run.
      navigate(
        `/drill?${launchDrill({
          kind: 'practice-set',
          slug: ov.slug,
          source: ov.source,
          options: {
            returnTo: launchReturnTo,
            label: ov.title,
            initialIndex: resumeIndex ?? undefined,
          },
        })}`,
      );
      return;
    }

    let selectedQids: string[];
    // Where the student left off wins over a fresh draw. The stored queue is
    // frozen at first launch, so coming back gives them the SAME questions —
    // re-running the level draw here is what used to hand them a new set.
    let resumeAtIndex: number | null = resumeIndex;
    if (resumeQids.length > 0) {
      selectedQids = resumeQids;
    } else if (storedGuided && storedGuided.question_queue.length > 0) {
      selectedQids = storedGuided.question_queue;
      resumeAtIndex = Math.min(
        Math.max(storedGuided.current_index, 0),
        storedGuided.question_queue.length - 1,
      );
    } else if ((bootcampOverride as any)?.selectedQids) {
      selectedQids = (bootcampOverride as any).selectedQids;
    } else if (drill) {
      // The draw happens here, at open time, not at assign time. That is what
      // keeps a re-attempt fresh, and it is what lets one drill serve a
      // beginner and an advanced student different questions.
      //
      // `assignment` is null on the /guided-drills/:slug route, which is the
      // library preview and the bootcamp entry point. Level stays null there on
      // purpose: levelling a preview by the *viewer's* profile would show
      // Joshua something different from what the student gets.
      const resolution = resolveGuidedDrillQidsForLevel({ drill, assignment });
      if (resolution.warning === 'empty') {
        toast.error('No matching questions found for this drill.');
        return;
      }
      if (resolution.warning === 'out_of_level') {
        // Not blocking: the student still gets a full drill. Logged so the
        // mismatch is diagnosable from the console rather than invisible.
        // eslint-disable-next-line no-console
        console.warn('[guided-drill] no questions at this level; drew from outside the band', {
          slug: drill.slug,
          level: resolution.level,
          band: resolution.band,
          poolCount: resolution.poolCount,
        });
      }
      selectedQids = resolution.qids;
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
    drillSearchParams.set('returnTo', launchReturnTo);
    if (resumeAtIndex != null) {
      drillSearchParams.set('initialIndex', String(resumeAtIndex));
    }
    if ((bootcampOverride as any)?.title ?? drill?.title) {
      drillSearchParams.set('focus', (bootcampOverride as any)?.title ?? drill!.title);
    }
    if (drill) {
      drillSearchParams.set('guided', '1');
      if (drill.estimated_minutes && drill.estimated_minutes > 0) {
        drillSearchParams.set('guidedDurationMinutes', String(drill.estimated_minutes));
      }
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
        isGuidedDrill: !!drill,
        guidedDurationMinutes: drill?.estimated_minutes ?? undefined,
      },
    });
  }, [assignment, drill, navigate, qbLoading, bootcampOverride, slug, resumeQids, resumeIndex, storedGuided, launchReturnTo]);

  if (loading) {
    return <div className="min-h-screen bg-background text-foreground p-8">Loading...</div>;
  }

  if (!drill && !bootcampOverride) {
    return <div className="min-h-screen bg-background text-foreground p-8">Guided drill not found.</div>;
  }

  // Reopening a drill they already finished: show what they did. The question
  // bank has to be loaded first, since the scorecard resolves each qid through
  // it — without that gate the rows render blank for a moment.
  if (completedSession && !retaking && !qbLoading) {
    const finishedOn = completedGuided?.updated_at
      ? new Date(completedGuided.updated_at).toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
        })
      : null;
    return (
      <PracticeSetResults
        session={completedSession as DrillSession}
        title={drill?.title ?? 'Your results'}
        subtitle={
          finishedOn
            ? `You completed this on ${finishedOn}. A fresh attempt draws a new set of questions.`
            : 'A fresh attempt draws a new set of questions.'
        }
        onBack={handleReturn}
        onRetry={() => {
          setRetaking(true);
          void handleStart();
        }}
      />
    );
  }

  // No curated HTML launch page for this drill — build the identical premium
  // launch page from the drill's stored instruction_card content so every drill
  // renders in the same format (serif hero, black START card, notes drawer).
  if (!launchPage) {
    if (!drill) {
      return <div className="min-h-screen bg-background text-foreground p-8">Guided drill not found.</div>;
    }

    // The assignment wins over the drill. A pinned set is exactly as long as
    // the pin, and a trimmed assignment is as long as the teacher set it to;
    // reading the drill's own count first advertises ten questions to a
    // student who is about to be given six, which they notice.
    const count =
      assignment?.question_qids?.length ||
      assignment?.question_count ||
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
        resumeNotice={resumeNotice}
      />
    );
  }

  return (
    <GuidedDrillLaunchFrame
      src={launchPage.htmlPath}
      title={launchPage.title}
      onStart={() => void handleStart()}
      onReturn={handleReturn}
      resumeNotice={resumeNotice}
    />
  );
}

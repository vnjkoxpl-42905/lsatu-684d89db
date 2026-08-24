import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useStudentActivity } from "../hooks/useStudentActivities";
import {
  assignmentBelongsToAnotherAccount,
  completeAssignment,
  listItemResponses,
  markAssignmentStarted,
  recordItemResponse,
} from "../api/activitiesClient";
import { reconstructProgress, scoreFor } from "../progress";
import { draftKey, flushOutbox, queueAttempt, type PendingAttempt } from "../drafts";
import type { RunScore } from "../progress";
import { syncClassroomItemStatusBySource } from "@/lib/classroomItems";
import { useAuth } from "@/contexts/AuthContext";
import { MAX_ATTEMPTS } from "../api/types";
import type { JudgeSource, Verdict } from "../api/types";
import { ActivityIntro } from "./ActivityIntro";
import { ActivityHeroPanel } from "./ActivityHeroPanel";
import { ActivityExitButton } from "./ActivityExitButton";
import { worldForTitle } from "../worlds/registry";
import { ActivityQuestionStack } from "./ActivityQuestionStack";
import { CompletionSummary } from "./CompletionSummary";
import "../activity-centre.css";

type Phase = "intro" | "running" | "done";

/**
 * Student player: intro -> split-screen quiz -> completion summary.
 *
 * On open it replays the saved attempt log so the student resumes exactly where
 * they left off (or reviews a completed run). A completed activity can be re-run
 * as ungraded practice via "Practice again": that run writes nothing and never
 * touches the graded score.
 */
export interface ActivityRunnerProps {
  /** When embedded (not routed), the assignment id to run. Falls back to the URL param. */
  assignmentId?: string;
  /**
   * Teacher preview: always start at the intro regardless of saved status, and
   * write nothing. Reuses the no-write `practice` path so previews never touch
   * real assignment data or scores.
   */
  preview?: boolean;
}

export function ActivityRunner({ assignmentId: assignmentIdProp, preview = false }: ActivityRunnerProps = {}) {
  const params = useParams<{ assignmentId: string; activityId: string }>();
  // The routed preview names an ACTIVITY, not an assignment: it runs off the
  // definition and no row exists to name. Everything else names an assignment.
  const previewActivityId = preview ? params.activityId : undefined;
  const assignmentId = assignmentIdProp ?? params.assignmentId;
  const navigate = useNavigate();
  // Only the routed runner owns the whole viewport and therefore needs its own
  // way out. Embedded (teacher preview) sits inside chrome that already closes.
  const routed = assignmentIdProp === undefined;

  // Exit means two different places depending on where you are standing, and
  // conflating them is what made the first version wrong. From a question, the
  // thing you want to back out to is the Activity's own intro: its title, the
  // worked example, the rules. Dropping straight to the Activity Centre there
  // skips past the page you were actually trying to reach. From the intro
  // itself there is nowhere further in to go, so that one leaves for the
  // Centre. Returning to the intro keeps `index`, so the Start action resumes on
  // the same question rather than restarting the Activity.
  const handleBackToIntro = routed ? () => setPhase("intro") : undefined;
  const handleLeave = routed ? () => navigate("/activities") : undefined;
  const { user } = useAuth();

  // "Activity not found." was shown for two very different situations: an id
  // that is not real, and an assignment that IS real but was issued to another
  // account. The second is the common one for anyone signed in as admin while
  // the assignment sits on their student login, and the old wording sent the
  // reader looking for a routing or RLS bug that was never there.
  // Tri-state, not a boolean. A boolean starting false means the first paint
  // after an empty load says "Activity not found." and only corrects itself
  // once the probe answers, so the wrong sentence is shown first and the right
  // one arrives as a flicker. "unknown" keeps the spinner up instead.
  const [ownership, setOwnership] = useState<"unknown" | "elsewhere" | "absent">("unknown");
  const { assignment, loading, error } = useStudentActivity(assignmentId, previewActivityId);

  // Only asked when the load has genuinely come back empty, so the ordinary
  // path costs nothing. The probe reads by id alone and returns a boolean, so
  // a student who cannot see the row keeps the plain not-found wording.
  useEffect(() => {
    if (loading || error || assignment || !assignmentId) {
      setOwnership("unknown");
      return;
    }
    let live = true;
    void assignmentBelongsToAnotherAccount(assignmentId)
      .then((yes) => {
        if (live) setOwnership(yes ? "elsewhere" : "absent");
      })
      .catch(() => {
        // The helper already swallows its own failures; this is the guard for
        // anything it cannot, so a probe never becomes an unhandled rejection.
        // Resolving to "absent" keeps the plain wording, never the stronger claim.
        if (live) setOwnership("absent");
      });
    return () => {
      live = false;
    };
  }, [assignmentId, assignment, loading, error]);

  /**
   * The attempt log, started at mount rather than after the assignment lands.
   *
   * Both reads are keyed by ids that are known before either request goes out:
   * the assignment id from the route and the student id from the session. The
   * hydrate effect used to await the assignment and only then ask for the log,
   * which made the slowest screen in the flow two sequential round trips for no
   * reason. It is one now, and the effect awaits a promise that has been in
   * flight the whole time.
   */
  const logRef = useRef<Promise<Awaited<ReturnType<typeof listItemResponses>>> | null>(null);
  if (!logRef.current && assignmentId && user && !preview) {
    logRef.current = listItemResponses(assignmentId, user.id);
    // Nothing awaits this until the effect does, and an unhandled rejection in
    // between would surface as a page-level error. The effect still sees it.
    logRef.current.catch(() => {});
  }

  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [verdicts, setVerdicts] = useState<Record<number, Verdict | null>>({});
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [hydrated, setHydrated] = useState(false);
  // The world's entrance plays once per run, on Start, before the first item.
  const [entered, setEntered] = useState(false);
  // Ungraded run with no DB writes / score overwrite. True for teacher previews
  // and for a "Practice again" re-run of a completed activity.
  const [practice, setPractice] = useState(preview);
  /**
   * The item the student stopped ON, mid-attempt, in an earlier sitting: which
   * index it is, how many attempts they had already spent, and what they had
   * typed. Applied only while `index` still points at that item, so moving on
   * never re-seeds a later question with an older question's words.
   */
  const [resumeAt, setResumeAt] = useState<{ index: number; attempts: number; text: string } | null>(null);
  const hydratingRef = useRef(false);
  /**
   * The world, on a phone.
   *
   * Below md the two columns stack, and the yard came first at 864px measured
   * at 375x812 -- so the student scrolled past a full screen of scenery to
   * reach the answer box on every one of 62 questions, and the routing beat
   * then played off-screen behind them. It rides as a compact sticky band
   * instead, opened on tap when they want the whole yard.
   */
  const [bandExpanded, setBandExpanded] = useState(false);
  const bandRef = useRef<HTMLElement | null>(null);

  const items = useMemo(
    () => (assignment ? [...assignment.items].sort((a, b) => a.order - b.order) : []),
    [assignment],
  );

  /**
   * The Activity's world, when it has one. Eight were built, one per Activity,
   * and until now none was reachable outside the dev lab. A world replaces the
   * cover rail on the left; the answer box and Coach on the right are untouched.
   */
  const world = useMemo(() => worldForTitle(assignment?.title), [assignment?.title]);
  const currentItem = items[index];

  /**
   * One marker per item, carrying the verdict the student actually earned.
   * Replayed progress is in `verdicts`, so this survives leaving and coming
   * back: the rail a student sees on their third sitting shows all three.
   * Items not yet reached carry null and the world draws them as untravelled
   * rather than inventing an outcome.
   */
  const mileposts = useMemo(
    () => items.map((i) => ({ order: i.order, outcome: verdicts[i.order] ?? null })),
    [items, verdicts],
  );

  const worldStage = useMemo(() => {
    if (!world || !currentItem) return null;
    return world.render({
      item: currentItem,
      response: responses[currentItem.order],
      answered: verdicts[currentItem.order] !== undefined,
      mileposts,
      currentOrder: currentItem.order,
    });
  }, [world, currentItem, responses, verdicts, mileposts]);

  // Mirror progress into the Classroom feed row so a completed activity stops
  // showing "Start". Best-effort: the assignment is the source of truth.
  const syncClassroom = useCallback(
    async (status: "in_progress" | "completed") => {
      if (practice || !assignment) return;
      try {
        await syncClassroomItemStatusBySource("activity_assignments", assignment.id, status);
      } catch (e) {
        console.error("[activity:classroom:sync] failed", { status, error: e });
      }
    },
    [assignment, practice],
  );

  // Open behavior: runs once when the assignment loads.
  //
  // Every attempt is already written to `activity_item_responses` as it
  // happens, so the log is a complete record of where the student got to. This
  // replays it. A completed activity opens to its review summary; an
  // unfinished one opens ON the question they stopped at, with the verdicts
  // they already earned restored so the final score counts every sitting, not
  // just the last one. The intro is the front door exactly once: a run that has
  // been started resumes straight into the work rather than sending the student
  // back through the rules they have already read.
  useEffect(() => {
    if (!assignment || !user || hydrated || hydratingRef.current) return;
    hydratingRef.current = true;

    (async () => {
      // Teacher preview: always enter at the intro, never load saved progress.
      if (preview) {
        setPhase("intro");
        setHydrated(true);
        return;
      }

      let log: Awaited<ReturnType<typeof listItemResponses>> = [];
      try {
        log = await (logRef.current ?? listItemResponses(assignment.id, user.id));
      } catch (e) {
        // A failed read must not silently look like "no progress" and hand the
        // student a blank run over the top of real saved work. Start them at
        // the intro, say so, and leave the log untouched.
        console.error("[activity:resume:load] failed", e);
        if (assignment.status !== "completed") {
          toast({
            title: "Could not load your saved progress",
            description: "Your earlier answers are safe. Reload to pick up where you left off.",
            variant: "destructive",
          });
          setPhase("intro");
          setHydrated(true);
          return;
        }
      }

      const progress = reconstructProgress(items, log);
      setVerdicts(progress.verdicts);
      setResponses(progress.responses);

      if (assignment.status === "completed") {
        setPhase("done");
        setHydrated(true);
        return;
      }

      // Every item resolved but the run never closed (the tab went away on the
      // last Finish). The work is done; write the completion rather than
      // parking the student on a run with nothing left in it.
      if (items.length > 0 && progress.resolvedCount >= items.length) {
        setIndex(items.length - 1);
        setPhase("done");
        try {
          await completeAssignment(assignment.id, scoreFor(progress.verdicts, items.length));
          void syncClassroom("completed");
        } catch (e) {
          console.error("[activity:resume:complete] failed", e);
        }
        setHydrated(true);
        return;
      }

      setIndex(progress.resolvedCount);
      setResumeAt(
        progress.pendingAttempts > 0
          ? { index: progress.resolvedCount, attempts: progress.pendingAttempts, text: progress.pendingText }
          : null,
      );

      const started = assignment.status === "in_progress" || progress.resolvedCount > 0;
      setPhase(started ? "running" : "intro");
      // The world's entrance is the ceremony of arriving, and it runs two and a
      // half seconds. It belongs to Start, not to every reopen: a student who
      // works this Activity over five sittings should not pay for it five
      // times. Coming back drops them straight onto the question.
      if (started) setEntered(true);
      if (started && assignment.status === "assigned") {
        // Attempts on record but the status never moved: repair it, so the
        // Centre and the Classroom stop calling this run unopened.
        try {
          await markAssignmentStarted(assignment.id);
        } catch (e) {
          console.error("[activity:resume:start] failed", e);
        }
        void syncClassroom("in_progress");
      }
      setHydrated(true);
    })();
  }, [assignment, user, items, hydrated, preview, syncClassroom]);

  const handleStart = useCallback(async () => {
    setEntered(false);
    setPhase("running");
    if (!practice && assignment && assignment.status === "assigned") {
      try {
        await markAssignmentStarted(assignment.id);
      } catch (e) {
        console.error("[activity:start] failed", e);
      }
      void syncClassroom("in_progress");
    }
  }, [assignment, practice, syncClassroom]);

  const handleRecord = useCallback(
    async (args: {
      itemOrder: number;
      responseText: string;
      verdict: Verdict | null;
      attemptNo: number;
      judgeSource?: JudgeSource;
      shadowFault?: string | null;
      latencyMs?: number;
    }) => {
      setResponses((prev) => ({ ...prev, [args.itemOrder]: args.responseText }));
      // The seed has served its purpose the moment this item is written to
      // again; leaving it set would re-apply an old attempt count on a remount.
      setResumeAt((prev) => (prev && items[prev.index]?.order === args.itemOrder ? null : prev));
      if (practice || !user || !assignment) return; // practice runs are never persisted
      const payload: PendingAttempt = {
        assignmentId: assignment.id,
        studentId: user.id,
        itemOrder: args.itemOrder,
        responseText: args.responseText,
        verdict: args.verdict,
        attemptNo: args.attemptNo,
        judgeSource: args.judgeSource,
        shadowFault: args.shadowFault,
        latencyMs: args.latencyMs,
        parserVersion: world?.parserVersion,
      };
      try {
        await recordItemResponse(payload);
        // A good write is the moment to try whatever failed before it.
        void flushOutbox((pending) => recordItemResponse(pending));
      } catch (e) {
        console.error("[activity:record] failed", e);
        // The toast used to say the progress still counted while queueing
        // nothing at all, so the sentence was false the moment it appeared.
        // It is true now: the attempt is held and retried.
        queueAttempt(payload);
        toast({
          title: "Could not save that attempt",
          description: "It is saved on this device and will go up when the connection is back.",
          variant: "destructive",
        });
      }
    },
    [user, assignment, practice, items, world],
  );

  // Anything stranded by an earlier session goes up as soon as there is a
  // student to attribute it to, without waiting for them to answer again.
  useEffect(() => {
    if (practice || !user) return;
    void flushOutbox((pending) => recordItemResponse(pending));
  }, [practice, user]);

  const handleResolved = useCallback((order: number, finalVerdict: Verdict | null) => {
    setVerdicts((prev) => ({ ...prev, [order]: finalVerdict }));
    // The routing and the flip are the payoff. On a phone the band is above the
    // answer box, so without this they play behind the student while they are
    // still looking at what they typed. Desktop already has both in view.
    if (typeof window === "undefined" || window.matchMedia("(min-width: 768px)").matches) return;
    bandRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleNext = useCallback(async () => {
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
      setBandExpanded(false); // a new question starts with the answer box in reach
      return;
    }
    if (!practice && assignment) {
      try {
        await completeAssignment(assignment.id, scoreFor(verdicts, items.length));
      } catch (e) {
        console.error("[activity:complete] failed", e);
        toast({ title: "Could not save completion", description: "Your summary is shown below.", variant: "destructive" });
      }
      void syncClassroom("completed");
    }
    setPhase("done");
  }, [index, items.length, verdicts, assignment, practice, syncClassroom]);

  // Re-run a completed activity for practice. Clears local state, writes nothing.
  const handlePracticeAgain = useCallback(() => {
    setPractice(true);
    setVerdicts({});
    setResponses({});
    setResumeAt(null);
    setIndex(0);
    setEntered(true);
    setPhase("running");
  }, []);

  // The empty-load case is still resolving until the ownership probe answers,
  // so it waits here rather than showing a sentence it may have to take back.
  if (loading || (assignment && !hydrated) || (!error && !assignment && ownership === "unknown")) {
    return (
      <div className="activity-centre min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--muted))] border-t-[hsl(var(--ac-emerald))]" />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="activity-centre min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {error
            ? `Could not load this activity: ${error}`
            : ownership === "elsewhere"
              ? "This activity was assigned to a different account."
              : "Activity not found."}
        </p>
        {!error && user?.email && (
          <p className="text-xs text-muted-foreground/70">
            {ownership === "elsewhere"
              ? `You are signed in as ${user.email}. Sign in as the account it was assigned to.`
              : `Signed in as ${user.email}.`}
          </p>
        )}
        {handleLeave && <ActivityExitButton onExit={handleLeave} tone="light" />}
      </div>
    );
  }

  // Graded completion shows the score as it was STORED, so re-opening a finished
  // run never quietly re-scores it under today's rules. A run stored under
  // scoring_version 1 counted unjudged items as wrong, and its parts were never
  // written down, so it is shown over its own item count and left alone. A
  // practice run has nothing stored and is always scored live.
  const liveScore = scoreFor(verdicts, items.length);
  const storedScore: RunScore | null =
    !practice && assignment.status === "completed"
      ? {
          numerator: assignment.score_numerator ?? 0,
          judged: assignment.score_judged ?? items.length,
          total: assignment.score_total ?? items.length,
          percent: assignment.score,
        }
      : null;
  const displayScore = storedScore ?? liveScore;

  if (phase === "intro") {
    return (
      <div className="activity-centre act-home" data-world={world?.slug}>
        <ActivityIntro
          title={assignment.title}
          subtitle={assignment.subtitle}
          instructions={assignment.instructions}
          itemCount={items.length}
          maxAttempts={MAX_ATTEMPTS}
          resumeAt={index + 1}
          onStart={handleStart}
          onExit={handleLeave}
        />
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div
        className="activity-centre min-h-screen bg-[hsl(var(--aw-page,var(--background)))] px-4 py-8 md:px-8 md:py-12"
        data-world={world?.slug}
      >
        <div className="mx-auto max-w-5xl">
          {handleLeave && (
            <div className="mb-6">
              <ActivityExitButton onExit={handleLeave} tone="light" />
            </div>
          )}
          <CompletionSummary
            title={assignment.title}
            items={items}
            verdicts={verdicts}
            responses={responses}
            score={displayScore}
            practice={practice}
            onPractice={handlePracticeAgain}
          />
        </div>
      </div>
    );
  }

  // The entrance is a one-shot animation that owns the screen, so it renders
  // before the split view rather than inside it.
  if (world && !entered) {
    const Entrance = world.Entrance;
    return (
      <div className="activity-centre min-h-screen" data-world={world.slug}>
        <Entrance onDone={() => setEntered(true)} title={assignment.title} />
      </div>
    );
  }

  return (
    <div className="activity-centre min-h-screen" data-world={world?.slug}>
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[minmax(320px,42%)_1fr]">
        {worldStage ? (
          /* The world carries the item itself, so the rail's job here is only
             the two things the world does not draw: the way out and the count.
             Falls back to the hero panel whenever the item does not parse into
             the world's domain, rather than rendering an empty world. */
          <aside
            ref={bandRef}
            className="ac-yard-band relative flex min-h-[200px] flex-col md:min-h-[560px] md:sticky md:top-0 md:h-screen"
            data-expanded={bandExpanded ? "true" : "false"}
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-5 md:px-6">
              {handleBackToIntro && <ActivityExitButton onExit={handleBackToIntro} tone="light" />}
              <span className="text-[11px] font-semibold tabular-nums tracking-wide text-[hsl(var(--aw-soft,var(--muted-foreground)))]">
                {index + 1} / {items.length}
              </span>
            </div>
            <div className="min-h-0 flex-1">{worldStage}</div>
            {/* Phone only. The world is the reward, not the route to the answer
                box: below md it rides as a band the student can open when they
                want it, and the answer box stays on the first screen. */}
            <button
              type="button"
              className="ac-band-toggle md:hidden"
              onClick={() => setBandExpanded((open) => !open)}
              aria-expanded={bandExpanded}
            >
              {bandExpanded ? "Collapse" : "Expand"}
            </button>
          </aside>
        ) : (
        <ActivityHeroPanel
          assignment={assignment}
          current={index + 1}
          total={items.length}
          onExit={handleBackToIntro}
        />
        )}
        {/* The answer column stands on the world's own ground; the work cards
            inside keep their light reading surface. */}
        <main className="min-h-screen bg-[hsl(var(--aw-page,var(--background)))]">
          <ActivityQuestionStack
            items={items}
            format={assignment.item_format}
            coach={assignment.instructions?.coach}
            answerLabel={assignment.instructions?.answer_label}
            answerPlaceholder={assignment.instructions?.answer_placeholder}
            creditedSecondaryLabel={assignment.instructions?.credited_secondary_label}
            promptInWorld={Boolean(worldStage && world?.carriesPrompt)}
            fastPath={world?.fastPath}
            shadowFault={world?.shadowFault}
            activeIndex={index}
            resumeAttempts={resumeAt?.index === index ? resumeAt.attempts : 0}
            resumeValue={resumeAt?.index === index ? resumeAt.text : ""}
            draftKeyFor={(itemOrder) => draftKey(assignment.id, itemOrder)}
            onResolved={handleResolved}
            onRecord={handleRecord}
            onNext={handleNext}
          />
        </main>
      </div>
    </div>
  );
}

export default ActivityRunner;

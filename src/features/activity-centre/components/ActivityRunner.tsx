import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useStudentActivity } from "../hooks/useStudentActivities";
import {
  completeAssignment,
  listItemResponses,
  markAssignmentStarted,
  recordItemResponse,
} from "../api/activitiesClient";
import { reconstructProgress } from "../progress";
import { syncClassroomItemStatusBySource } from "@/lib/classroomItems";
import { useAuth } from "@/contexts/AuthContext";
import type { Verdict } from "../api/types";
import { ActivityIntro } from "./ActivityIntro";
import { ActivityHeroPanel } from "./ActivityHeroPanel";
import { ActivityExitButton } from "./ActivityExitButton";
import { ActivityQuestionStack } from "./ActivityQuestionStack";
import { CompletionSummary } from "./CompletionSummary";
import "../activity-centre.css";

type Phase = "intro" | "running" | "done";

const VERDICT_WEIGHT: Record<string, number> = { correct: 1, partial: 0.5, incorrect: 0 };

function scoreFor(verdicts: Record<number, Verdict | null>, total: number): number {
  if (total === 0) return 0;
  const sum = Object.values(verdicts).reduce((acc, v) => acc + (v ? VERDICT_WEIGHT[v] ?? 0 : 0), 0);
  return Math.round((sum / total) * 100);
}

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
  const params = useParams<{ assignmentId: string }>();
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
  // Centre. Returning to the intro keeps `index`, so Start drilling resumes on
  // the same question rather than restarting the Activity.
  const handleBackToIntro = routed ? () => setPhase("intro") : undefined;
  const handleLeave = routed ? () => navigate("/activities") : undefined;
  const { user } = useAuth();
  const { assignment, loading, error } = useStudentActivity(assignmentId);

  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [verdicts, setVerdicts] = useState<Record<number, Verdict | null>>({});
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [hydrated, setHydrated] = useState(false);
  // Ungraded run with no DB writes / score overwrite. True for teacher previews
  // and for a "Practice again" re-run of a completed activity.
  const [practice, setPractice] = useState(preview);
  const hydratingRef = useRef(false);

  const items = useMemo(
    () => (assignment ? [...assignment.items].sort((a, b) => a.order - b.order) : []),
    [assignment],
  );

  // Open behavior: runs once when the assignment loads. A completed activity
  // opens to its review summary; everything else opens to the homepage (intro)
  // and Start begins fresh at question 1. We deliberately do NOT resume
  // mid-drill — the homepage is always the entry point for an unfinished run.
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
      if (assignment.status === "completed") {
        // Load the attempt log only to render the stored answers in the summary.
        try {
          const log = await listItemResponses(assignment.id, user.id);
          const progress = reconstructProgress(items, log);
          setVerdicts(progress.verdicts);
          setResponses(progress.responses);
        } catch (e) {
          console.error("[activity:review:load] failed", e);
        }
        setPhase("done");
      } else {
        setPhase("intro");
      }
      setHydrated(true);
    })();
  }, [assignment, user, items, hydrated, preview]);

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

  const handleStart = useCallback(async () => {
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
    async (args: { itemOrder: number; responseText: string; verdict: Verdict | null; attemptNo: number }) => {
      setResponses((prev) => ({ ...prev, [args.itemOrder]: args.responseText }));
      if (practice || !user || !assignment) return; // practice runs are never persisted
      try {
        await recordItemResponse({
          assignmentId: assignment.id,
          studentId: user.id,
          itemOrder: args.itemOrder,
          responseText: args.responseText,
          verdict: args.verdict,
          attemptNo: args.attemptNo,
        });
      } catch (e) {
        console.error("[activity:record] failed", e);
        toast({ title: "Could not save that attempt", description: "Your progress this session still counts.", variant: "destructive" });
      }
    },
    [user, assignment, practice],
  );

  const handleResolved = useCallback((order: number, finalVerdict: Verdict | null) => {
    setVerdicts((prev) => ({ ...prev, [order]: finalVerdict }));
  }, []);

  const handleNext = useCallback(async () => {
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
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
    setIndex(0);
    setPhase("running");
  }, []);

  if (loading || (assignment && !hydrated)) {
    return (
      <div className="activity-centre min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--muted))] border-t-[hsl(var(--ac-emerald))]" />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="activity-centre min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-muted-foreground">
          {error ? `Could not load this activity: ${error}` : "Activity not found."}
        </p>
        {handleLeave && <ActivityExitButton onExit={handleLeave} tone="light" />}
      </div>
    );
  }

  // Graded completion shows the stored score; a practice run shows its live score.
  const displayScore =
    !practice && assignment.status === "completed" && assignment.score != null
      ? assignment.score
      : scoreFor(verdicts, items.length);

  if (phase === "intro") {
    return (
      <div className="activity-centre act-home">
        <ActivityIntro
          title={assignment.title}
          subtitle={assignment.subtitle}
          instructions={assignment.instructions}
          onStart={handleStart}
          onExit={handleLeave}
        />
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="activity-centre min-h-screen px-4 py-8 md:px-8 md:py-12">
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

  return (
    <div className="activity-centre min-h-screen">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[minmax(320px,42%)_1fr]">
        <ActivityHeroPanel
          assignment={assignment}
          current={index + 1}
          total={items.length}
          onExit={handleBackToIntro}
        />
        <main className="min-h-screen bg-[hsl(var(--background))]">
          <ActivityQuestionStack
            items={items}
            format={assignment.item_format}
            coach={assignment.instructions?.coach}
            activeIndex={index}
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

import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useStudentActivity } from "../hooks/useStudentActivities";
import { completeAssignment, markAssignmentStarted, recordItemResponse } from "../api/activitiesClient";
import { useAuth } from "@/contexts/AuthContext";
import type { Verdict } from "../api/types";
import { ActivityIntro } from "./ActivityIntro";
import { ActivityHeroPanel } from "./ActivityHeroPanel";
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

/** Student player: intro -> split-screen scrolling quiz -> completion summary. */
export function ActivityRunner() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useAuth();
  const { assignment, loading, error } = useStudentActivity(assignmentId);

  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [verdicts, setVerdicts] = useState<Record<number, Verdict | null>>({});
  const [responses, setResponses] = useState<Record<number, string>>({});

  const items = useMemo(
    () => (assignment ? [...assignment.items].sort((a, b) => a.order - b.order) : []),
    [assignment],
  );

  const handleStart = useCallback(async () => {
    setPhase("running");
    if (assignment && assignment.status === "assigned") {
      try {
        await markAssignmentStarted(assignment.id);
      } catch (e) {
        console.error("[activity:start] failed", e);
      }
    }
  }, [assignment]);

  const handleRecord = useCallback(
    async (args: { itemOrder: number; responseText: string; verdict: Verdict | null; attemptNo: number }) => {
      setResponses((prev) => ({ ...prev, [args.itemOrder]: args.responseText }));
      if (!user || !assignment) return;
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
    [user, assignment],
  );

  const handleResolved = useCallback((order: number, finalVerdict: Verdict | null) => {
    setVerdicts((prev) => ({ ...prev, [order]: finalVerdict }));
  }, []);

  const handleNext = useCallback(async () => {
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    const finalScore = scoreFor(verdicts, items.length);
    if (assignment) {
      try {
        await completeAssignment(assignment.id, finalScore);
      } catch (e) {
        console.error("[activity:complete] failed", e);
        toast({ title: "Could not save completion", description: "Your summary is shown below.", variant: "destructive" });
      }
    }
    setPhase("done");
  }, [index, items.length, verdicts, assignment]);

  if (loading) {
    return (
      <div className="activity-centre min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--muted))] border-t-[hsl(var(--ac-emerald))]" />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="activity-centre min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">
          {error ? `Could not load this activity: ${error}` : "Activity not found."}
        </p>
      </div>
    );
  }

  const finalScore = scoreFor(verdicts, items.length);

  if (phase === "intro") {
    return (
      <div className="activity-centre act-home">
        <ActivityIntro
          title={assignment.title}
          subtitle={assignment.subtitle}
          instructions={assignment.instructions}
          itemCount={items.length}
          onStart={handleStart}
        />
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="activity-centre min-h-screen px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-5xl">
          <CompletionSummary
            title={assignment.title}
            items={items}
            verdicts={verdicts}
            responses={responses}
            score={finalScore}
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
        />
        <main className="min-h-screen bg-[hsl(var(--background))]">
          <ActivityQuestionStack
            items={items}
            format={assignment.item_format}
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

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listAssignmentsForActivity,
  listResponsesForAssignment,
} from "../api/activitiesClient";
import { reconstructProgress } from "../progress";
import type { ActivityAssignment, ActivityItemResponse, Verdict } from "../api/types";

interface ActivityResultsProps {
  activityId: string;
  /** Resolve a student_id to a display name. */
  nameFor: (studentId: string) => string;
  /** Bump to force a reload (e.g. after a new assign). */
  reloadKey?: number;
}

const STATUS_META: Record<ActivityAssignment["status"], { label: string; cls: string }> = {
  assigned: { label: "Not started", cls: "text-zinc-400" },
  in_progress: { label: "In progress", cls: "text-amber-300" },
  completed: { label: "Completed", cls: "text-emerald-300" },
};

const VERDICT_META: Record<string, { label: string; cls: string }> = {
  correct: { label: "Correct", cls: "text-emerald-300" },
  partial: { label: "Almost", cls: "text-amber-300" },
  incorrect: { label: "Not yet", cls: "text-rose-300" },
  none: { label: "No answer", cls: "text-zinc-500" },
};

/** Admin: per-student results for one activity, with per-item answer drill-down. */
export function ActivityResults({ activityId, nameFor, reloadKey }: ActivityResultsProps) {
  const [assignments, setAssignments] = useState<ActivityAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAssignments(await listAssignmentsForActivity(activityId));
      setError(null);
    } catch (e) {
      console.error("[activity:results:list] failed", { activityId, error: e });
      setError(e instanceof Error ? e.message : "Failed to load results");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs text-zinc-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading results…
      </p>
    );
  }
  if (error) return <p className="text-xs text-rose-400">Could not load results: {error}</p>;
  if (assignments.length === 0) {
    return <p className="text-xs text-zinc-500">Not assigned to anyone yet.</p>;
  }

  return (
    <div className="space-y-1">
      {assignments.map((a) => (
        <ResultRow
          key={a.id}
          assignment={a}
          name={nameFor(a.student_id)}
          open={openId === a.id}
          onToggle={() => setOpenId((cur) => (cur === a.id ? null : a.id))}
        />
      ))}
    </div>
  );
}

function ResultRow({
  assignment,
  name,
  open,
  onToggle,
}: {
  assignment: ActivityAssignment;
  name: string;
  open: boolean;
  onToggle: () => void;
}) {
  const status = STATUS_META[assignment.status];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <span className="truncate text-sm text-zinc-200">{name}</span>
        <span className="flex shrink-0 items-center gap-3">
          <span className={cn("text-xs font-medium", status.cls)}>{status.label}</span>
          {assignment.score != null && (
            <span className="text-xs font-semibold text-zinc-300">{assignment.score}%</span>
          )}
          <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-500 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && <ResultDetail assignment={assignment} />}
    </div>
  );
}

function ResultDetail({ assignment }: { assignment: ActivityAssignment }) {
  const [responses, setResponses] = useState<ActivityItemResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await listResponsesForAssignment(assignment.id);
        if (alive) setResponses(rows);
      } catch (e) {
        console.error("[activity:results:detail] failed", { id: assignment.id, error: e });
        if (alive) setError(e instanceof Error ? e.message : "Failed to load answers");
      }
    })();
    return () => {
      alive = false;
    };
  }, [assignment.id]);

  if (error) return <p className="px-3 pb-3 text-xs text-rose-400">{error}</p>;
  if (!responses) {
    return (
      <p className="flex items-center gap-2 px-3 pb-3 text-xs text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading answers…
      </p>
    );
  }

  const items = [...assignment.items].sort((a, b) => a.order - b.order);
  const progress = reconstructProgress(items, responses);

  if (responses.length === 0) {
    return <p className="px-3 pb-3 text-xs text-zinc-500">No answers submitted yet.</p>;
  }

  return (
    <div className="space-y-2 border-t border-zinc-800 px-3 py-3">
      {items.map((item) => {
        const v: Verdict | "none" = (progress.verdicts[item.order] as Verdict) ?? "none";
        const meta = VERDICT_META[v] ?? VERDICT_META.none;
        const wrote = progress.responses[item.order];
        return (
          <div key={item.order} className="rounded-md bg-zinc-900/60 p-2.5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-zinc-400">{item.prompt}</p>
              <span className={cn("shrink-0 text-[11px] font-semibold", meta.cls)}>{meta.label}</span>
            </div>
            {wrote ? (
              <p className="mt-1.5 text-sm text-zinc-200">{wrote}</p>
            ) : (
              <p className="mt-1.5 text-xs italic text-zinc-600">no answer yet</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

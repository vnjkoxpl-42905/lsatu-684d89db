import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, RotateCcw, Eye, Clock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import {
  useStudentAssignment,
  type AssignmentStatus,
} from "@/hooks/useStudentAssignments";

function StatusBadge({ status }: { status: AssignmentStatus }) {
  const map: Record<AssignmentStatus, { label: string; cls: string }> = {
    assigned: {
      label: "Assigned",
      cls: "bg-secondary text-foreground/80 ring-border",
    },
    in_progress: {
      label: "In progress",
      cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    },
    completed: {
      label: "Completed",
      cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    },
  };
  const cfg = map[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ring-1 ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

export default function ClassroomAssignmentDetail() {
  const navigate = useNavigate();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useAuth();
  const { assignment, loading } = useStudentAssignment(assignmentId);

  React.useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  const handleStart = () => {
    if (!assignment) return;
    const qidsParam = assignment.question_qids.join(",");
    navigate(
      `/drill?mode=type-drill&qids=${encodeURIComponent(qidsParam)}&assignmentId=${encodeURIComponent(assignment.id)}`,
    );
  };

  const estMinutes = assignment
    ? Math.max(1, Math.ceil(assignment.question_qids.length * 2))
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/classroom")}
            className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent -ml-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Classroom
          </Button>
          <LogoutButton />
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-10">
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {!loading && !assignment && (
          <div className="text-center py-20 text-muted-foreground">
            Assignment not found.
          </div>
        )}

        {assignment && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 min-w-0 flex-1">
                <h1 className="text-2xl font-semibold text-foreground">
                  {assignment.set_title}
                </h1>
                <StatusBadge status={assignment.status} />
              </div>
              {assignment.status === "completed" && assignment.score !== null && (
                <div className="text-right shrink-0">
                  <div className="text-3xl font-light text-emerald-400 tabular-nums">
                    {Math.round(assignment.score)}%
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Score
                  </div>
                </div>
              )}
            </div>

            {assignment.set_description && (
              <div className="rounded-xl bg-card border border-border px-5 py-4">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {assignment.set_description}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>
                {assignment.question_qids.length} question
                {assignment.question_qids.length === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />≈ {estMinutes} min
              </span>
            </div>

            <div>
              {assignment.status === "assigned" && (
                <Button size="lg" onClick={handleStart} className="gap-2">
                  <Play className="h-4 w-4" /> Start
                </Button>
              )}
              {assignment.status === "in_progress" && (
                <Button size="lg" onClick={handleStart} className="gap-2">
                  <Play className="h-4 w-4" /> Continue
                </Button>
              )}
              {assignment.status === "completed" && (
                <Button size="lg" variant="outline" onClick={handleStart} className="gap-2">
                  <Eye className="h-4 w-4" /> Review
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ClipboardList,
  ChevronRight,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import {
  useStudentAssignments,
  useStudentTAAssignments,
  type AssignmentStatus,
  type TAAssignmentStatus,
  type StudentAssignment,
  type StudentTAAssignment,
} from "@/hooks/useStudentAssignments";

type ListItem =
  | { kind: "homework"; row: StudentAssignment; sortKey: string }
  | { kind: "ta"; row: StudentTAAssignment; sortKey: string };

function IL({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium select-none">
      {children}
    </span>
  );
}

function HomeworkStatusBadge({ status }: { status: AssignmentStatus }) {
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

function TAStatusBadge({ status }: { status: TAAssignmentStatus }) {
  const map: Record<TAAssignmentStatus, { label: string; cls: string }> = {
    assigned: {
      label: "Assigned",
      cls: "bg-secondary text-foreground/80 ring-border",
    },
    viewed: {
      label: "Viewed",
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

function homeworkCta(status: AssignmentStatus): string {
  if (status === "completed") return "Review";
  if (status === "in_progress") return "Continue";
  return "Start";
}

function taCta(status: TAAssignmentStatus): string {
  if (status === "completed") return "Review";
  if (status === "viewed") return "Continue";
  return "Open";
}

// Active items first, completed last. Within a bucket, newest first.
function bucket(s: AssignmentStatus | TAAssignmentStatus): number {
  if (s === "completed") return 1;
  return 0;
}

export default function Classroom() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { assignments: homework, loading: hwLoading } = useStudentAssignments();
  const { assignments: taRows, loading: taLoading } = useStudentTAAssignments();

  React.useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  const loading = hwLoading || taLoading;

  const items: ListItem[] = React.useMemo(() => {
    const hw: ListItem[] = homework.map((r) => ({
      kind: "homework",
      row: r,
      sortKey: r.created_at,
    }));
    const ta: ListItem[] = taRows.map((r) => ({
      kind: "ta",
      row: r,
      sortKey: r.assigned_at,
    }));
    return [...hw, ...ta].sort((a, b) => {
      const aStatus = a.kind === "ta" ? a.row.status : a.row.status;
      const bStatus = b.kind === "ta" ? b.row.status : b.row.status;
      const bd = bucket(aStatus) - bucket(bStatus);
      if (bd !== 0) return bd;
      return new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime();
    });
  }, [homework, taRows]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-5xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/foyer")}
            className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent -ml-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Main Hub
          </Button>
          <IL>Classroom</IL>
          <LogoutButton />
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-3">
        {loading && (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        )}

        {!loading && items.length === 0 && (
          <div className="flex justify-center py-16">
            <div className="text-center space-y-3 max-w-md">
              <ClipboardList
                className="h-10 w-10 text-muted-foreground/40 mx-auto"
                strokeWidth={1.25}
              />
              <h2 className="text-base font-medium text-foreground/90">
                No assignments yet
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Joshua will send homework when ready.
              </p>
            </div>
          </div>
        )}

        {!loading &&
          items.map((item) =>
            item.kind === "homework" ? (
              <button
                key={`hw-${item.row.id}`}
                onClick={() => navigate(`/classroom/${item.row.id}`)}
                className="w-full text-left rounded-xl bg-card border border-border px-5 py-4 flex items-center gap-4 hover:bg-accent/40 hover:border-border transition-colors duration-150 group"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      <BookOpen className="h-3 w-3" />
                      Homework
                    </span>
                    <HomeworkStatusBadge status={item.row.status} />
                    <span className="text-xs text-muted-foreground">
                      {item.row.question_qids.length} question
                      {item.row.question_qids.length === 1 ? "" : "s"}
                    </span>
                    {item.row.status === "completed" && item.row.score !== null && (
                      <span className="text-xs text-emerald-400">
                        {Math.round(item.row.score)}%
                      </span>
                    )}
                  </div>
                  <div className="text-[14px] font-medium text-foreground/90 truncate">
                    {item.row.set_title}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/70 shrink-0">
                  <span>{homeworkCta(item.row.status)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors" />
                </div>
              </button>
            ) : (
              <button
                key={`ta-${item.row.id}`}
                onClick={() => navigate(`/classroom/ta/${item.row.id}`)}
                className="w-full text-left rounded-xl bg-card border border-border px-5 py-4 flex items-center gap-4 hover:bg-accent/40 hover:border-border transition-colors duration-150 group"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      <GraduationCap className="h-3 w-3" />
                      TA assignment
                    </span>
                    <TAStatusBadge status={item.row.status} />
                  </div>
                  <div className="text-[14px] font-medium text-foreground/90 truncate">
                    {item.row.title}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/70 shrink-0">
                  <span>{taCta(item.row.status)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors" />
                </div>
              </button>
            )
          )}
      </main>
    </div>
  );
}

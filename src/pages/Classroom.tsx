import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ClipboardList, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import {
  useStudentAssignments,
  type AssignmentStatus,
} from "@/hooks/useStudentAssignments";

function IL({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium select-none">
      {children}
    </span>
  );
}

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

function ctaLabel(status: AssignmentStatus): string {
  if (status === "completed") return "Review";
  if (status === "in_progress") return "Continue";
  return "Start";
}

export default function Classroom() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { assignments, loading } = useStudentAssignments();

  React.useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

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

        {!loading && assignments.length === 0 && (
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

        {!loading && assignments.length > 0 && (
          <>
            {assignments.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/classroom/${a.id}`)}
                className="w-full text-left rounded-xl bg-card border border-border px-5 py-4 flex items-center gap-4 hover:bg-accent/40 hover:border-border transition-colors duration-150 group"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={a.status} />
                    <span className="text-xs text-muted-foreground">
                      {a.question_qids.length} question
                      {a.question_qids.length === 1 ? "" : "s"}
                    </span>
                    {a.status === "completed" && a.score !== null && (
                      <span className="text-xs text-emerald-400">
                        {Math.round(a.score)}%
                      </span>
                    )}
                  </div>
                  <div className="text-[14px] font-medium text-foreground/90 truncate">
                    {a.set_title}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/70 shrink-0">
                  <span>{ctaLabel(a.status)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors" />
                </div>
              </button>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { ArrowLeft, Check, GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import {
  markTAAssignmentCompleted,
  markTAAssignmentViewed,
  useStudentTAAssignment,
  type TAAssignmentStatus,
} from "@/hooks/useStudentAssignments";

function StatusBadge({ status }: { status: TAAssignmentStatus }) {
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

export default function ClassroomTAAssignmentDetail() {
  const navigate = useNavigate();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useAuth();
  const { assignment, loading, refresh } = useStudentTAAssignment(assignmentId);
  const [completing, setCompleting] = React.useState(false);

  React.useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  // Auto-transition assigned -> viewed the first time a student opens the
  // detail page. markTAAssignmentViewed is no-op for non-"assigned" rows.
  const viewedFiredRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!assignment) return;
    if (viewedFiredRef.current === assignment.id) return;
    if (assignment.status !== "assigned") return;
    viewedFiredRef.current = assignment.id;
    void markTAAssignmentViewed(assignment.id).then((r) => {
      if (r.ok) void refresh();
    });
  }, [assignment, refresh]);

  const onComplete = async () => {
    if (!assignment) return;
    setCompleting(true);
    const r = await markTAAssignmentCompleted(assignment.id);
    if (r.ok) {
      toast.success("Marked complete");
      await refresh();
    } else {
      toast.error(r.error ?? "Failed to mark complete");
    }
    setCompleting(false);
  };

  const sanitized = React.useMemo(
    () => (assignment ? DOMPurify.sanitize(assignment.content_html || "") : ""),
    [assignment]
  );

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
            <Skeleton className="h-64 w-full" />
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
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <GraduationCap className="h-3.5 w-3.5" />
                  TA assignment
                </div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {assignment.title}
                </h1>
                <StatusBadge status={assignment.status} />
              </div>
            </div>

            <article
              className="rounded-xl bg-card border border-border px-6 py-5 prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:mt-4 prose-headings:mb-2"
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />

            {assignment.status !== "completed" && (
              <div className="flex justify-end">
                <Button onClick={onComplete} disabled={completing} size="sm">
                  {completing ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Mark complete
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useStudentActivities } from "@/features/activity-centre";
import type { ActivityAssignment } from "@/features/activity-centre";
import "@/features/activity-centre/activity-centre.css";

const STATUS_LABEL: Record<ActivityAssignment["status"], string> = {
  assigned: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

/** Student home for the Activity Centre: the list of assigned Activities. */
export default function ActivityCentre() {
  const navigate = useNavigate();
  const { assignments, loading, error } = useStudentActivities();

  return (
    <div className="activity-centre min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => navigate("/foyer")}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </button>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Activity Centre
        </p>
        <h1 className="ac-display mt-2 text-4xl text-foreground">Your activities</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Coach-led skill exercises your instructor has assigned.
        </p>

        <div className="mt-8 space-y-3">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--muted))] border-t-[hsl(var(--ac-emerald))]" />
            </div>
          )}

          {!loading && error && (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Could not load your activities: {error}
            </p>
          )}

          {!loading && !error && assignments.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No activities assigned yet. Your instructor will add them here.
              </p>
            </div>
          )}

          {assignments.map((a) => {
            const done = a.status === "completed";
            return (
              <button
                key={a.id}
                onClick={() => navigate(`/activities/${a.id}`)}
                className="group flex w-full items-center justify-between gap-4 rounded-[24px] border border-border bg-card p-6 text-left transition-shadow hover:shadow-[0_2px_16px_rgba(16,24,40,0.06)]"
              >
                <div className="min-w-0">
                  <p className="ac-display text-xl text-foreground">{a.title}</p>
                  {a.subtitle && <p className="mt-1 text-sm text-muted-foreground">{a.subtitle}</p>}
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    {done ? (
                      <span className="inline-flex items-center gap-1 font-medium text-[hsl(var(--ac-emerald-strong))]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {a.score != null ? `${a.score}%` : "Completed"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{STATUS_LABEL[a.status]}</span>
                    )}
                    <span className="text-muted-foreground">· {a.items.length} items</span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

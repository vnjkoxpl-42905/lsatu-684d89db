import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useHomeworkSets } from "@/hooks/useHomeworkSets";

export default function Homework() {
  const navigate = useNavigate();
  const { is_admin, loading: permLoading } = useUserPermissions();
  const { sets, loading: setsLoading } = useHomeworkSets();

  React.useEffect(() => {
    if (!permLoading && !is_admin) {
      navigate("/foyer", { replace: true });
    }
  }, [permLoading, is_admin, navigate]);

  if (permLoading) return null;
  if (!is_admin) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="Back to Admin"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <BookOpen className="w-5 h-5 text-sky-400/70" />
          <h1 className="text-lg font-semibold tracking-tight">Homework</h1>
          <div className="ml-auto">
            <Button onClick={() => navigate("/admin/homework/new")} className="gap-1.5">
              <Plus className="w-4 h-4" />
              New Set
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        <p className="text-sm text-zinc-400">
          Reusable question sets. Assign any set to a student and their copy is
          frozen at that moment, so later edits to the template don't change
          what they're drilling.
        </p>

        <div className="space-y-3">
          {setsLoading && (
            <>
              <Skeleton className="h-16 w-full bg-zinc-900" />
              <Skeleton className="h-16 w-full bg-zinc-900" />
            </>
          )}

          {!setsLoading && sets.length === 0 && (
            <div className="border border-zinc-800 rounded-lg p-10 text-center text-sm text-zinc-400">
              No homework sets yet. Create your first set to assign to students.
            </div>
          )}

          {!setsLoading && sets.length > 0 && (
            <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800">
              {sets.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-900/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-100 truncate">
                      {s.title}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {s.question_qids.length} question
                      {s.question_qids.length === 1 ? "" : "s"}
                      {" · "}
                      {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/homework/${s.id}`)}
                  >
                    Edit / Assign
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

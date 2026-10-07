import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark, Copy, Eye, Pencil, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { useSavedSets } from "@/hooks/useSavedSets";
import { LrQuestionInspectList } from "@/components/drill/LrQuestionInspectList";
import { recordExposures } from "@/lib/questionExposure";
import { launchDrill } from "@/lib/drillLaunch";
import { format } from "date-fns";

// Saved-set surface. Lists every set the
// user has saved (from Build a Set or Smart Builder preview). Each row has:
//   - Inspect → reads the exact stored questions without starting a run
//   - Launch  → navigates to /drill with the stored question_ids
//   - Rename  → inline edit
//   - Duplicate → server-side copy via the savedSets service
//   - Delete  → confirm dialog
//
// Empty state is honest: if you haven't saved anything, the surface tells
// you so and links back to Build a Set.

export default function SavedSets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLoading: questionsLoading, error: questionsError } = useQuestionBank();
  const { sets, isLoading, remove, duplicate, rename } = useSavedSets();
  const [inspectingId, setInspectingId] = React.useState<string | null>(null);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const inspectingSet = sets.find((set) => set.id === inspectingId && set.user_id === user?.id);

  // The set's id, not its questions. A link that names the set stays correct
  // when the set is edited, and it is short enough to read; handing over the
  // question list threw the only durable name away.
  const launch = (setId: string, questionIds: string[]) => {
    if (questionIds.length === 0) {
      toast.error("This set has no questions.");
      return;
    }
    if (user?.id) {
      recordExposures(user.id, questionIds).catch((e) =>
        console.error("[SavedSets] recordExposures failed", e),
      );
    }
    navigate(`/drill?${launchDrill({ kind: "saved-set", setId })}`);
  };

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const next = renameValue.trim();
    if (!next) {
      toast.error("Set name can't be empty.");
      return;
    }
    try {
      await rename.mutateAsync({ setId: renamingId, newName: next });
      setRenamingId(null);
      setRenameValue("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't rename set.");
    }
  };

  const handleDuplicate = async (setId: string) => {
    try {
      await duplicate.mutateAsync(setId);
      toast.success("Set duplicated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't duplicate set.");
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await remove.mutateAsync(confirmDeleteId);
      setConfirmDeleteId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete set.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/classroom/drill")}
            aria-label="Back to Practice Hub"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Bookmark className="h-4 w-4 text-muted-foreground" aria-hidden />
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              Practice Hub
            </div>
            <h1 className="text-base font-semibold leading-tight">My Sets</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Loading your saved sets…
          </div>
        ) : sets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center space-y-3">
            <Bookmark className="h-6 w-6 text-muted-foreground mx-auto" aria-hidden />
            <h2 className="text-base font-semibold">No saved sets yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Build a set you want to revisit, then save it from the Set Summary panel.
              It'll show up here.
            </p>
            <Button onClick={() => navigate("/classroom/drill")} size="sm" className="mt-2">
              Go to Build a Set
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {sets.map((set) => {
              const isRenaming = renamingId === set.id;
              const count = set.question_ids?.length ?? 0;
              return (
                <li
                  key={set.id}
                  className="rounded-xl border border-border bg-card px-4 py-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4 hover:border-foreground/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") {
                              setRenamingId(null);
                              setRenameValue("");
                            }
                          }}
                          autoFocus
                          className="h-9 max-w-xs"
                        />
                        <Button size="sm" onClick={commitRename}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRenamingId(null);
                            setRenameValue("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-semibold truncate">{set.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {count} {count === 1 ? "question" : "questions"} · saved{" "}
                          {format(new Date(set.created_at), "MMM d, yyyy")}
                        </div>
                      </>
                    )}
                  </div>
                  {!isRenaming && (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInspectingId(set.id)}
                        disabled={!user || set.user_id !== user.id}
                        className="min-h-11 gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden /> Inspect
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => launch(set.id, set.question_ids)}
                        className="gap-1.5"
                      >
                        <Play className="h-3.5 w-3.5" aria-hidden /> Launch
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startRename(set.id, set.name)}
                        aria-label={`Rename ${set.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDuplicate(set.id)}
                        aria-label={`Duplicate ${set.name}`}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfirmDeleteId(set.id)}
                        aria-label={`Delete ${set.name}`}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <Dialog open={!!inspectingSet} onOpenChange={(open) => !open && setInspectingId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden [&>button]:right-1 [&>button]:top-1 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center">
          <DialogHeader className="pr-10">
            <DialogTitle>Inspect {inspectingSet?.name}</DialogTitle>
            <DialogDescription>
              These are the exact questions saved in this set, in order. Inspecting does not start a drill or record practice.
            </DialogDescription>
          </DialogHeader>
          {questionsLoading ? (
              <p role="status" className="text-muted-foreground">Loading questions…</p>
            ) : questionsError ? (
              <p role="alert" className="text-destructive">Questions could not be loaded. Close this preview and try again later.</p>
            ) : (
              <LrQuestionInspectList qids={inspectingSet?.question_ids ?? []} />
            )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this set?</AlertDialogTitle>
            <AlertDialogDescription>
              The saved set will be removed. Your attempt history is unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

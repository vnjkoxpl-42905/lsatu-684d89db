import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { useSavedSets } from "@/hooks/useSavedSets";
import { LrQuestionInspectList } from "@/components/drill/LrQuestionInspectList";
import { SavedSetRow } from "@/components/drill/SavedSetRow";
import { recordExposures } from "@/lib/questionExposure";
import { launchDrill } from "@/lib/drillLaunch";

/**
 * Saved Logical Reasoning sets, inside the drill hub's Saved sets tab.
 *   Start         navigates to /drill with the set's id
 *   View questions reads the exact stored questions without starting a run
 *   Rename, Duplicate, Delete live in the row's menu
 * An empty list says so and points at Save set.
 */
export function SavedLrSets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLoading: questionsLoading, error: questionsError } = useQuestionBank();
  const { sets, isLoading, remove, duplicate, rename } = useSavedSets();
  const [inspectingId, setInspectingId] = React.useState<string | null>(null);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const inspectingSet = sets.find((set) => set.id === inspectingId && set.user_id === user?.id);

  // The set's id, not its questions: a link that names the set stays correct
  // when the set is edited.
  const launch = (setId: string, questionIds: string[]) => {
    if (questionIds.length === 0) {
      toast.error("This set has no questions.");
      return;
    }
    if (user?.id) {
      recordExposures(user.id, questionIds).catch((e) => console.error("[SavedSets] recordExposures failed", e));
    }
    navigate(`/drill?${launchDrill({ kind: "saved-set", setId })}`);
  };

  const stopRename = () => { setRenamingId(null); setRenameValue(""); };

  const commitRename = async () => {
    if (!renamingId) return;
    const next = renameValue.trim();
    if (!next) {
      toast.error("Set name can't be empty.");
      return;
    }
    try {
      await rename.mutateAsync({ setId: renamingId, newName: next });
      stopRename();
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
    <>
      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground" role="status">Loading your saved sets…</p>
      ) : sets.length === 0 ? (
        <div className="dh-empty">
          <Bookmark aria-hidden />
          <p className="dh-empty-title">No saved LR sets yet</p>
          <p className="dh-empty-note">To keep a drill for later, choose Save set before you start it.</p>
          <Button size="sm" onClick={() => navigate("/practice/drills?view=create&section=lr")}>Build a drill</Button>
        </div>
      ) : (
        <>
          <p className="dh-count" role="status">{sets.length} saved {sets.length === 1 ? "set" : "sets"}</p>
          <ul className="dh-list">
            {sets.map((set) => {
              const count = set.question_ids?.length ?? 0;
              const mine = !!user && set.user_id === user.id;
              return (
                <SavedSetRow
                  key={set.id}
                  section="lr"
                  title={set.name}
                  kind="Exact questions"
                  detail={`${count} ${count === 1 ? "question" : "questions"}`}
                  saved={set.created_at}
                  startLabel="Start drill"
                  startAriaLabel={`Start drill ${set.name}`}
                  onStart={() => launch(set.id, set.question_ids)}
                  secondary={{ label: "View questions", ariaLabel: `View questions in ${set.name}`, onSelect: () => setInspectingId(set.id), disabled: !mine }}
                  menu={[
                    { label: "Rename", ariaLabel: `Rename ${set.name}`, onSelect: () => { setRenamingId(set.id); setRenameValue(set.name); } },
                    { label: "Duplicate", ariaLabel: `Duplicate ${set.name}`, onSelect: () => void handleDuplicate(set.id) },
                    { label: "Delete", ariaLabel: `Delete ${set.name}`, onSelect: () => setConfirmDeleteId(set.id), destructive: true },
                  ]}
                  editing={renamingId === set.id ? (
                    <div className="dh-rename">
                      <Input
                        aria-label={`New name for ${set.name}`}
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void commitRename();
                          if (event.key === "Escape") stopRename();
                        }}
                        autoFocus
                        maxLength={100}
                      />
                      <Button size="sm" onClick={() => void commitRename()}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={stopRename}>Cancel</Button>
                    </div>
                  ) : undefined}
                />
              );
            })}
          </ul>
        </>
      )}

      <Dialog open={!!inspectingSet} onOpenChange={(open) => !open && setInspectingId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden [&>button]:right-1 [&>button]:top-1 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center">
          <DialogHeader className="pr-10">
            <DialogTitle>{inspectingSet?.name}</DialogTitle>
            <DialogDescription className="sr-only">Your saved questions, in order.</DialogDescription>
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
            <AlertDialogDescription>This removes the saved set. Completed drills are kept.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

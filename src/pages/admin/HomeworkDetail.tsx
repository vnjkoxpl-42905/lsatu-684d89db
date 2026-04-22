import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useHomeworkSet, useHomeworkSets } from "@/hooks/useHomeworkSets";
import QuestionMultiPicker from "@/components/homework/QuestionMultiPicker";
import StudentAssignSection from "@/components/homework/StudentAssignSection";

export default function HomeworkDetail() {
  const navigate = useNavigate();
  const { setId } = useParams<{ setId: string }>();
  const { is_admin, loading: permLoading } = useUserPermissions();

  const { set, loading: setLoading, refresh: refreshSet } = useHomeworkSet(setId);
  const { update, remove } = useHomeworkSets();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [qids, setQids] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    if (!permLoading && !is_admin) {
      navigate("/foyer", { replace: true });
    }
  }, [permLoading, is_admin, navigate]);

  React.useEffect(() => {
    if (set && !initialized) {
      setTitle(set.title);
      setDescription(set.description ?? "");
      setQids(set.question_qids);
      setInitialized(true);
    }
  }, [set, initialized]);

  if (permLoading) return null;
  if (!is_admin) return null;

  const dirty =
    !!set &&
    (title !== set.title ||
      (description || "") !== (set.description || "") ||
      JSON.stringify(qids) !== JSON.stringify(set.question_qids));

  const canSave = dirty && title.trim().length > 0 && qids.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave || !setId) return;
    setSaving(true);
    const { data: row, error } = await update(setId, {
      title: title.trim(),
      description: description.trim() || null,
      question_qids: qids,
    });
    setSaving(false);
    if (!row) {
      toast.error(error || "Couldn't save changes.", { duration: 10000 });
      return;
    }
    toast.success("Set updated.");
    void refreshSet();
  };

  const handleDelete = async () => {
    if (!setId) return;
    const { ok, error } = await remove(setId);
    if (!ok) {
      toast.error(error || "Couldn't delete the set.", { duration: 10000 });
      return;
    }
    toast.success("Set deleted.");
    navigate("/admin/homework");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/homework")}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="Back to Homework"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <BookOpen className="w-5 h-5 text-sky-400/70" />
          <h1 className="text-lg font-semibold tracking-tight">
            {set ? set.title : "Homework Set"}
          </h1>
          {set && (
            <div className="ml-auto">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete set
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this set?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Already-issued assignments keep their snapshotted
                      questions — students can still drill them. You just
                      won't be able to re-assign from this template.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleDelete()}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {setLoading && (
          <>
            <Skeleton className="h-32 w-full bg-zinc-900" />
            <Skeleton className="h-64 w-full bg-zinc-900" />
          </>
        )}

        {!setLoading && !set && (
          <div className="border border-zinc-800 rounded-lg p-6 text-center text-sm text-zinc-400">
            Set not found or you don't have access to it.
          </div>
        )}

        {set && (
          <>
            <section className="border border-zinc-800 rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-medium text-zinc-300">Edit set</h2>
              <div className="space-y-1.5">
                <Label htmlFor="hw-title">Title</Label>
                <Input
                  id="hw-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hw-desc">Description</Label>
                <Textarea
                  id="hw-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>
              <QuestionMultiPicker value={qids} onChange={setQids} />
              <div className="flex items-center justify-end">
                <Button
                  onClick={handleSave}
                  disabled={!canSave}
                  title={
                    saving
                      ? "Saving..."
                      : qids.length === 0
                        ? "Add at least one question."
                        : !dirty
                          ? "No changes to save."
                          : undefined
                  }
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </section>

            <StudentAssignSection set={set} />
          </>
        )}
      </div>
    </div>
  );
}

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useHomeworkSets } from "@/hooks/useHomeworkSets";
import QuestionMultiPicker from "@/components/homework/QuestionMultiPicker";

export default function HomeworkNew() {
  const navigate = useNavigate();
  const { is_admin, loading: permLoading } = useUserPermissions();
  const { create, classIdReady } = useHomeworkSets();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [qids, setQids] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!permLoading && !is_admin) {
      navigate("/foyer", { replace: true });
    }
  }, [permLoading, is_admin, navigate]);

  if (permLoading) return null;
  if (!is_admin) return null;

  const handleSave = async () => {
    if (submitting) return;
    setSubmitting(true);
    const resolvedTitle = title.trim() || "Untitled set";
    const { data: row, error } = await create({
      title: resolvedTitle,
      description: description.trim() || null,
      question_qids: qids,
    });
    setSubmitting(false);
    if (!row) {
      toast.error(error || "Couldn't save the set. Try again.", {
        duration: 10000,
      });
      return;
    }
    toast.success("Set created.");
    navigate(`/admin/homework/${row.id}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/homework")}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="Back to Homework"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <BookOpen className="w-5 h-5 text-sky-400/70" />
          <h1 className="text-lg font-semibold tracking-tight">New Homework Set</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <section className="border border-zinc-800 rounded-lg p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="hw-title">Title</Label>
            <Input
              id="hw-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Necessary Assumption Drill #1"
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hw-desc">Description (optional)</Label>
            <Textarea
              id="hw-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should the student focus on?"
              rows={3}
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
            />
          </div>
        </section>

        <section className="border border-zinc-800 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-300">Questions</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Students drill them in the order selected.
            </p>
          </div>
          <QuestionMultiPicker value={qids} onChange={setQids} />
        </section>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/homework")}
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={submitting || !classIdReady || qids.length === 0}
            title={
              submitting
                ? "Saving..."
                : !classIdReady
                  ? "Loading class..."
                  : qids.length === 0
                    ? "Add at least one question."
                    : undefined
            }
          >
            {submitting ? "Saving..." : "Save set"}
          </Button>
        </div>
      </div>
    </div>
  );
}

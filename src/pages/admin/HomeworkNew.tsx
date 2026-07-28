import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import {
  useHomeworkSets,
  type InstructionLayout,
} from "@/hooks/useHomeworkSets";
import QuestionMultiPicker from "@/components/homework/QuestionMultiPicker";
import { BUILD_SHA } from "@/lib/buildInfo";

function parseIntOrNull(v: string): number | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parseSourcePts(v: string): string[] | null {
  const arr = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return arr.length > 0 ? arr : null;
}

export default function HomeworkNew() {
  const navigate = useNavigate();
  const { is_admin, loading: permLoading } = useUserPermissions();
  const { create, classIdReady } = useHomeworkSets();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [qids, setQids] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  // Guided-set fields
  const [isGuided, setIsGuided] = React.useState(false);
  const [instructionsMd, setInstructionsMd] = React.useState("");
  const [instructionLayout, setInstructionLayout] =
    React.useState<InstructionLayout>("two_column");
  const [questionType, setQuestionType] = React.useState("");
  const [reasoningType, setReasoningType] = React.useState("");
  const [questionFeature, setQuestionFeature] = React.useState("");
  const [guidedSetType, setGuidedSetType] = React.useState("");
  const [estimatedMinutes, setEstimatedMinutes] = React.useState("");
  const [sourcePts, setSourcePts] = React.useState("");
  const [difficultyMin, setDifficultyMin] = React.useState("");
  const [difficultyMax, setDifficultyMax] = React.useState("");
  const [startButtonLabel, setStartButtonLabel] = React.useState("");

  React.useEffect(() => {
    if (!permLoading && !is_admin) {
      navigate("/classroom", { replace: true });
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
      ...(isGuided
        ? {
            is_guided_set: true,
            instructions_markdown: instructionsMd.trim() || null,
            instruction_layout: instructionLayout,
            question_type: questionType.trim() || null,
            reasoning_type: reasoningType.trim() || null,
            question_feature: questionFeature.trim() || null,
            guided_set_type: guidedSetType.trim() || null,
            estimated_minutes: parseIntOrNull(estimatedMinutes),
            source_pts: parseSourcePts(sourcePts),
            difficulty_min: parseIntOrNull(difficultyMin),
            difficulty_max: parseIntOrNull(difficultyMax),
            start_button_label: startButtonLabel.trim() || null,
          }
        : { is_guided_set: false }),
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
          <span
            className="ml-auto font-mono text-[10px] text-zinc-600 tracking-wider"
            title={`Build ${BUILD_SHA}`}
          >
            build {BUILD_SHA}
          </span>
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

        <section className="border border-zinc-800 rounded-lg p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium text-zinc-300">Guided set</h2>
              <p className="text-xs text-zinc-500 mt-1 max-w-md">
                Show a 2-column instruction card before the student starts the drill. Adds
                pedagogical metadata used by the AI Teaching Assistant when recommending sets.
              </p>
            </div>
            <Switch checked={isGuided} onCheckedChange={setIsGuided} aria-label="Guided set" />
          </div>

          {isGuided && (
            <div className="space-y-4 pt-2 border-t border-zinc-800">
              <div className="space-y-1.5">
                <Label htmlFor="hw-instructions">Instructions (Markdown)</Label>
                <p className="text-xs text-zinc-500">
                  Use <code className="text-zinc-300">### Left Column</code> and{" "}
                  <code className="text-zinc-300">### Right Column</code> markers to split into two columns.
                </p>
                <Textarea
                  id="hw-instructions"
                  value={instructionsMd}
                  onChange={(e) => setInstructionsMd(e.target.value)}
                  placeholder={"### Left Column\n\nKey concepts...\n\n### Right Column\n\nWhat to practice..."}
                  rows={10}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-sm"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="hw-layout">Instruction layout</Label>
                  <Select
                    value={instructionLayout}
                    onValueChange={(v) => setInstructionLayout(v as InstructionLayout)}
                  >
                    <SelectTrigger id="hw-layout" className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="two_column">Two column</SelectItem>
                      <SelectItem value="single_column">Single column</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hw-start-label">Start button label</Label>
                  <Input
                    id="hw-start-label"
                    value={startButtonLabel}
                    onChange={(e) => setStartButtonLabel(e.target.value)}
                    placeholder="Start"
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hw-qtype">Question type</Label>
                  <Input
                    id="hw-qtype"
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    placeholder="e.g. Main Conclusion / Role"
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hw-rtype">Reasoning type</Label>
                  <Input
                    id="hw-rtype"
                    value={reasoningType}
                    onChange={(e) => setReasoningType(e.target.value)}
                    placeholder="e.g. Causation"
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hw-qfeat">Question feature</Label>
                  <Input
                    id="hw-qfeat"
                    value={questionFeature}
                    onChange={(e) => setQuestionFeature(e.target.value)}
                    placeholder="e.g. First Sentence Conclusion"
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hw-gtype">Guided set type</Label>
                  <Input
                    id="hw-gtype"
                    value={guidedSetType}
                    onChange={(e) => setGuidedSetType(e.target.value)}
                    placeholder="Patterns / Process / ..."
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hw-est-min">Estimated minutes</Label>
                  <Input
                    id="hw-est-min"
                    type="number"
                    min={0}
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                    placeholder="30"
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hw-source-pts">Source PTs (comma-separated)</Label>
                  <Input
                    id="hw-source-pts"
                    value={sourcePts}
                    onChange={(e) => setSourcePts(e.target.value)}
                    placeholder="140, 141"
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hw-diff-min">Difficulty min (1–5)</Label>
                  <Input
                    id="hw-diff-min"
                    type="number"
                    min={1}
                    max={5}
                    value={difficultyMin}
                    onChange={(e) => setDifficultyMin(e.target.value)}
                    placeholder="1"
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hw-diff-max">Difficulty max (1–5)</Label>
                  <Input
                    id="hw-diff-max"
                    type="number"
                    min={1}
                    max={5}
                    value={difficultyMax}
                    onChange={(e) => setDifficultyMax(e.target.value)}
                    placeholder="3"
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>
              </div>
            </div>
          )}
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

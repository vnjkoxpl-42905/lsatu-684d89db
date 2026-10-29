import { useState } from "react";
import { Loader2, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { useInspector } from "@/hooks/useInspector";
import InspectorReport from "@/components/inspector/InspectorReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const EXAMPLES = [
  "Negation Station",
  "the guided drill flow",
  "the Wrong Answer Journal",
  "the ta-chat edge function",
];

export default function Inspector() {
  const [target, setTarget] = useState("");
  const [question, setQuestion] = useState("");
  const inspect = useInspector();

  const run = async () => {
    if (!target.trim() && !question.trim()) {
      toast.error("Name a unit to inspect, or ask a question.");
      return;
    }
    try {
      await inspect.mutateAsync({ target, question });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Inspection failed");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <ScanSearch className="h-5 w-5 text-zinc-400" />
            <h1 className="text-lg font-semibold">Platform Inspector</h1>
          </div>
          <p className="text-sm text-zinc-500">
            Audit any unit of the platform for functional bugs, content errors,
            pedagogy gaps, and missing pieces. Read-only — it reports and suggests,
            it never changes anything.
          </p>
        </header>

        <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-zinc-500">
              Target
            </label>
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. Negation Station, the guided drill flow, a page or function"
              disabled={inspect.isPending}
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setTarget(ex)}
                  disabled={inspect.isPending}
                  className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-zinc-500">
              Specific question (optional)
            </label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Leave blank for a full audit, or ask something specific."
              rows={2}
              className="resize-none"
              disabled={inspect.isPending}
            />
          </div>

          <Button onClick={run} disabled={inspect.isPending} className="w-full">
            {inspect.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Inspecting… (reading code + data)
              </>
            ) : (
              <>
                <ScanSearch className="h-4 w-4 mr-2" />
                Inspect
              </>
            )}
          </Button>
        </div>

        {inspect.isPending && (
          <div className="text-center text-sm text-zinc-500 py-8">
            The inspector is exploring the codebase and sampling data. This can take
            a minute.
          </div>
        )}

        {inspect.data && !inspect.isPending && (
          <InspectorReport report={inspect.data} />
        )}
      </div>
    </div>
  );
}

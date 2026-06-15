import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActivityItem, Verdict } from "../api/types";

interface CompletionSummaryProps {
  title: string;
  items: ActivityItem[];
  verdicts: Record<number, Verdict | null>;
  responses: Record<number, string>;
  score: number;
}

const VERDICT_LABEL: Record<string, { label: string; cls: string }> = {
  correct: { label: "Correct", cls: "text-[hsl(var(--ac-emerald-strong))]" },
  partial: { label: "Almost", cls: "text-[hsl(38_92%_34%)]" },
  incorrect: { label: "Not yet", cls: "text-[hsl(350_80%_45%)]" },
  none: { label: "Skipped", cls: "text-muted-foreground" },
};

/** Completion: score, per-item recap, Done. */
export function CompletionSummary({ title, items, verdicts, responses, score }: CompletionSummaryProps) {
  const navigate = useNavigate();
  const correct = items.filter((i) => verdicts[i.order] === "correct").length;
  const partial = items.filter((i) => verdicts[i.order] === "partial").length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-[28px] border border-border bg-[hsl(var(--ac-surface))] p-8 text-center shadow-[0_2px_24px_rgba(30,24,16,0.06)] md:p-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {title} complete
        </p>
        <p className="ac-display mt-3 text-6xl text-foreground">{score}%</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {correct} correct · {partial} almost · {items.length} items
        </p>
        <Button
          onClick={() => navigate("/activities")}
          className="mt-7 h-11 px-7 bg-[hsl(var(--ac-emerald-strong))] text-white hover:bg-[hsl(var(--ac-emerald))]"
        >
          Done
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {items.map((item) => {
          const v = verdicts[item.order] ?? "none";
          const meta = VERDICT_LABEL[v] ?? VERDICT_LABEL.none;
          return (
            <div key={item.order} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-foreground/85">{item.prompt}</p>
                <span className={cn("shrink-0 text-xs font-semibold", meta.cls)}>{meta.label}</span>
              </div>
              {responses[item.order] && (
                <p className="mt-2 text-sm text-muted-foreground">
                  You wrote: <span className="text-foreground/70">{responses[item.order]}</span>
                </p>
              )}
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">Credited: </span>
                <span className="text-foreground/80">{item.credited_answers[0]}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

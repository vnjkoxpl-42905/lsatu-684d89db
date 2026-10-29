import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActivityItem, Verdict } from "../api/types";
import { buildIndicatorLedger } from "../ledger";
import type { RunScore } from "../progress";
import { IndicatorLedgerPanel } from "./IndicatorLedgerPanel";

interface CompletionSummaryProps {
  title: string;
  items: ActivityItem[];
  verdicts: Record<number, Verdict | null>;
  responses: Record<number, string>;
  /** The score with its denominator, so the screen can say what it counted. */
  score: RunScore;
  /** True when this is an ungraded practice run, not the graded result. */
  practice?: boolean;
  /** Re-run the activity for ungraded practice. */
  onPractice?: () => void;
  /** Re-run just the items named, ungraded. Absent leaves the ledger read-only. */
  onRedrill?: (orders: number[]) => void;
}

const VERDICT_LABEL: Record<string, { label: string; cls: string }> = {
  correct: { label: "Correct", cls: "text-[hsl(var(--ac-emerald-strong))]" },
  partial: { label: "Almost", cls: "text-[hsl(38_92%_34%)]" },
  incorrect: { label: "Not yet", cls: "text-[hsl(350_80%_45%)]" },
  // Not "Skipped": the student answered it. Nobody read the answer.
  none: { label: "Not checked", cls: "text-muted-foreground" },
};

/** Completion: score, per-item recap, Done, optional ungraded re-run. */
export function CompletionSummary({ title, items, verdicts, responses, score, practice, onPractice, onRedrill }: CompletionSummaryProps) {
  const navigate = useNavigate();
  const correct = items.filter((i) => verdicts[i.order] === "correct").length;
  const partial = items.filter((i) => verdicts[i.order] === "partial").length;
  const unchecked = score.total - score.judged;
  // Null for an Activity whose categories nobody has grouped, and for a run with
  // nothing judged. Both are "no diagnosis available", and the screen simply
  // stays as it was rather than showing an empty ledger that implies otherwise.
  const ledger = useMemo(
    () => buildIndicatorLedger(title, items, verdicts),
    [title, items, verdicts],
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-[28px] border border-border bg-[hsl(var(--ac-surface))] p-8 text-center shadow-[0_2px_24px_rgba(30,24,16,0.06)] md:p-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {practice ? `${title} · practice` : `${title} complete`}
        </p>
        <p className="ac-display mt-3 text-6xl text-foreground">
          {score.percent === null ? "Not scored" : `${score.percent}%`}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {correct} correct · {partial} almost ·{" "}
          {unchecked > 0 ? `${score.judged} of ${score.total} checked` : `${score.total} items`}
        </p>
        {unchecked > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {unchecked === 1 ? "One answer" : `${unchecked} answers`} could not be checked and{" "}
            {unchecked === 1 ? "is" : "are"} not counted for or against you.
          </p>
        )}
        {practice && (
          <p className="mt-2 text-xs text-muted-foreground">
            Practice run. Not counted toward your graded score.
          </p>
        )}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={() => navigate("/activities")}
            className="h-11 px-7 bg-[hsl(var(--ac-emerald-strong))] text-white hover:bg-[hsl(var(--ac-emerald))]"
          >
            Done
          </Button>
          {onPractice && (
            <Button
              variant="outline"
              onClick={onPractice}
              className="h-11 px-7"
            >
              Practice again
            </Button>
          )}
        </div>
      </div>

      {ledger && <IndicatorLedgerPanel ledger={ledger} onRedrill={onRedrill} />}

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

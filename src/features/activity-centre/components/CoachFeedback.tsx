import { cn } from "@/lib/utils";
import type { ActivityItem, Verdict } from "../api/types";

interface CoachFeedbackProps {
  verdict: Verdict;
  feedback: string;
  /** When true, show the credited answer + explanation reveal. */
  revealed: boolean;
  item: ActivityItem;
}

const VERDICT_STYLE: Record<Verdict, { label: string; chip: string; dot: string }> = {
  correct: {
    label: "Correct",
    chip: "bg-[hsl(var(--state-correct)/0.12)] text-[hsl(var(--ac-emerald-strong))]",
    dot: "bg-[hsl(var(--state-correct))]",
  },
  partial: {
    label: "Almost",
    chip: "bg-[hsl(var(--state-warn)/0.14)] text-[hsl(38_92%_34%)]",
    dot: "bg-[hsl(var(--state-warn))]",
  },
  incorrect: {
    label: "Not yet",
    chip: "bg-[hsl(var(--state-incorrect)/0.12)] text-[hsl(350_80%_45%)]",
    dot: "bg-[hsl(var(--state-incorrect))]",
  },
};

/** Coach verdict chip + message, with the optional credited-answer reveal. */
export function CoachFeedback({ verdict, feedback, revealed, item }: CoachFeedbackProps) {
  const style = VERDICT_STYLE[verdict];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            style.chip,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
          {style.label}
        </span>
      </div>

      {feedback && <p className="text-[15px] leading-relaxed text-foreground/85">{feedback}</p>}

      {revealed && (
        <div className="rounded-2xl border border-border bg-[hsl(var(--muted)/0.5)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Credited answer
          </p>
          <p className="mt-1.5 text-[15px] font-medium text-foreground">
            {item.credited_answers[0]}
          </p>
          {item.credited_answers.length > 1 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Also accepted: {item.credited_answers.slice(1).join(" · ")}
            </p>
          )}
          {item.explanation && (
            <p className="mt-3 text-sm leading-relaxed text-foreground/75">{item.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}

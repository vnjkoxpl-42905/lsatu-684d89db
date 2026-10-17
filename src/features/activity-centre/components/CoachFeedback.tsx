import { relationshipExplanation, relationshipFeedback } from "../relationshipPresentation";
import { cn } from "@/lib/utils";
import type { ActivityItem, FeedbackState } from "../api/types";
import { renderInlineMarks } from "../prompt-format";

interface CoachFeedbackProps {
  verdict: FeedbackState;
  feedback: string;
  /** When true, show the credited answer. Only a reveal earns that. */
  revealed: boolean;
  /**
   * When true, the item is finished one way or another. The authored
   * explanation shows from here on, including on a correct answer: it names the
   * indicator word and the discrimination the item teaches, and withholding it
   * from the students who are getting it right is backwards.
   */
  resolved: boolean;
  /**
   * What to call the credited answers after the first. Authored per Activity,
   * because the generic wording is wrong wherever the second answer is not an
   * alternative phrasing: in Conditional Rephrase it is the contrapositive, the
   * other half of what the task asked for.
   */
  secondaryLabel?: string;
  item: ActivityItem;
  activitySlug?: string;
}

const DEFAULT_SECONDARY_LABEL = "Also accepted";

const VERDICT_STYLE: Record<FeedbackState, { label: string; chip: string; dot: string }> = {
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
  // Deliberately neutral. The student answered and nobody read it; the app has
  // no basis for the red chip it used to show here.
  unchecked: {
    label: "Not checked",
    chip: "bg-[hsl(var(--muted))] text-muted-foreground",
    dot: "bg-[hsl(var(--muted-foreground)/0.6)]",
  },
};

/** Coach verdict chip + message, the authored teaching note, and the reveal. */
export function CoachFeedback({
  verdict,
  feedback,
  revealed,
  resolved,
  secondaryLabel,
  item,
  activitySlug,
}: CoachFeedbackProps) {
  const isRelationship = activitySlug === "spot-the-relationship";
  const explanation = isRelationship ? relationshipExplanation(item, activitySlug) : item.explanation;
  const feedbackText = isRelationship ? relationshipFeedback(feedback) : feedback;
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

      {feedbackText && !(isRelationship && resolved && explanation) && <p className="text-[15px] leading-relaxed text-foreground">{feedbackText}</p>}

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
              {secondaryLabel || DEFAULT_SECONDARY_LABEL}: {item.credited_answers.slice(1).join(" · ")}
            </p>
          )}
        </div>
      )}

      {resolved && explanation && (
        <p className="border-l-2 border-[hsl(var(--ac-emerald)/0.35)] pl-4 text-sm leading-relaxed text-foreground">
          {/* Explanations are authored with the same *emphasis* marks as
              prompts. Printed raw, a student read the asterisks. */}
          {renderInlineMarks(explanation, "explanation")}
        </p>
      )}
    </div>
  );
}

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityItem, CoachVerdict } from "../api/types";
import { MAX_ATTEMPTS } from "../api/types";
import { CoachFeedback } from "./CoachFeedback";

interface AnswerPanelProps {
  item: ActivityItem;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
  onShowAnswer: () => void;
  onNext: () => void;
  judging: boolean;
  attempts: number;
  result: CoachVerdict | null;
  revealed: boolean;
  resolved: boolean;
  isLast: boolean;
  /** Authored per Activity: what this drill actually asks the student to write. */
  answerLabel?: string;
  answerPlaceholder?: string;
}

/** Neutral copy for Activities that never authored their own. Deliberately not
 *  the negation wording, which is wrong for every drill but Negation Station. */
const DEFAULT_ANSWER_LABEL = "Your answer";
const DEFAULT_ANSWER_PLACEHOLDER = "Write your answer…";

const emeraldBtn =
  "w-full md:w-auto bg-[hsl(var(--ac-emerald))] text-white hover:bg-[hsl(var(--ac-emerald-strong))] h-12 px-6 text-[15px] font-medium rounded-xl";

/** Right panel: textarea, submit, and the coach feedback / retry / reveal flow. */
export function AnswerPanel({
  item,
  value,
  onChange,
  onSubmit,
  onRetry,
  onShowAnswer,
  onNext,
  judging,
  attempts,
  result,
  revealed,
  resolved,
  isLast,
  answerLabel,
  answerPlaceholder,
}: AnswerPanelProps) {
  const canSubmit = value.trim().length > 0 && !judging && !resolved;
  const showRetry = !!result && result.verdict !== "correct" && !revealed && attempts < MAX_ATTEMPTS;
  // Picked this item back up mid-attempt: the count came from the saved log,
  // not from anything that happened on this screen, so say so rather than
  // letting the student spend their last try thinking it is their first.
  const resumedMidItem = attempts > 0 && !result && !resolved;

  return (
    <div className="flex h-full flex-col rounded-[24px] border border-border bg-card p-7 shadow-[0_1px_2px_rgba(30,24,16,0.05)] md:p-9">
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {answerLabel ?? DEFAULT_ANSWER_LABEL}
      </label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={answerPlaceholder ?? DEFAULT_ANSWER_PLACEHOLDER}
        disabled={judging || resolved || revealed}
        rows={4}
        className="mt-3 resize-none rounded-2xl border-border bg-[hsl(var(--background))] text-[15px] leading-relaxed focus-visible:ring-0"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) onSubmit();
        }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!resolved && !showRetry && (
          <Button onClick={onSubmit} disabled={!canSubmit} className={emeraldBtn}>
            {judging ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
          </Button>
        )}
        {resumedMidItem && (
          <span className="text-xs text-muted-foreground">
            Picked up where you left off. Attempt {attempts} of {MAX_ATTEMPTS} already used.
          </span>
        )}
        {showRetry && (
          <>
            <Button onClick={onRetry} className={emeraldBtn} disabled={judging}>
              Try again
            </Button>
            <Button variant="ghost" onClick={onShowAnswer} disabled={judging} className="text-muted-foreground">
              Show answer
            </Button>
            <span className="text-xs text-muted-foreground">
              Attempt {attempts} of {MAX_ATTEMPTS}
            </span>
          </>
        )}
        {resolved && (
          <Button onClick={onNext} className={emeraldBtn}>
            {isLast ? "Finish" : "Next"}
          </Button>
        )}
      </div>

      {result && (
        <div className="mt-6 border-t border-border pt-6">
          <CoachFeedback verdict={result.verdict} feedback={result.feedback} revealed={revealed} item={item} />
        </div>
      )}
    </div>
  );
}

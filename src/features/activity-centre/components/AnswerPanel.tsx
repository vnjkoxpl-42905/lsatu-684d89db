import { useEffect, useId, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityItem, FeedbackState } from "../api/types";
import { MAX_ATTEMPTS } from "../api/types";
import { CoachFeedback } from "./CoachFeedback";

interface AnswerPanelProps {
  item: ActivityItem;
  activitySlug?: string;
  /** So the item can put the cursor back in the box on Try again and on Next. */
  answerRef?: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
  onShowAnswer: () => void;
  onNext: () => void;
  judging: boolean;
  /** The previous Spot hint stays visible while the student revises. */
  retrying?: boolean;
  attempts: number;
  result: { verdict: FeedbackState; feedback: string; covered?: number[] } | null;
  revealed: boolean;
  resolved: boolean;
  isLast: boolean;
  /** Authored per Activity: what this drill actually asks the student to write. */
  answerLabel?: string;
  answerPlaceholder?: string;
  /** Authored per Activity: what the credited answers after the first are called. */
  creditedSecondaryLabel?: string;
}

/** Neutral copy for Activities that never authored their own. Deliberately not
 *  the negation wording, which is wrong for every drill but Negation Station. */
const DEFAULT_ANSWER_LABEL = "Your answer";
const DEFAULT_ANSWER_PLACEHOLDER = "Write your answer…";

const emeraldBtn =
  "w-full md:w-auto bg-[hsl(var(--ac-emerald-strong))] text-white hover:bg-[hsl(var(--ac-emerald-strong))] h-12 px-6 text-[15px] font-medium rounded-xl";

/** Right panel: textarea, submit, and the coach feedback / retry / reveal flow. */
export function AnswerPanel({
  item,
  activitySlug,
  answerRef,
  value,
  onChange,
  onSubmit,
  onRetry,
  onShowAnswer,
  onNext,
  judging,
  retrying = false,
  attempts,
  result,
  revealed,
  resolved,
  isLast,
  answerLabel,
  answerPlaceholder,
  creditedSecondaryLabel,
}: AnswerPanelProps) {
  const answerId = useId();
  const canSubmit = value.trim().length > 0 && !judging && !resolved;
  const showRetry = !retrying && !!result && result.verdict !== "correct" && !revealed && attempts < MAX_ATTEMPTS;
  // Picked this item back up mid-attempt: the count came from the saved log,
  // not from anything that happened on this screen, so say so rather than
  // letting the student spend their last try thinking it is their first.
  const resumedMidItem = attempts > 0 && !result && !resolved;

  /**
   * Where the verdict is read. Focus lands here when the item resolves, so the
   * announcement is also the place the student is standing: from here Enter
   * continues, and nothing needs the mouse.
   */
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (resolved) feedbackRef.current?.focus();
  }, [resolved]);

  return (
    <div
      aria-busy={judging}
      className="flex h-full flex-col rounded-[24px] border border-border bg-card p-7 shadow-[0_1px_2px_rgba(30,24,16,0.05)] md:p-9"
      onKeyDown={(e) => {
        // Enter continues once there is nothing left to answer. A button under
        // the cursor keeps its own Enter, so this never double-fires.
        if (!resolved || e.key !== "Enter" || e.shiftKey) return;
        if ((e.target as HTMLElement).closest("button")) return;
        e.preventDefault();
        onNext();
      }}
    >
      <label htmlFor={answerId} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {answerLabel ?? DEFAULT_ANSWER_LABEL}
      </label>
      <Textarea
        id={answerId}
        ref={answerRef}
        aria-keyshortcuts="Control+Enter Meta+Enter"
        // Every world's entrance autofocuses; the box the student actually
        // types in did not. Over 62 questions that is 62 mouse trips.
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={answerPlaceholder ?? DEFAULT_ANSWER_PLACEHOLDER}
        disabled={judging || resolved || revealed}
        rows={4}
        className="mt-3 resize-none rounded-2xl border-border bg-[hsl(var(--background))] text-[15px] leading-relaxed text-foreground disabled:opacity-100"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) onSubmit();
        }}
      />
      {!resolved && <div className="mt-4 flex flex-wrap items-center gap-3">
        {!resolved && !showRetry && (
          <Button onClick={onSubmit} disabled={!canSubmit} className={emeraldBtn}>
            {judging ? (
              <>
                <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                <span role="status">Checking answer…</span>
              </>
            ) : "Submit"}
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
            <Button variant="ghost" onClick={onShowAnswer} disabled={judging} className="text-foreground underline-offset-4 hover:underline">
              Show answer
            </Button>
            <span className="text-xs text-muted-foreground">
              Attempt {attempts} of {MAX_ATTEMPTS}
            </span>
          </>
        )}
      </div>}

      {/* A screen-reader user got silence after submitting: the chip and the
          prose both rendered with nothing announcing them. */}
      {result && (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          className="mt-6 border-t border-border pt-6 outline-none"
          role="status"
          aria-live="polite"
        >
          <CoachFeedback
            verdict={result.verdict}
            feedback={result.feedback}
            revealed={revealed}
            resolved={resolved}
            secondaryLabel={creditedSecondaryLabel}
            item={item}
            activitySlug={activitySlug}
          />
        </div>
      )}
      {resolved && (
        <div className="mt-6">
          <Button onClick={onNext} className={emeraldBtn}>
            {isLast ? "Finish" : "Next"}
          </Button>
        </div>
      )}
    </div>
  );
}

import * as React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Ordered list of qids in the current session. */
  questionQueue: string[];
  /** Current 0-based index. */
  currentIndex: number;
  /** Set of qids with at least one recorded attempt. Drives the "answered" state. */
  attemptedQids: Set<string>;
  /** When true, ovals can be clicked to jump to that index. */
  jumpEnabled: boolean;
  onJumpTo: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Bottom strip inside the official testing frame. One oval per question;
 * current is bold with an I-beam marker; answered is filled.
 *
 * Per audit constraint #1, no per-question flag dots in v1 because the
 * current state model only tracks `isFlagged` for the focused question.
 */
export default function OfficialAnswerNavigator({
  questionQueue,
  currentIndex,
  attemptedQids,
  jumpEnabled,
  onJumpTo,
  onPrev,
  onNext,
}: Props) {
  const total = questionQueue.length;
  if (total === 0) return null;

  // Ovals are positional (i + 1), not the question's qnum — matches the
  // official testing UI convention. The pane header shows the real qnum.

  return (
    <div className="border-t border-slate-200 bg-slate-100">
      <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
        <ol className="flex items-end gap-1.5 flex-wrap min-w-0 flex-1">
          {questionQueue.map((qid, i) => {
            const isCurrent = i === currentIndex;
            const isAnswered = attemptedQids.has(qid);
            const isClickable = jumpEnabled && i !== currentIndex;
            return (
              <li key={qid} className="relative flex flex-col items-center">
                {isCurrent && (
                  <>
                    <span
                      aria-hidden
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-px h-2 bg-slate-700"
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => isClickable && onJumpTo(i)}
                  disabled={!isClickable}
                  aria-current={isCurrent ? "true" : undefined}
                  aria-label={`Question ${i + 1}${isAnswered ? ", answered" : ""}${isCurrent ? ", current" : ""}`}
                  className={cn(
                    "min-w-[28px] h-7 px-2 rounded-full text-[12px] tabular-nums border transition-colors",
                    isCurrent
                      ? "border-slate-700 bg-white text-slate-900 font-bold"
                      : isAnswered
                      ? "border-slate-400 bg-slate-300 text-slate-800"
                      : "border-slate-300 bg-white text-slate-600",
                    isClickable && "hover:bg-slate-200 cursor-pointer",
                    !isClickable && !isCurrent && "cursor-default",
                  )}
                >
                  {i + 1}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex <= 0}
            aria-label="Previous question"
            className="rounded border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex >= total - 1}
            aria-label="Next question"
            className="rounded border-2 border-slate-700 bg-white p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

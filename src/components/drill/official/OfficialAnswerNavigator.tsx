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
  /** Optional reason shown as a tooltip when jumpEnabled is false (e.g. "Paused"). */
  jumpDisabledReason?: string;
  onJumpTo: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Bottom strip inside the official testing frame. Mirrors the LawHub layout:
 * a row of small empty ovals, with the question number rendered BELOW each
 * oval. The current question's number is bold, with a thin I-beam tick
 * above its oval.
 */
export default function OfficialAnswerNavigator({
  questionQueue,
  currentIndex,
  attemptedQids,
  jumpEnabled,
  jumpDisabledReason,
  onJumpTo,
  onPrev,
  onNext,
}: Props) {
  const total = questionQueue.length;
  if (total === 0) return null;

  return (
    <div className="border-t-2 border-slate-300 bg-white shadow-[0_-2px_6px_rgba(0,0,0,0.06)] mt-auto">
      <div className="px-6 py-4 flex items-end gap-3">
        <ol className="flex items-end gap-2 flex-nowrap overflow-x-auto min-w-0 flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {questionQueue.map((qid, i) => {
            const isCurrent = i === currentIndex;
            const isAnswered = attemptedQids.has(qid);
            const isClickable = jumpEnabled && i !== currentIndex;
            return (
              <li
                key={qid}
                className="relative flex flex-col items-center shrink-0 pt-2"
              >
                {isCurrent && (
                  <span
                    aria-hidden
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-[10px] bg-slate-900"
                  />
                )}
                <button
                  type="button"
                  onClick={() => isClickable && onJumpTo(i)}
                  disabled={!isClickable}
                  aria-current={isCurrent ? "true" : undefined}
                  aria-label={`Question ${i + 1}${isAnswered ? ", answered" : ""}${isCurrent ? ", current" : ""}${
                    !isClickable && !isCurrent && jumpDisabledReason ? `, ${jumpDisabledReason}` : ""
                  }`}
                  title={
                    !isClickable && !isCurrent && jumpDisabledReason
                      ? jumpDisabledReason
                      : undefined
                  }
                  className={cn(
                    "w-[28px] h-[15px] rounded-full border border-slate-500 transition-colors",
                    isAnswered ? "bg-slate-400" : "bg-white",
                    isClickable && "hover:bg-slate-200 cursor-pointer",
                    !isClickable && !isCurrent && "cursor-default",
                  )}
                />
                <span
                  className={cn(
                    "mt-0.5 text-[13px] tabular-nums leading-none",
                    isCurrent
                      ? "font-bold text-slate-900"
                      : "text-slate-700",
                  )}
                >
                  {i + 1}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex items-center gap-2 shrink-0 self-end pb-1">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex <= 0}
            aria-label="Previous question"
            className="rounded-sm border border-slate-500 bg-white w-10 h-10 flex items-center justify-center text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex >= total - 1}
            aria-label="Next question"
            className="rounded-sm border border-slate-500 bg-white w-10 h-10 flex items-center justify-center text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

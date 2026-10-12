import * as React from "react";
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
  /** Reason shown as a tooltip when jumping is off (e.g. "Paused"). */
  jumpDisabledReason?: string;
  /** A full official section uses the printed number, which can have gaps. */
  useOfficialQuestionNumbers?: boolean;
  onJumpTo: (index: number) => void;
}

/**
 * The row of ovals from the LawHub bottom strip: one oval per question, its
 * number printed below, the current question's number bold under a thin I-beam
 * tick.
 *
 * One oval is one QUESTION, never an answer choice. That distinction is the
 * whole reason this is navigation and not a scorecard: an oval says where you
 * are, where you have been, and where you may go — current, answered, jumpable —
 * and deliberately says nothing about whether an answer was right. A section
 * never reveals, so the question never arose there; a built set does reveal, and
 * the answer is still no.
 *
 * Extracted so the section (`OfficialAnswerNavigator`) and a built set (the
 * `pager` slot of `OfficialSmartDrillBar`) render the same strip rather than two
 * copies that drift.
 */
export default function AnswerOvals({
  questionQueue,
  currentIndex,
  attemptedQids,
  jumpEnabled,
  jumpDisabledReason,
  useOfficialQuestionNumbers = false,
  onJumpTo,
}: Props) {
  if (questionQueue.length === 0) return null;

  return (
    <ol className="flex items-end gap-2 flex-nowrap overflow-x-auto min-w-0 flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {questionQueue.map((qid, i) => {
        const officialNumber = Number(/-Q(\d+)$/.exec(qid)?.[1]);
        const displayNumber = useOfficialQuestionNumbers && Number.isFinite(officialNumber)
          ? officialNumber
          : i + 1;
        const isCurrent = i === currentIndex;
        const isAnswered = attemptedQids.has(qid);
        const isClickable = jumpEnabled && i !== currentIndex;
        return (
          <li key={qid} className="relative flex flex-col items-center shrink-0 pt-2">
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
              aria-label={`Question ${displayNumber}${isAnswered ? ", answered" : ""}${isCurrent ? ", current" : ""}${
                !isClickable && !isCurrent && jumpDisabledReason ? `, ${jumpDisabledReason}` : ""
              }`}
              title={
                !isClickable && !isCurrent && jumpDisabledReason ? jumpDisabledReason : undefined
              }
              className={cn(
                "w-[28px] h-[15px] rounded-full border transition-colors",
                isAnswered ? "bg-slate-400" : "bg-white",
                "border-slate-500",
                isClickable && "hover:bg-slate-200 cursor-pointer",
                !isClickable && !isCurrent && "cursor-default",
              )}
            />
            <span
              className={cn(
                "mt-0.5 text-[13px] tabular-nums leading-none",
                isCurrent ? "font-bold text-slate-900" : "text-slate-700",
              )}
            >
              {displayNumber}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

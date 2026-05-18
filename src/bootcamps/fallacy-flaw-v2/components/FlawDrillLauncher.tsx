/**
 * FlawDrillLauncher — button + modal that opens real LSAT bank questions
 * filtered to a specific Fallacy Bootcamp flaw id. Uses the shared
 * LRQuestionModal so the experience matches Smart Drill.
 */
import * as React from "react";
import { Target, Loader2 } from "lucide-react";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import LRQuestionModal from "@/components/drill/shared/LRQuestionModal";
import {
  getQueueForFlaw,
  getQuestionsForFlaw,
} from "../lib/flawMatcher";

interface Props {
  flawId: string;
  flawName: string;
  variant?: "primary" | "ghost" | "compact";
  className?: string;
}

export const FlawDrillLauncher: React.FC<Props> = ({
  flawId,
  flawName,
  variant = "primary",
  className = "",
}) => {
  const { isLoading } = useQuestionBank();
  const [open, setOpen] = React.useState(false);

  const queue = React.useMemo(
    () => (isLoading ? [] : getQueueForFlaw(flawId, 15)),
    [flawId, isLoading],
  );
  const count = React.useMemo(
    () => (isLoading ? 0 : getQuestionsForFlaw(flawId).length),
    [flawId, isLoading],
  );

  const disabled = isLoading || queue.length === 0;

  const base =
    "inline-flex items-center gap-2 transition-all text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-40 disabled:cursor-not-allowed";
  const variantCls =
    variant === "ghost"
      ? "px-3 py-2 border border-[#1a1a1a]/20 text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f5f2ed]"
      : variant === "compact"
      ? "px-2.5 py-1.5 border border-[#1a1a1a]/15 text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:border-[#1a1a1a]"
      : "px-5 py-3 bg-[#1a1a1a] text-[#f5f2ed] hover:bg-[#1a1a1a]/85";

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`${base} ${variantCls} ${className}`}
        title={
          isLoading
            ? "Loading question bank…"
            : queue.length === 0
            ? "No LSAT bank questions tagged for this flaw yet"
            : `Drill ${count} LSAT bank questions tagged with this flaw`
        }
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Target className="h-3 w-3" />
        )}
        {isLoading
          ? "Loading…"
          : queue.length === 0
          ? "No LSAT questions yet"
          : `Drill ${count} LSAT Q${count === 1 ? "" : "s"}`}
      </button>

      {open && queue.length > 0 && (
        <LRQuestionModal
          initialQid={queue[0]}
          queue={queue}
          attemptMode="bootcamp-fallacy"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

export default FlawDrillLauncher;

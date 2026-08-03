import * as React from "react";
import { ClipboardCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  /** When true, the correct answer is revealed automatically after submitting. */
  autoReveal: boolean;
  onAutoRevealChange: (next: boolean) => void;
  /** "submit" before an answer is committed, "next" after. */
  primaryAction: "submit" | "next";
  /** Submit disabled until an answer is selected (or while paused). */
  primaryDisabled?: boolean;
  onSubmit: () => void;
  onNext: () => void;
  onSkip: () => void;
  /** Disabled once the question is attempted / while paused. */
  skipDisabled?: boolean;
  onEnd: () => void;
  /** Opens the question drawer on Details. Hidden if omitted. */
  onOpenMenu?: () => void;
  /**
   * Reveals the answer and the whole inline explanation layer at once. Not
   * gated on having attempted — pressed early it is the escape hatch, and the
   * caller confirms that the question will not be scored.
   */
  onShowAnswer?: () => void;
  /** Rarely used now that Answer is ungated; kept for paused/edge states. */
  showAnswerDisabled?: boolean;
  /** Opens the drawer on the Explanation tab. Hidden if omitted. */
  onAskTutor?: () => void;
  /** Label for the tutor button (context-aware, e.g. "Strategize" / "Explain"). */
  askTutorLabel?: string;
  /** Disabled until something is revealed, so the breakdown cannot leak. */
  askTutorDisabled?: boolean;
  /** Whole bar disabled (e.g. while paused). */
  disabled?: boolean;
}

/**
 * Smart Drill (adaptive) bottom action bar. Replaces the arrow navigator used
 * by fixed-queue modes. Left: End. Right: auto-reveal toggle, Skip, and a
 * primary Submit/Next pill.
 */
export default function OfficialSmartDrillBar({
  autoReveal,
  onAutoRevealChange,
  primaryAction,
  primaryDisabled,
  onSubmit,
  onNext,
  onSkip,
  skipDisabled,
  onEnd,
  onOpenMenu,
  onShowAnswer,
  showAnswerDisabled,
  onAskTutor,
  askTutorLabel = "Ask Joshua",
  askTutorDisabled,
  disabled,
}: Props) {
  const isNext = primaryAction === "next";

  return (
    <div className="border-t-2 border-slate-300 bg-white shadow-[0_-2px_6px_rgba(0,0,0,0.06)] mt-auto">
      <div className="px-6 py-4 flex items-center gap-3">
        {/* Left: End */}
        <button
          type="button"
          onClick={onEnd}
          disabled={disabled}
          className="rounded-full border border-slate-400 bg-white text-slate-700 px-5 py-2 text-[14px] font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          End
        </button>

        {/* Menu — opens the question drawer on Details */}
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            disabled={disabled}
            className="rounded-full border border-slate-400 bg-white text-slate-700 px-5 py-2 text-[14px] font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Menu
          </button>
        )}

        {/* Answer / Explanation pair, mirroring LSAT Lab's review controls.
            Answer reveals the correct letter plus the inline per-choice layer;
            Explanation opens the drawer's question-level breakdown. */}
        {onShowAnswer && (
          <button
            type="button"
            onClick={onShowAnswer}
            disabled={disabled || showAnswerDisabled}
            className="rounded-full border border-slate-400 bg-white text-slate-700 px-5 py-2 text-[14px] font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Answer
          </button>
        )}

        {/* Explanation — the authored write-up, or the AI tutor when the
            source published none for this question. */}
        {onAskTutor && (
          <button
            type="button"
            onClick={onAskTutor}
            disabled={disabled || askTutorDisabled}
            title={askTutorDisabled ? "Answer or reveal the question first" : undefined}
            className="rounded-full border border-slate-400 bg-white text-slate-700 px-5 py-2 text-[14px] font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {askTutorLabel}
          </button>
        )}

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-3">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <label
                  className={cn(
                    "flex items-center gap-2 cursor-pointer select-none",
                    disabled && "opacity-40 pointer-events-none",
                  )}
                >
                  <ClipboardCheck
                    className={cn(
                      "w-4 h-4 transition-colors",
                      autoReveal ? "text-[#7f1d1d]" : "text-slate-400",
                    )}
                  />
                  <Switch
                    checked={autoReveal}
                    onCheckedChange={onAutoRevealChange}
                    disabled={disabled}
                    aria-label="Auto-reveal correct answer after answering"
                    className="data-[state=checked]:bg-[#7f1d1d]"
                  />
                </label>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] text-center">
                Toggle on to automatically show correct answers after answering
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {!isNext && (
            <button
              type="button"
              onClick={onSkip}
              disabled={disabled || skipDisabled}
              className="rounded-full border border-slate-400 bg-white text-slate-700 px-6 py-2 text-[14px] font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Skip
            </button>
          )}

          <button
            type="button"
            onClick={isNext ? onNext : onSubmit}
            disabled={disabled || (!isNext && primaryDisabled)}
            className="rounded-full bg-slate-900 text-white px-7 py-2 text-[14px] font-semibold hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isNext ? "Next" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

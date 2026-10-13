import * as React from "react";

/** Outline pill shared by Previous, Next, and Skip. */
const OUTLINE_PILL_CLASS =
  "rounded-full border border-slate-400 bg-white text-slate-700 px-6 py-2 text-[14px] font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

interface Props {
  /** "submit" before an answer is committed, "next" after. */
  primaryAction: "submit" | "next";
  /** Submit disabled until an answer is selected (or while paused). */
  primaryDisabled?: boolean;
  /** Overrides the primary pill's label ("Submit" / "Next"). */
  primaryLabel?: string;
  /** Hide the primary pill entirely (read-only review has no action). */
  primaryVisible?: boolean;
  onSubmit: () => void;
  onNext: () => void;
  /** Omit to hide Skip. */
  onSkip?: () => void;
  /** Disabled once the question is attempted / while paused. */
  skipDisabled?: boolean;
  /**
   * Fixed-queue navigation. A built set is a list the student can walk in both
   * directions, so it gets Previous/Next pills instead of the one-way Skip.
   * Smart Drill picks each question on the fly and has no earlier question to
   * return to, so it keeps Skip and omits these.
   */
  onPrev?: () => void;
  prevDisabled?: boolean;
  onAdvance?: () => void;
  advanceDisabled?: boolean;
  /**
   * RC's per-question pager shares the control row on wide screens and moves
   * below the controls when the available width is smaller.
   */
  pager?: React.ReactNode;
  /** Overrides the left action's label. Review exits rather than ends. */
  endLabel?: string;
  onEnd: () => void;
  /** Opens the question drawer on Details. Hidden if omitted. */
  onOpenMenu?: () => void;
  /** Names the optional drawer action for the surface using this bar. */
  menuLabel?: string;
  /** Whole bar disabled (e.g. while paused). */
  disabled?: boolean;
}

/**
 * Smart Drill (adaptive) bottom action bar. Replaces the arrow navigator used
 * by fixed-queue modes. Left: End and Menu. Right: the queue walk (Previous/Next for a fixed queue, Skip for the adaptive one),
 * and a primary Submit/Next pill. Answer and Explanation deliberately are not
 * here — they sit in the header strip (`OfficialSessionStrip`), because four
 * controls crowded this bar's left corner.
 */
export default function OfficialSmartDrillBar({
  primaryAction,
  primaryDisabled,
  primaryLabel,
  primaryVisible = true,
  onSubmit,
  onNext,
  onSkip,
  skipDisabled,
  onPrev,
  prevDisabled,
  onAdvance,
  advanceDisabled,
  pager,
  endLabel,
  onEnd,
  onOpenMenu,
  menuLabel = "Menu",
  disabled,
}: Props) {
  const isNext = primaryAction === "next";

  return (
    <div className="border-t-2 border-slate-300 bg-white shadow-[0_-2px_6px_rgba(0,0,0,0.06)] mt-auto">
      {/* Keep the pager beside the actions on wide screens and let it take
          its own row when longer labels would squeeze the question buttons. */}
      <div className={`px-3 sm:px-6 py-1.5 flex items-center gap-3${pager ? " flex-wrap" : ""}`}>
        {/* Left: End */}
        <button
          type="button"
          onClick={onEnd}
          disabled={disabled}
          className="rounded-full border border-slate-400 bg-white text-slate-700 px-5 py-2 text-[14px] font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {endLabel ?? "End"}
        </button>

        {/* Menu — opens the question drawer on Details */}
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            disabled={disabled}
            className="rounded-full border border-slate-400 bg-white text-slate-700 px-5 py-2 text-[14px] font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {menuLabel}
          </button>
        )}

        {pager ? (
          <div className="order-last flex w-full min-w-0 items-end self-stretch lg:order-none lg:w-auto lg:flex-1">{pager}</div>
        ) : null}

        {/* Right cluster */}
        <div className="ml-auto flex shrink-0 items-center gap-3">

          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              disabled={disabled || prevDisabled}
              className={OUTLINE_PILL_CLASS}
            >
              Previous
            </button>
          )}

          {onAdvance && (
            <button
              type="button"
              onClick={onAdvance}
              disabled={disabled || advanceDisabled}
              className={OUTLINE_PILL_CLASS}
            >
              Next
            </button>
          )}

          {onSkip && !isNext && (
            <button
              type="button"
              onClick={onSkip}
              disabled={disabled || skipDisabled}
              className={OUTLINE_PILL_CLASS}
            >
              Skip
            </button>
          )}

          {primaryVisible && (
            <button
              type="button"
              onClick={isNext ? onNext : onSubmit}
              disabled={disabled || (!isNext && primaryDisabled)}
              className="rounded-full bg-slate-900 text-white px-7 py-2 text-[14px] font-semibold hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {primaryLabel ?? (isNext ? "Next" : "Submit")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

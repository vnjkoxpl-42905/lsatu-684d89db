import * as React from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface Props {
  breadcrumbs: BreadcrumbItem[];
  isPaused?: boolean;
  onTogglePause?: () => void;
  onComplete?: () => void;
  /**
   * Show the Answer pill. Colours the correct letter (and a wrong pick).
   *
   * Answer and Explanation are independent on/off toggles, LSAT Lab's shape:
   * pressed again each puts its own layer away and leaves the other alone.
   * Nothing locks. In the legacy modes the caller still couples them and may
   * confirm before a pre-attempt reveal; the strip does not know or care.
   */
  showAnswerVisible?: boolean;
  onShowAnswer?: () => void;
  /** Disabled while paused, or where revealing mid-section defeats the exercise. */
  showAnswerDisabled?: boolean;
  /** True while the answer is revealed — flips the pill to its "hide" state. */
  showAnswerActive?: boolean;
  /** Toggles the Explanation layer (breakdown + Choice Note expanders). Hidden if omitted. */
  onExplanation?: () => void;
  /** Label for the explanation pill (context-aware). */
  explanationLabel?: string;
  /** Disabled until something is revealed, so the breakdown cannot leak. */
  explanationDisabled?: boolean;
  /** True while the explanation layer is up — flips the pill to its "hide" state. */
  explanationActive?: boolean;
  /** Noun used in pause/complete labels: "Section" (default) or "Question". */
  pauseNoun?: string;
  /** Label for the complete/end action. Defaults to the LawHub-style full-section wording. */
  completeLabel?: string;
  /**
   * Opens the Help sheet. Lives here rather than as a floating bubble: the FAB
   * sat over the question card's bottom-right corner, which is the runner's
   * content, not its chrome. Hidden if omitted.
   */
  onOpenHelp?: () => void;
}

/** Shared gray pill. Narrow padding on small screens so the cluster still fits. */
const PILL_CLASS =
  "rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-blue-900 px-3 sm:px-5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-100";

/** A pill whose state is currently on, so pressing it again undoes it. */
const ACTIVE_PILL_CLASS =
  "bg-[#7f1d1d] hover:bg-[#991b1b] border-[#7f1d1d] text-white";

/**
 * Content of the white global header bar. Breadcrumb on the left,
 * gray pill action buttons on the right.
 */
export default function OfficialSessionStrip({
  breadcrumbs,
  isPaused,
  onTogglePause,
  onComplete,
  showAnswerVisible,
  onShowAnswer,
  showAnswerDisabled,
  showAnswerActive,
  onExplanation,
  explanationLabel = "Explanation",
  explanationDisabled,
  explanationActive,
  pauseNoun = "Section",
  completeLabel = "Complete Section",
  onOpenHelp,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 w-full text-[14px]">
      {/* Left: breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 min-w-0 flex-1 truncate text-[15px]">
        {breadcrumbs.map((bc, i) => {
          const isLast = i === breadcrumbs.length - 1;
          const isClickable = !isLast && !!bc.onClick;
          return (
            <React.Fragment key={`${bc.label}-${i}`}>
          {i > 0 && <span aria-hidden className="text-slate-300">/</span>}
              {isClickable ? (
                <button
                  type="button"
                  onClick={bc.onClick}
                  className="text-blue-700 hover:text-blue-800 font-semibold transition-colors"
                >
                  {bc.label}
                </button>
              ) : (
                <span
                  className={isLast ? "text-[#7f1d1d] font-semibold" : "text-blue-700 font-semibold"}
                  aria-current={isLast ? "page" : undefined}
                >
                  {bc.label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Right: gray pill buttons. Answer and Explanation live here rather than
          in the bottom bar — four controls crowded that bar's left corner, and
          these two are review actions, the same register as Pause. */}
      <div
        role="group"
        aria-label="Session actions"
        className="flex w-full flex-wrap items-center justify-end gap-2 shrink-0 sm:w-auto"
      >
        {showAnswerVisible && onShowAnswer && (
          <button
            type="button"
            onClick={onShowAnswer}
            disabled={showAnswerDisabled}
            aria-pressed={!!showAnswerActive}
            title={showAnswerActive ? "Hide correct answer" : "Show correct answer"}
            className={cn(PILL_CLASS, showAnswerActive && ACTIVE_PILL_CLASS)}
          >
            {showAnswerActive ? "Hide Answer" : "Answer"}
          </button>
        )}
        {onExplanation && (
          <button
            type="button"
            onClick={onExplanation}
            disabled={explanationDisabled}
            aria-pressed={!!explanationActive}
            title={explanationActive ? "Hide explanations" : "Show explanations"}
            className={cn(PILL_CLASS, explanationActive && ACTIVE_PILL_CLASS)}
          >
            {explanationActive ? `Hide ${explanationLabel}` : explanationLabel}
          </button>
        )}
        {onOpenHelp && (
          <button
            type="button"
            onClick={onOpenHelp}
            aria-label="Get help from Joshua"
            title="Get help from Joshua"
            className="rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-blue-900 h-[30px] w-[30px] inline-flex items-center justify-center transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
        {onTogglePause && (
          <button type="button" onClick={onTogglePause} className={PILL_CLASS}>
            {isPaused ? `Resume ${pauseNoun}` : `Pause ${pauseNoun}`}
          </button>
        )}
        {onComplete && (
          <button type="button" onClick={() => onComplete()} className={PILL_CLASS}>
            {completeLabel}
          </button>
        )}
      </div>
    </div>
  );
}

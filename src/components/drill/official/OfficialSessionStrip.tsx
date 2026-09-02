import * as React from "react";
import { HelpCircle } from "lucide-react";

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
   * Show the Answer pill. Reveals the correct letter plus the inline
   * explanation layer; pressed before an attempt it is the escape hatch and
   * the caller confirms the question will not be scored.
   */
  showAnswerVisible?: boolean;
  onShowAnswer?: () => void;
  /** Disabled while paused, or where revealing mid-section defeats the exercise. */
  showAnswerDisabled?: boolean;
  /** Whether the answer is currently revealed (toggles pill styling). */
  showAnswerActive?: boolean;
  /** Opens the question drawer on the Explanation tab. Hidden if omitted. */
  onExplanation?: () => void;
  /** Label for the explanation pill (context-aware). */
  explanationLabel?: string;
  /** Disabled until something is revealed, so the breakdown cannot leak. */
  explanationDisabled?: boolean;
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
  onExplanation,
  explanationLabel = "Explanation",
  explanationDisabled,
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
      <div className="flex items-center gap-2 shrink-0">
        {showAnswerVisible && onShowAnswer && (
          <button
            type="button"
            onClick={onShowAnswer}
            disabled={showAnswerDisabled}
            className={PILL_CLASS}
          >
            Answer
          </button>
        )}
        {onExplanation && (
          <button
            type="button"
            onClick={onExplanation}
            disabled={explanationDisabled}
            title={explanationDisabled ? "Answer or reveal the question first" : undefined}
            className={PILL_CLASS}
          >
            {explanationLabel}
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

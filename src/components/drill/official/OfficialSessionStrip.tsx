import * as React from "react";

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface Props {
  breadcrumbs: BreadcrumbItem[];
  isPaused?: boolean;
  onTogglePause?: () => void;
  onComplete?: () => void;
  /** When true, show a "Show Answer" pill button (typically when an answer is selected and not yet revealed). */
  showAnswerVisible?: boolean;
  onShowAnswer?: () => void;
}

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
}: Props) {
  return (
    <div className="flex items-center justify-between gap-4 w-full text-[14px]">
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

      {/* Right: gray pill buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {showAnswerVisible && onShowAnswer && (
          <button
            type="button"
            onClick={onShowAnswer}
            className="rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-blue-900 px-5 py-1.5 text-[13px] font-medium transition-colors"
          >
            Show Answer
          </button>
        )}
        {onTogglePause && (
          <button
            type="button"
            onClick={onTogglePause}
            className="rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-blue-900 px-5 py-1.5 text-[13px] font-medium transition-colors"
          >
            {isPaused ? "Resume Section" : "Pause Section"}
          </button>
        )}
        {onComplete && (
          <button
            type="button"
            onClick={onComplete}
            className="rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-blue-900 px-5 py-1.5 text-[13px] font-medium transition-colors"
          >
            Complete Section
          </button>
        )}
      </div>
    </div>
  );
}

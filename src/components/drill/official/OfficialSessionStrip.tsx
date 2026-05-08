import * as React from "react";

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface Props {
  breadcrumbs: BreadcrumbItem[];
  isPaused?: boolean;
  onTogglePause?: () => void;
  onComplete: () => void;
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
              {i > 0 && <span aria-hidden className="text-slate-400">/</span>}
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
        {onTogglePause && (
          <button
            type="button"
            onClick={onTogglePause}
            className="rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-blue-900 px-5 py-1.5 text-[14px] font-medium transition-colors"
          >
            {isPaused ? "Resume Section" : "Pause Section"}
          </button>
        )}
        <button
          type="button"
          onClick={onComplete}
          className="rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-blue-900 px-5 py-1.5 text-[14px] font-medium transition-colors"
        >
          Complete Section
        </button>
      </div>
    </div>
  );
}

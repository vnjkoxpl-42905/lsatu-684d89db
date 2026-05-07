import * as React from "react";

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface Props {
  /**
   * Breadcrumb items rendered on the left of the strip. Last item is treated
   * as the current location (rendered without a link). Example:
   *   [
   *     { label: "Library", onClick: () => navigate("/practice") },
   *     { label: "The Official LSAT PrepTest 101", onClick: ... },
   *     { label: "Section 2" },
   *   ]
   */
  breadcrumbs: BreadcrumbItem[];
  isPaused?: boolean;
  /** Undefined when no pausable timer (e.g. unlimited stopwatch modes). */
  onTogglePause?: () => void;
  onComplete: () => void;
}

/**
 * Session strip rendered on the navy backdrop, ABOVE the white test paper.
 * Mirrors the LawHub layout: breadcrumb left, "Pause Section" + "Complete
 * Section" pill buttons right. The timer is NOT here — it lives only in
 * the toolbar's dark-red box.
 */
export default function OfficialSessionStrip({
  breadcrumbs,
  isPaused,
  onTogglePause,
  onComplete,
}: Props) {
  return (
    <div className="mx-auto max-w-[1180px] mb-3 sm:mb-4 px-1 sm:px-2 flex items-center gap-3 text-[13px]">
      {/* Left: breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 min-w-0 flex-1 truncate">
        {breadcrumbs.map((bc, i) => {
          const isLast = i === breadcrumbs.length - 1;
          const isClickable = !isLast && !!bc.onClick;
          return (
            <React.Fragment key={`${bc.label}-${i}`}>
              {i > 0 && <span aria-hidden className="text-slate-500">/</span>}
              {isClickable ? (
                <button
                  type="button"
                  onClick={bc.onClick}
                  className="text-sky-300 hover:text-sky-200 transition-colors"
                >
                  {bc.label}
                </button>
              ) : (
                <span
                  className={isLast ? "text-rose-300 font-medium" : "text-slate-300"}
                  aria-current={isLast ? "page" : undefined}
                >
                  {bc.label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Right: Pause Section + Complete Section pills */}
      <div className="flex items-center gap-2 shrink-0">
        {onTogglePause && (
          <button
            type="button"
            onClick={onTogglePause}
            className="rounded border border-slate-400 bg-transparent px-3 py-1 text-[13px] text-slate-100 hover:bg-white/10 transition-colors"
          >
            {isPaused ? "Resume Section" : "Pause Section"}
          </button>
        )}
        <button
          type="button"
          onClick={onComplete}
          className="rounded border border-slate-400 bg-transparent px-3 py-1 text-[13px] text-slate-100 hover:bg-white/10 transition-colors"
        >
          Complete Section
        </button>
      </div>
    </div>
  );
}

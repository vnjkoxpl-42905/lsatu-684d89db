import * as React from "react";
import { ArrowLeft, Pause as PauseIcon, Play as PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Section/drill title shown centered (truncates on small screens). */
  sectionTitle: string;
  /** Pre-formatted timer label (e.g. "20:41"). When empty, the timer is hidden. */
  timerLabel?: string;
  isPaused?: boolean;
  /** Undefined when no pausable timer (e.g. unlimited stopwatch modes). */
  onTogglePause?: () => void;
  onExit?: () => void;
  onComplete: () => void;
}

/**
 * Thin session-level strip rendered on the navy outer frame, ABOVE the
 * white test paper. Holds Exit / pause / Finish / section title — none
 * of which exist on the real LawHub toolbar, but all of which we still
 * need somewhere. Keeping them out of the toolbar lets the testing
 * surface itself stay byte-faithful to the official UI.
 */
export default function OfficialSessionStrip({
  sectionTitle,
  timerLabel,
  isPaused,
  onTogglePause,
  onExit,
  onComplete,
}: Props) {
  return (
    <div className="mx-auto max-w-[1180px] mb-2 sm:mb-3 px-1 sm:px-2 flex items-center gap-3 text-slate-100 text-[12px]">
      {/* Left: exit */}
      {onExit ? (
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1.5 text-slate-200 hover:text-white transition-colors"
          aria-label="Exit drill"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Exit
        </button>
      ) : (
        <span aria-hidden className="w-12" />
      )}

      {/* Center: section title */}
      <div
        className="flex-1 text-center font-medium text-slate-200 truncate"
        title={sectionTitle}
      >
        {sectionTitle}
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-1.5 shrink-0">
        {timerLabel && (
          <span className="tabular-nums text-slate-300 font-medium hidden sm:inline">
            {timerLabel}
          </span>
        )}
        {onTogglePause && (
          <button
            type="button"
            onClick={onTogglePause}
            aria-label={isPaused ? "Resume" : "Pause"}
            title={isPaused ? "Resume" : "Pause"}
            className={cn(
              "p-1 rounded text-slate-200 hover:text-white hover:bg-white/10 transition-colors",
            )}
          >
            {isPaused ? <PlayIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={onComplete}
          className="text-slate-100 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 transition-colors font-medium"
        >
          Finish ✓
        </button>
      </div>
    </div>
  );
}

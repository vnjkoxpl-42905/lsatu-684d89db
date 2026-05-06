import * as React from "react";
import { HelpCircle } from "lucide-react";

interface Props {
  /** PT number, full-section only. */
  pt?: number;
  /** Section number (1-4), full-section only. */
  section?: number;
  /** True for full-section runs that have a real PT/section context. */
  isFullSection: boolean;
  /** Welcome label text. Falls back to "Student" if undefined. */
  displayName?: string | null;
  /** Hooked to the existing timer's pause/resume. */
  isPaused: boolean;
  /** Undefined when there is no timer to pause (e.g. unlimited stopwatch modes). */
  onTogglePause?: () => void;
  /** Hooked to the existing handleFinishSection. */
  onComplete: () => void;
  children: React.ReactNode;
}

/**
 * Official LSAT testing-format shell. Visual chrome only — every callback
 * routes to handlers that live in Drill.tsx. The component intentionally
 * uses raw color tokens rather than shadcn/design-system primitives so the
 * look matches the official testing UI rather than the rest of LSAT U.
 */
export default function OfficialDrillFrame({
  pt,
  section,
  isFullSection,
  displayName,
  isPaused,
  onTogglePause,
  onComplete,
  children,
}: Props) {
  const titleSegment = isFullSection && pt && section
    ? `The Official LSAT PrepTest ${pt}`
    : "Practice Drill";
  const tailSegment = isFullSection && pt && section
    ? `Section ${section}`
    : "Question Set";
  const completeLabel = isFullSection ? "Complete Section" : "Complete Drill";
  const pauseLabel = isFullSection ? "Pause Section" : "Pause Drill";
  const resumeLabel = "Resume";
  const welcome = displayName?.trim() || "Student";

  return (
    <div className="min-h-screen bg-slate-900 text-black font-sans">
      {/* Top white app bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          {/* Breadcrumb left */}
          <nav className="flex items-center gap-1.5 text-[14px] font-medium" aria-label="Breadcrumb">
            <span className="text-blue-700">Library</span>
            <span className="text-slate-400">/</span>
            <span className="text-blue-700">{titleSegment}</span>
            <span className="text-slate-400">/</span>
            <span className="text-purple-700">{tailSegment}</span>
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Help"
              aria-disabled="true"
              tabIndex={-1}
              className="text-red-500/70 inline-flex cursor-not-allowed"
              title="Help — coming soon"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <span className="text-slate-400">|</span>
            <span className="text-[14px] text-slate-800">Welcome, {welcome}</span>
            <button
              type="button"
              onClick={onTogglePause}
              disabled={!onTogglePause}
              title={onTogglePause ? undefined : "No timer to pause in this mode"}
              className="inline-flex items-center rounded-full bg-slate-100 hover:bg-slate-200 px-4 py-1.5 text-[13px] text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100"
            >
              {isPaused ? resumeLabel : pauseLabel}
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center rounded-full bg-slate-100 hover:bg-slate-200 px-4 py-1.5 text-[13px] text-slate-800 transition-colors"
            >
              {completeLabel}
            </button>
          </div>
        </div>
      </header>

      {/* Test frame */}
      <main className="px-4 sm:px-6 py-6">
        <div className="mx-auto max-w-[1100px] bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}

import * as React from "react";
import { Underline as UnderlineIcon, Pause as PauseIcon, Play as PlayIcon } from "lucide-react";
import type { HighlightColor } from "@/lib/highlightUtils";
import { cn } from "@/lib/utils";

type HighlightMode = "none" | "yellow" | "pink" | "orange" | "underline" | "erase";

interface Props {
  /** Section/drill title shown at the toolbar's far left, truncated. */
  sectionTitle: string;
  highlightMode: HighlightMode;
  setHighlightMode: (mode: HighlightMode) => void;
  /** Pre-formatted timer label, e.g. "20:41". Empty string when no timer. */
  timerLabel: string;
  /**
   * Total duration in ms for full-section countdown. Undefined for stopwatch /
   * unlimited modes — when undefined we render no progress bar.
   */
  totalMs?: number;
  /** Remaining ms for countdown; ignored if totalMs is undefined. */
  remainingMs?: number;
  isFullSection: boolean;
  isPaused: boolean;
  /** Undefined when there is no timer to pause (e.g. unlimited stopwatch modes). */
  onTogglePause?: () => void;
  /** Hooked to the existing handleFinishSection. */
  onComplete: () => void;
}

/**
 * Single toolbar that owns everything in the LawHub-style top bar:
 *   [Section title] [Find Text] [U + 3 markers + eraser] [line-spacing] [Aa]
 *   [Timer + progress bar] [Pause icon] [Finish]
 *
 * Highlight buttons map to the existing `setHighlightMode` so the existing
 * <HighlightedText> path keeps working unchanged. Find Text / Aa /
 * line-spacing are inert for v1 — we don't fake behavior.
 */
export default function OfficialDrillToolbar({
  sectionTitle,
  highlightMode,
  setHighlightMode,
  timerLabel,
  totalMs,
  remainingMs,
  isFullSection,
  isPaused,
  onTogglePause,
  onComplete,
}: Props) {
  const showProgressBar =
    isFullSection &&
    typeof totalMs === "number" &&
    totalMs > 0 &&
    typeof remainingMs === "number";
  const progressPct = showProgressBar
    ? Math.max(0, Math.min(100, ((totalMs - Math.max(0, remainingMs)) / totalMs) * 100))
    : 0;

  const tools: {
    mode: HighlightMode;
    label: string;
    icon: React.ReactNode;
    activeBg: string;
  }[] = [
    {
      mode: "underline",
      label: "Underline",
      icon: <UnderlineIcon className="w-4 h-4" />,
      activeBg: "bg-slate-200",
    },
    {
      mode: "yellow",
      label: "Yellow highlighter",
      icon: <MarkerIcon tipColor="#FACC15" />,
      activeBg: "bg-yellow-100",
    },
    {
      mode: "pink",
      label: "Pink highlighter",
      icon: <MarkerIcon tipColor="#EC4899" />,
      activeBg: "bg-pink-100",
    },
    {
      mode: "orange",
      label: "Orange highlighter",
      icon: <MarkerIcon tipColor="#F97316" />,
      activeBg: "bg-orange-100",
    },
    {
      mode: "erase",
      label: "Eraser",
      icon: <EraserIcon />,
      activeBg: "bg-rose-100",
    },
  ];

  const toggle = (mode: HighlightMode) => {
    setHighlightMode(highlightMode === mode ? "none" : mode);
  };

  // Timer verbiage:
  //  - Full-section countdown → "Section Time Remaining"
  //  - Stopwatch / non-section → "Elapsed"
  const timerLabelPrefix = isFullSection ? "Section Time Remaining" : "Elapsed";

  return (
    <div className="border-b border-slate-200 bg-slate-50">
      <div className="px-4 sm:px-6 py-2 flex flex-wrap items-center gap-3">
        {/* Left: section title */}
        <div
          className="text-[14px] font-semibold text-slate-900 truncate max-w-[260px]"
          title={sectionTitle}
        >
          {sectionTitle}
        </div>

        {/* Find Text input — inert per v1 (real find-text wiring deferred) */}
        <input
          type="text"
          disabled
          aria-disabled="true"
          placeholder="Find text..."
          title="Find text — coming soon"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-700 placeholder:text-slate-400 w-[160px] cursor-not-allowed"
        />

        {/* Annotation tools */}
        <div className="flex items-center gap-1">
          {tools.map((t) => (
            <button
              key={t.mode}
              type="button"
              onClick={() => toggle(t.mode)}
              aria-pressed={highlightMode === t.mode}
              aria-label={t.label}
              title={t.label}
              className={cn(
                "p-1.5 rounded transition-colors",
                highlightMode === t.mode ? t.activeBg : "hover:bg-slate-200",
              )}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Line-spacing + Aa — inert (line-spacing first to match real UI) */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Line spacing — coming soon"
          className="p-1.5 rounded text-slate-400 cursor-not-allowed"
        >
          <LineSpacingIcon />
          <span className="sr-only">Line spacing</span>
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Font size — coming soon"
          className="p-1.5 rounded text-slate-400 cursor-not-allowed text-[13px] font-semibold"
        >
          Aa
          <span className="sr-only">Font size</span>
        </button>

        {/* Right cluster: timer + progress bar + pause + Finish */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-[13px] tabular-nums text-slate-800">
            <span className="font-medium">{timerLabelPrefix}</span>
            <span>{timerLabel || "--:--"}</span>
            {showProgressBar && (
              <div
                role="progressbar"
                aria-valuenow={Math.round(progressPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 w-32 rounded bg-slate-200 overflow-hidden"
              >
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onTogglePause}
            disabled={!onTogglePause}
            aria-label={isPaused ? "Resume" : "Pause"}
            title={onTogglePause ? (isPaused ? "Resume" : "Pause") : "No timer to pause in this mode"}
            className="p-1.5 rounded text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            {isPaused ? <PlayIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onComplete}
            className="text-[13px] font-medium text-slate-800 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
          >
            Finish ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline marker / eraser SVGs ───────────────────────────────────────────
// Two-color, ≤24×24, no gradients — read at a glance, degrade well at zoom.

function MarkerIcon({ tipColor }: { tipColor: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#475569"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Pen barrel (rotated rectangle) */}
      <path d="M 5 19 L 14 10 L 19 15 L 10 24 Z" transform="translate(-1 -3)" />
      <path d="M 13 6 L 18 11" />
      {/* Tip */}
      <path d="M 4 16 L 9 21" stroke={tipColor} strokeWidth="3" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#475569"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Eraser body — pink top, gray bottom */}
      <rect x="4" y="6" width="16" height="6" rx="1" fill="#FBCFE8" />
      <rect x="4" y="12" width="16" height="6" rx="1" fill="#E2E8F0" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  );
}

function LineSpacingIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

// Re-export to avoid an unused-import warning from the shared type.
export type { HighlightColor };

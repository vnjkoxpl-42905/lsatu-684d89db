import * as React from "react";
import { Underline as UnderlineIcon, Highlighter, Eraser, Type, AlignLeft } from "lucide-react";
import type { HighlightColor } from "@/lib/highlightUtils";
import { cn } from "@/lib/utils";

type HighlightMode = "none" | "yellow" | "pink" | "orange" | "underline" | "erase";

interface Props {
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
}

/**
 * Toolbar inside the official testing frame. Highlight buttons map to the
 * existing `setHighlightMode` so the existing <HighlightedText> path keeps
 * working unchanged. Aa / line-spacing / Find Text / Directions are inert
 * for v1 (we don't fake behavior).
 */
export default function OfficialDrillToolbar({
  highlightMode,
  setHighlightMode,
  timerLabel,
  totalMs,
  remainingMs,
  isFullSection,
}: Props) {
  const showProgressBar = isFullSection && typeof totalMs === "number" && totalMs > 0 && typeof remainingMs === "number";
  const progressPct = showProgressBar
    ? Math.max(0, Math.min(100, ((totalMs - Math.max(0, remainingMs)) / totalMs) * 100))
    : 0;

  const tools: { mode: HighlightMode; label: string; icon: React.ReactNode; activeBg: string }[] = [
    { mode: "underline", label: "Underline", icon: <UnderlineIcon className="w-4 h-4" />, activeBg: "bg-slate-200" },
    { mode: "yellow", label: "Yellow highlighter", icon: <Highlighter className="w-4 h-4 text-yellow-500" />, activeBg: "bg-yellow-100" },
    { mode: "pink", label: "Pink highlighter", icon: <Highlighter className="w-4 h-4 text-pink-500" />, activeBg: "bg-pink-100" },
    { mode: "orange", label: "Orange highlighter", icon: <Highlighter className="w-4 h-4 text-orange-500" />, activeBg: "bg-orange-100" },
    { mode: "erase", label: "Eraser", icon: <Eraser className="w-4 h-4 text-rose-500" />, activeBg: "bg-rose-100" },
  ];

  const toggle = (mode: HighlightMode) => {
    setHighlightMode(highlightMode === mode ? "none" : mode);
  };

  const timerLabelPrefix = isFullSection ? "Section Time Remaining" : "Drill Time";

  return (
    <div className="border-b border-slate-200 bg-slate-50">
      <div className="px-4 sm:px-6 py-2 flex flex-wrap items-center gap-3">
        {/* Left: Directions + Find Text */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Directions — coming soon"
          className="rounded border border-slate-300 bg-white px-3 py-1 text-[13px] text-slate-700 cursor-not-allowed opacity-90"
        >
          Directions
        </button>
        <input
          type="text"
          aria-disabled="true"
          disabled
          placeholder="Find Text, Type Here"
          title="Find text — coming soon"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-700 placeholder:text-slate-400 w-[180px] cursor-not-allowed"
        />

        {/* Center: annotation tools */}
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

        <span className="text-slate-300">|</span>

        {/* Aa + line-spacing — inert */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Font size — coming soon"
          className="p-1.5 rounded text-slate-400 cursor-not-allowed"
        >
          <Type className="w-4 h-4" />
          <span className="sr-only">Font size</span>
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Line spacing — coming soon"
          className="p-1.5 rounded text-slate-400 cursor-not-allowed"
        >
          <AlignLeft className="w-4 h-4" />
          <span className="sr-only">Line spacing</span>
        </button>

        <span className="text-slate-300">|</span>

        {/* Right: timer + (conditional) progress bar */}
        <div className="ml-auto flex items-center gap-3">
          <div className="text-[13px] tabular-nums text-slate-800">
            <span className="font-medium">{timerLabelPrefix}:</span>{" "}
            <span>{timerLabel || "--:--"}</span>
          </div>
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
      </div>
    </div>
  );
}

// Re-export to avoid an unused-import warning from the shared type.
export type { HighlightColor };

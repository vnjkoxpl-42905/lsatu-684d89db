import * as React from "react";
import type { HighlightColor } from "@/lib/highlightUtils";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type HighlightMode = "none" | "yellow" | "pink" | "orange" | "underline" | "erase";

interface Props {
  highlightMode: HighlightMode;
  setHighlightMode: (mode: HighlightMode) => void;
  /** Pre-formatted timer label, e.g. "20:41". Empty string when no timer. */
  timerLabel: string;
  totalMs?: number;
  remainingMs?: number;
  isFullSection: boolean;
  /** When true (Build-a-Set), use the "Section Time Remaining" timer label. */
  isPracticeSet?: boolean;
}

/**
 * LawHub-style toolbar.
 * Layout (left → right):
 *   [Directions] [Find Text] | [U + 3 markers + eraser] | [Aa + line-spacing] | [Section Time Remaining: 00:00]
 */
export default function OfficialDrillToolbar({
  highlightMode,
  setHighlightMode,
  timerLabel,
  isFullSection,
  isPracticeSet,
}: Props) {
  const [directionsOpen, setDirectionsOpen] = React.useState(false);

  const tools: {
    mode: HighlightMode;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { mode: "underline", label: "Underline", icon: <UnderlineIcon /> },
    { mode: "yellow", label: "Yellow highlighter", icon: <MarkerIcon tipColor="#FACC15" /> },
    { mode: "pink", label: "Pink highlighter", icon: <MarkerIcon tipColor="#EC4899" /> },
    { mode: "orange", label: "Orange highlighter", icon: <MarkerIcon tipColor="#F97316" /> },
    { mode: "erase", label: "Eraser", icon: <EraserIcon /> },
  ];

  const toggle = (mode: HighlightMode) => {
    setHighlightMode(highlightMode === mode ? "none" : mode);
  };

  const timerLabelPrefix = isFullSection || isPracticeSet ? "Section Time Remaining" : "Elapsed";
  const paddedTimer = (timerLabel || "00:00").replace(/^(\d):/, "0$1:");

  return (
    <>
      <div className="border-b border-slate-300 bg-slate-50">
        <div className="px-3 sm:px-4 py-2.5 flex flex-wrap items-center gap-1.5 text-[14px] text-slate-800">
          {/* Directions pill */}
          <button
            type="button"
            onClick={() => setDirectionsOpen(true)}
            className="rounded-sm border border-slate-500 bg-white px-3 py-1.5 text-slate-900 hover:bg-slate-100 transition-colors text-[14px] font-semibold"
          >
            Directions
          </button>

          {/* Find Text input — inert in v1 */}
          <input
            type="text"
            disabled
            aria-disabled="true"
            placeholder="Find Text, Type Here"
            title="Find text — coming soon"
            className="ml-1 rounded-sm border border-slate-500 bg-white px-3 py-1.5 text-[14px] text-slate-700 placeholder:text-slate-400 w-[200px] cursor-not-allowed"
          />

          <PipeSeparator />

          {/* Annotation tools */}
          <div className="flex items-center gap-1">
            {tools.map((t, i) => {
              const isActive = highlightMode === t.mode;
              return (
                <button
                  key={t.mode}
                  type="button"
                  onClick={() => toggle(t.mode)}
                  aria-pressed={isActive}
                  aria-label={t.label}
                  title={t.label}
                  className={cn(
                    "p-1.5 rounded-sm transition-colors flex items-center justify-center",
                    isActive
                      ? "bg-white border border-slate-500 shadow-[inset_0_2px_3px_rgba(0,0,0,0.15)]"
                      : "border border-transparent hover:bg-slate-200",
                    t.mode === "erase" && "ml-1",
                  )}
                >
                  {t.icon}
                </button>
              );
            })}
          </div>

          <PipeSeparator />

          {/* Aa + line-spacing — inert v1 */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Font size — coming soon"
            className="px-2 py-1 rounded-sm text-slate-800 cursor-not-allowed flex items-baseline"
          >
            <span aria-hidden className="text-[20px] font-bold leading-none">A</span>
            <span aria-hidden className="text-[13px] font-bold leading-none">a</span>
            <span className="sr-only">Font size</span>
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Line spacing — coming soon"
            className="ml-1 p-1.5 rounded-sm text-slate-800 cursor-not-allowed"
          >
            <LineSpacingIcon />
            <span className="sr-only">Line spacing</span>
          </button>

          {/* Right cluster: timer in dark-red box */}
          <div className="ml-auto">
            <div
              role="timer"
              className="rounded-[2px] border-2 border-[#7f1d1d] text-black px-5 py-1.5 text-[14px] font-semibold tabular-nums whitespace-nowrap min-w-[240px] text-center"
            >
              {timerLabelPrefix}: {paddedTimer}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={directionsOpen} onOpenChange={setDirectionsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Logical Reasoning Directions</DialogTitle>
            <DialogDescription>
              Verbatim from the official LSAT directions for the Logical Reasoning section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-[14px] leading-relaxed text-slate-800">
            <p>
              The questions in this section are based on the reasoning contained in brief
              statements or passages. For some questions, more than one of the choices could
              conceivably answer the question. However, you are to choose the <em>best</em>{" "}
              answer; that is, the response that most accurately and completely answers the
              question. You should not make assumptions that are by commonsense standards
              implausible, superfluous, or incompatible with the passage.
            </p>
            <p>
              After you have chosen the best answer, blacken the corresponding space on your
              answer sheet.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Inline LawHub-style icons ─────────────────────────────────────────────

function UnderlineIcon() {
  // Bold capital U with thick underline bar
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4 V13 a6 6 0 0 0 12 0 V4" strokeWidth="2.6" />
      <line x1="4.5" y1="20.5" x2="19.5" y2="20.5" strokeWidth="2.8" />
    </svg>
  );
}

function MarkerIcon({ tipColor }: { tipColor: string }) {
  // LawHub-style felt-tip: angled barrel, gray cap shoulder, blunt colored nib (trapezoid).
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      stroke="#0f172a"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Barrel (angled 45°) */}
      <path d="M22 4 L28 10 L14 24 L8 18 Z" fill="#ffffff" />
      {/* Cap shoulder */}
      <path d="M22 4 L28 10 L25 13 L19 7 Z" fill="#94a3b8" />
      {/* Inner barrel divider */}
      <line x1="11" y1="15" x2="17" y2="21" />
      {/* Blunt colored nib (trapezoid) */}
      <path
        d="M8 18 L14 24 L9 29 L5 28 L4 24 Z"
        fill={tipColor}
        stroke="#0f172a"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function EraserIcon() {
  // Squared block: pink top half, white bottom half.
  return (
    <svg
      width="32"
      height="22"
      viewBox="0 0 32 22"
      fill="none"
      stroke="#0f172a"
      strokeWidth="1.8"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <rect x="2" y="2" width="28" height="18" fill="#ffffff" />
      <rect x="2" y="2" width="28" height="9" fill="#F9A8D4" />
      <line x1="2" y1="11" x2="30" y2="11" />
    </svg>
  );
}

function LineSpacingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {/* Up/down arrow on left */}
      <path d="M4 6 L4 18" />
      <path d="M2 8 L4 6 L6 8" />
      <path d="M2 16 L4 18 L6 16" />
      {/* Three lines */}
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function PipeSeparator() {
  return <span aria-hidden className="w-px h-6 bg-slate-500 mx-3" />;
}

export type { HighlightColor };

import * as React from "react";
import { Underline as UnderlineIcon } from "lucide-react";
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
  /**
   * Total duration in ms for full-section countdown. Currently unused — kept
   * for future timer-modal work. Toolbar now shows just the time, no progress
   * bar (matches the LawHub layout).
   */
  totalMs?: number;
  /** Remaining ms for countdown; ignored if totalMs is undefined. */
  remainingMs?: number;
  isFullSection: boolean;
  /** When true (Build-a-Set), use the "Section Time Remaining" timer label. */
  isPracticeSet?: boolean;
}

/**
 * LawHub-style toolbar. Layout (left → right):
 *
 *   [Directions] [Find Text] | [U + 3 markers + eraser] | [line-spacing + Aa] | [Section Time Remaining: 00:00]
 *
 * Pause / Finish / section-title used to live here; they are now in
 * <OfficialSessionStrip> on the navy outer frame so this row stays
 * faithful to the official testing UI.
 *
 * Find Text / Aa / line-spacing are inert in v1 — we don't fake behavior.
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
    activeBg: string;
  }[] = [
    {
      mode: "underline",
      label: "Underline",
      icon: <UnderlineIcon className="w-[22px] h-[22px] text-slate-600" strokeWidth={2.25} />,
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

  const timerLabelPrefix = isFullSection || isPracticeSet ? "Section Time Remaining" : "Elapsed";

  return (
    <>
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="px-3 sm:px-4 py-3 flex flex-wrap items-center gap-2 text-[14px] text-slate-800">
          {/* Directions pill (leftmost) */}
          <button
            type="button"
            onClick={() => setDirectionsOpen(true)}
            className="rounded-sm border border-slate-500 bg-white px-3 py-1.5 text-slate-900 hover:bg-slate-100 transition-colors text-[14px] font-semibold"
          >
            Directions
          </button>

          {/* Find Text input — inert per v1 */}
          <input
            type="text"
            disabled
            aria-disabled="true"
            placeholder="Find Text, Type Here"
            title="Find text — coming soon"
            className="rounded-sm border border-slate-500 bg-white px-3 py-1.5 text-[14px] text-slate-700 placeholder:text-slate-400 w-[170px] cursor-not-allowed"
          />

          <PipeSeparator />

          {/* Annotation tools */}
          <div className="flex items-center gap-0.5">
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

          <PipeSeparator />

          {/* Aa + line-spacing — inert v1 */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Font size — coming soon"
            className="p-2 rounded text-slate-700 cursor-not-allowed"
          >
            <span aria-hidden className="text-[20px] font-semibold">A</span>
            <span aria-hidden className="text-[14px] font-semibold">A</span>
            <span className="sr-only">Font size</span>
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Line spacing — coming soon"
            className="p-2 rounded text-slate-700 cursor-not-allowed"
          >
            <LineSpacingIcon />
            <span className="sr-only">Line spacing</span>
          </button>

          {/* Right cluster: timer in dark-red box */}
          <div className="ml-auto">
            <div
              role="timer"
              className="rounded-sm border-2 border-[#7f1d1d] text-black px-5 py-2 text-[15px] font-medium tabular-nums whitespace-nowrap"
            >
              {timerLabelPrefix}: {timerLabel || "00:00"}
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

// ─── Inline marker / eraser SVGs ───────────────────────────────────────────
// Slanted pen with a clearly colored tip; chunky two-tone eraser.

function MarkerIcon({ tipColor }: { tipColor: string }) {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1f2937"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3 L21 7 L19 9 L15 5 Z" fill="#cbd5e1" />
      <path d="M15 5 L19 9 L9 19 L5 15 Z" fill="#fff" />
      <line x1="7" y1="13" x2="11" y2="17" />
      <path
        d="M5 15 L9 19 L4 22 L3 21 Z"
        fill={tipColor}
        stroke={tipColor}
        strokeWidth="0.5"
      />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg
      width="36"
      height="24"
      viewBox="0 0 28 18"
      fill="none"
      stroke="#1f2937"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1.5" y="1.5" width="25" height="15" rx="2" fill="#fff" />
      <path d="M1.5 8.5 L1.5 3.5 Q1.5 1.5 3.5 1.5 L24.5 1.5 Q26.5 1.5 26.5 3.5 L26.5 8.5 Z" fill="#FBCFE8" />
      <line x1="1.5" y1="8.5" x2="26.5" y2="8.5" />
    </svg>
  );
}

function LineSpacingIcon() {
  return (
    <svg
      width="22"
      height="22"
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

function PipeSeparator() {
  return <span aria-hidden className="w-px h-7 bg-slate-300 mx-2" />;
}

export type { HighlightColor };

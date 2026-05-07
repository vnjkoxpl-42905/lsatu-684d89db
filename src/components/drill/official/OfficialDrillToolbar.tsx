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
      icon: <UnderlineIcon className="w-[18px] h-[18px]" />,
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

  const timerLabelPrefix = isFullSection ? "Section Time Remaining" : "Elapsed";

  return (
    <>
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2 text-[13px] text-slate-800">
          {/* Directions pill (leftmost) */}
          <button
            type="button"
            onClick={() => setDirectionsOpen(true)}
            className="rounded border border-slate-400 bg-white px-2.5 py-1 text-slate-800 hover:bg-slate-100 transition-colors text-[13px] font-medium"
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
            className="rounded border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-700 placeholder:text-slate-400 w-[180px] cursor-not-allowed"
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
            className="p-1.5 rounded text-slate-700 cursor-not-allowed text-[14px] font-semibold"
          >
            <span aria-hidden>A</span>
            <span aria-hidden className="text-[10px]">A</span>
            <span className="sr-only">Font size</span>
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Line spacing — coming soon"
            className="p-1.5 rounded text-slate-700 cursor-not-allowed"
          >
            <LineSpacingIcon />
            <span className="sr-only">Line spacing</span>
          </button>

          <PipeSeparator />

          {/* Right cluster: timer in dark-red box */}
          <div className="ml-auto">
            <div
              role="timer"
              className="rounded border-2 border-[#7f1d1d] text-[#7f1d1d] px-2.5 py-0.5 text-[13px] font-medium tabular-nums whitespace-nowrap"
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
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#475569"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Pen barrel — slanted ~45°, tip at lower-left */}
      <path d="M16 3 L21 8 L9 20 L3 21 L4 15 Z" fill="#fff" />
      <path d="M14 5 L19 10" />
      {/* Colored tip */}
      <path
        d="M3 21 L4 15 L9 20 Z"
        fill={tipColor}
        stroke={tipColor}
      />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#475569"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Eraser body — pink top, gray bottom, with separator line */}
      <rect x="3" y="6" width="18" height="6" rx="1.5" fill="#FBCFE8" />
      <rect x="3" y="12" width="18" height="6" rx="1.5" fill="#E2E8F0" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );
}

function LineSpacingIcon() {
  return (
    <svg
      width="18"
      height="18"
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
  return <span aria-hidden className="w-px h-5 bg-slate-300 mx-0.5" />;
}

// Re-export to avoid an unused-import warning from the shared type.
export type { HighlightColor };

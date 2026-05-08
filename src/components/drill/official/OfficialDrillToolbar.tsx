import * as React from "react";
import { Check } from "lucide-react";
import type { HighlightColor } from "@/lib/highlightUtils";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type HighlightMode = "none" | "yellow" | "pink" | "orange" | "underline" | "erase";

export const FONT_SCALES = [
  { key: "sm", label: "Small", value: 0.9 },
  { key: "md", label: "Medium", value: 1.0 },
  { key: "lg", label: "Large", value: 1.15 },
  { key: "xl", label: "Extra Large", value: 1.3 },
] as const;

interface Props {
  highlightMode: HighlightMode;
  setHighlightMode: (mode: HighlightMode) => void;
  /** Pre-formatted timer label, e.g. "20:41". Empty string when no timer. */
  timerLabel: string;
  /** Actual timer mode — drives label prefix exactly. Undefined hides timer box. */
  timerMode?: "countdown" | "stopwatch";
  /** Controlled Find Text value. */
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  /** Active font scale value (1.0 = default). */
  fontScale: number;
  setFontScale: (n: number) => void;
}

export default function OfficialDrillToolbar({
  highlightMode,
  setHighlightMode,
  timerLabel,
  timerMode,
  searchTerm,
  setSearchTerm,
  fontScale,
  setFontScale,
}: Props) {
  const [directionsOpen, setDirectionsOpen] = React.useState(false);
  const [aaOpen, setAaOpen] = React.useState(false);

  const tools: { mode: HighlightMode; label: string; icon: React.ReactNode }[] = [
    { mode: "underline", label: "Underline", icon: <UnderlineIcon /> },
    { mode: "yellow", label: "Yellow highlighter", icon: <MarkerIcon tipColor="#FACC15" /> },
    { mode: "pink", label: "Pink highlighter", icon: <MarkerIcon tipColor="#EC4899" /> },
    { mode: "orange", label: "Orange highlighter", icon: <MarkerIcon tipColor="#F97316" /> },
    { mode: "erase", label: "Eraser", icon: <EraserIcon /> },
  ];

  const toggle = (mode: HighlightMode) => {
    setHighlightMode(highlightMode === mode ? "none" : mode);
  };

  const timerLabelPrefix =
    timerMode === "countdown"
      ? "Section Time Remaining"
      : timerMode === "stopwatch"
      ? "Time Elapsed"
      : null;
  const paddedTimer = (timerLabel || "00:00").replace(/^(\d):/, "0$1:");

  return (
    <>
      <div className="border-b border-slate-300 bg-slate-50">
        <div className="px-3 sm:px-4 py-2 flex flex-wrap items-center gap-1.5 text-[14px] text-slate-800">
          <button
            type="button"
            onClick={() => setDirectionsOpen(true)}
            className="rounded-sm border border-slate-500 bg-white px-3 py-1.5 text-slate-900 hover:bg-slate-100 transition-colors text-[14px] font-semibold"
          >
            Directions
          </button>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Find Text, Type Here"
            aria-label="Find text in passage"
            className="ml-1 rounded-sm border border-slate-500 bg-white px-3 h-8 text-[13px] text-slate-800 placeholder:text-slate-400 w-[210px] focus:outline-none focus:ring-1 focus:ring-slate-700"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="text-[12px] text-slate-600 hover:text-slate-900 underline"
              aria-label="Clear search"
            >
              clear
            </button>
          )}

          {/* Right cluster: tools | Aa + line-spacing | timer */}
          <div className="ml-auto flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {tools.map((t) => {
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
                      "p-1 rounded-sm transition-colors flex items-center justify-center",
                      isActive
                        ? "bg-white border border-slate-700 shadow-[inset_0_2px_3px_rgba(0,0,0,0.18)]"
                        : "border border-transparent hover:bg-slate-200",
                    )}
                  >
                    {t.icon}
                  </button>
                );
              })}
            </div>

            <PipeSeparator />

            <Popover open={aaOpen} onOpenChange={setAaOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Text size"
                  title="Text size"
                  className={cn(
                    "px-2 py-1 rounded-sm text-slate-900 flex items-baseline transition-colors",
                    aaOpen
                      ? "bg-white border border-slate-700 shadow-[inset_0_2px_3px_rgba(0,0,0,0.18)]"
                      : "border border-transparent hover:bg-slate-200",
                  )}
                >
                  <span aria-hidden className="text-[20px] font-bold leading-none">A</span>
                  <span aria-hidden className="text-[13px] font-bold leading-none">a</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-44 p-1">
                {FONT_SCALES.map((opt) => {
                  const selected = Math.abs(fontScale - opt.value) < 0.001;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setFontScale(opt.value);
                        setAaOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1.5 text-[14px] rounded-sm hover:bg-slate-100 text-slate-800",
                        selected && "font-semibold",
                      )}
                    >
                      <span>{opt.label}</span>
                      {selected && <Check className="w-4 h-4 text-slate-700" />}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>

            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Line spacing — coming soon"
              className="p-1.5 rounded-sm text-slate-800 cursor-not-allowed"
            >
              <LineSpacingIcon />
              <span className="sr-only">Line spacing</span>
            </button>

            {timerLabelPrefix && (
              <>
                <PipeSeparator />
                <div
                  role="timer"
                  className="text-[14px] font-semibold text-slate-900 tabular-nums whitespace-nowrap pl-1"
                >
                  {timerLabelPrefix}: {paddedTimer}
                </div>
              </>
            )}
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
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4 V13 a6 6 0 0 0 12 0 V4" strokeWidth="2.8" />
      <line x1="4" y1="21" x2="20" y2="21" strokeWidth="3" />
    </svg>
  );
}

function MarkerIcon({ tipColor }: { tipColor: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      stroke="#0f172a"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Body */}
      <path d="M22 4 L28 10 L14 24 L8 18 Z" fill="#ffffff" />
      {/* Cap shoulder */}
      <path d="M22 4 L28 10 L25 13 L19 7 Z" fill="#94a3b8" />
      {/* Inner divider */}
      <line x1="11" y1="15" x2="17" y2="21" />
      {/* Trapezoid nib */}
      <path
        d="M8 18 L14 24 L9 29 L4 26 Z"
        fill={tipColor}
        stroke="#0f172a"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function EraserIcon() {
  // Squared block, slight tilt, pink top half / white bottom half.
  return (
    <svg
      width="30"
      height="22"
      viewBox="0 0 32 22"
      fill="none"
      stroke="#0f172a"
      strokeWidth="1.8"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <g transform="rotate(-4 16 11)">
        <rect x="2" y="2" width="28" height="18" fill="#ffffff" />
        <rect x="2" y="2" width="28" height="9" fill="#F9A8D4" />
        <line x1="2" y1="11" x2="30" y2="11" />
      </g>
    </svg>
  );
}

function LineSpacingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6 L4 18" />
      <path d="M2 8 L4 6 L6 8" />
      <path d="M2 16 L4 18 L6 16" />
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function PipeSeparator() {
  return <span aria-hidden className="w-px h-6 bg-slate-400 mx-2.5" />;
}

export type { HighlightColor };

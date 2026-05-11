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
  { key: "md", label: "Default", value: 1.0 },
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
              <PopoverContent align="start" sideOffset={6} className="w-56 p-2 bg-white border border-slate-200 shadow-lg rounded-md">
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
                        "w-full flex items-center justify-between px-3 py-2 text-[15px] rounded-sm hover:bg-slate-50 text-slate-900",
                      )}
                    >
                      <span>{opt.label}</span>
                      <span
                        aria-hidden
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                          selected ? "border-blue-600" : "border-slate-400",
                        )}
                      >
                        {selected && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                      </span>
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
            <DialogDescription className="sr-only">
              Directions for the LSAT Logical Reasoning section.
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
  // LawHub-style angled marker: colored body, BLACK cap on the upper-right,
  // small colored nib at lower-left, and a thin colored stroke beneath.
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 32 32"
      fill="none"
      stroke="#0f172a"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Colored body */}
      <path d="M21 3 L29 11 L13 27 L5 19 Z" fill={tipColor} />
      {/* Black cap (top-right) */}
      <path d="M21 3 L29 11 L25.5 14.5 L17.5 6.5 Z" fill="#0f172a" />
      {/* Inner divider near nib */}
      <line x1="9" y1="15" x2="17" y2="23" />
      {/* Nib (same color as body, slightly extended) */}
      <path d="M5 19 L13 27 L9 31 L1.5 27.5 Z" fill={tipColor} />
      {/* Marker stroke beneath */}
      <path
        d="M0 31 Q 5 29 11 31"
        stroke={tipColor}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EraserIcon() {
  // Pink rounded-rectangle block, slight tilt, dark outline.
  return (
    <svg
      width="28"
      height="22"
      viewBox="0 0 32 22"
      fill="none"
      stroke="#0f172a"
      strokeWidth="1.6"
      strokeLinejoin="round"
    >
      <g transform="rotate(-6 16 11)">
        <rect x="3" y="4" width="26" height="14" rx="2" fill="#EC9BAB" />
        {/* Subtle wear shading on bottom edge */}
        <path d="M3 14 L29 14" stroke="#0f172a" strokeWidth="0.8" opacity="0.35" />
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

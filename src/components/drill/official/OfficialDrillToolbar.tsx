import * as React from "react";
import { SECTION_DIRECTIONS } from "@/lib/sectionDirections";
import { FileText } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type HighlightMode = "none" | "yellow" | "pink" | "orange" | "underline" | "erase";

export const FONT_SCALES = [
  { key: "sm", label: "Small", value: 0.9 },
  { key: "md", label: "Default", value: 1.0 },
  { key: "lg", label: "Large", value: 1.15 },
  { key: "xl", label: "Extra Large", value: 1.3 },
] as const;

export interface ToolbarDirections {
  title: string;
  body: React.ReactNode;
  /** Screen-reader description of the dialog. */
  srDescription: string;
}

/**
 * The official LR section directions. Kept here as the default so the LR
 * player's call sites stay unchanged; RC passes its own set.
 */
export const LR_DIRECTIONS: ToolbarDirections = {
  title: "Directions",
  srDescription: "Directions for the LSAT Logical Reasoning section.",
  // LSAC's current digital wording, the same text the section's directions
  // page shows. The old paper-test version told students to blacken a space
  // on an answer sheet they do not have.
  body: <p>{SECTION_DIRECTIONS.lr}</p>,
};

interface FontScaleOption {
  key: string;
  label: string;
  value: number;
}

interface Props {
  highlightMode: HighlightMode;
  setHighlightMode: (mode: HighlightMode) => void;
  /** Pre-formatted timer label, e.g. "20:41". Empty string when no timer. */
  timerLabel: string;
  /** Actual timer mode — drives label prefix exactly. Undefined hides timer box. */
  timerMode?: "countdown" | "stopwatch";
  /** Paint the timer as overrun. A countdown that has passed zero keeps going. */
  timerOverBudget?: boolean;
  /**
   * Fraction of the section's time still left, 0..1. Drives the depleting bar
   * the official interface paints under the clock. Omit for a stopwatch or an
   * untimed section and the bar is not rendered — there is nothing to deplete.
   */
  timerProgress?: number;
  /** Controlled Find Text value. */
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  /** Active font scale value (1.0 = default). */
  fontScale: number;
  setFontScale: (n: number) => void;
  /** Show the notes toggle icon (Smart Drill only). */
  notesButtonVisible?: boolean;
  /** Whether the notes panel is currently open (drives the active state). */
  notesOpen?: boolean;
  onToggleNotes?: () => void;
  /**
   * Directions dialog contents. Defaults to the LR section directions; pass a
   * different set for another section, or `null` to hide the button entirely.
   */
  directions?: ToolbarDirections | null;
  /**
   * When set, the Directions button calls this instead of opening the dialog.
   * A full section uses it to swap the player for LawHub's directions screen,
   * clock still running, rather than a pop-up over the question.
   */
  onOpenDirections?: () => void;
  /**
   * Rendered in the left group between Directions and Find Text — the slot RC
   * uses for "Passage Only View", which sits there in the official interface.
   */
  leftTools?: React.ReactNode;
  /**
   * Rendered in the right cluster after the text controls and before the timer.
   * RC puts its find-match readout and the next/previous match buttons here.
   * (This used to claim response masking, a review grid and full screen, none
   * of which RC has ever passed.)
   */
  rightTools?: React.ReactNode;
  /**
   * Hide the underline/marker/eraser group. Only pass false for a surface that
   * has no text to annotate — the tools are part of the official look.
   */
  highlightToolsVisible?: boolean;
  /** Override the font-size options. Defaults to FONT_SCALES. */
  fontScaleOptions?: readonly FontScaleOption[];
  /**
   * Extra controls appended inside the Aa popover beneath a divider. RC puts
   * line height and color scheme here so text settings stay in one control.
   */
  a11yExtraSections?: React.ReactNode;
  /** RC groups all reading preferences under one visible Display control. */
  displayLabel?: string;
  /**
   * LR ⇄ RC section switch shown at the far left of the toolbar. Lets a student
   * jump straight from a Logical Reasoning drill into the RC passages and back.
   */
  sectionToggle?: {
    active: "lr" | "rc";
    onSelect: (section: "lr" | "rc") => void;
  };
  /**
   * Bookmark and study-mark controls, rendered at the end of the right
   * cluster. Omit on protected timed canvases.
   */
  studyTools?: React.ReactNode;
}

export default function OfficialDrillToolbar({
  highlightMode,
  setHighlightMode,
  timerLabel,
  timerMode,
  timerOverBudget,
  timerProgress,
  searchTerm,
  setSearchTerm,
  fontScale,
  setFontScale,
  notesButtonVisible,
  notesOpen,
  onToggleNotes,
  directions = LR_DIRECTIONS,
  onOpenDirections,
  leftTools,
  rightTools,
  highlightToolsVisible = true,
  fontScaleOptions = FONT_SCALES,
  a11yExtraSections,
  displayLabel = 'Text size',
  sectionToggle,
  studyTools,
}: Props) {
  const [directionsOpen, setDirectionsOpen] = React.useState(false);
  const [aaOpen, setAaOpen] = React.useState(false);
  const aaTriggerRef = React.useRef<HTMLButtonElement>(null);
  const currentFontLabel = fontScaleOptions.find(option => Math.abs(fontScale - option.value) < 0.001)?.label
    ?? `${Math.round(fontScale * 100)}%`;

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
  // The bar is the at-a-glance read; the digits are the precise one. It goes
  // amber in the last quarter and red in the last tenth so the student feels
  // the section closing without having to parse numbers mid-question.
  const timerFraction =
    typeof timerProgress === "number"
      ? Math.max(0, Math.min(1, timerProgress))
      : null;
  const timerBarColor =
    timerOverBudget || (timerFraction !== null && timerFraction <= 0.1)
      ? "bg-red-600"
      : timerFraction !== null && timerFraction <= 0.25
      ? "bg-amber-500"
      : "bg-green-600";

  return (
    <>
      <div className="border-b border-slate-300 bg-slate-50">
        <div className="px-3 sm:px-4 py-1 flex flex-wrap items-center gap-1.5 text-[14px] text-slate-800">
          {sectionToggle && (
            <div
              role="group"
              aria-label="Section"
              className="mr-1 inline-flex overflow-hidden rounded-sm border border-slate-500 bg-white"
            >
              {(["lr", "rc"] as const).map((section) => {
                const isActive = sectionToggle.active === section;
                return (
                  <button
                    key={section}
                    type="button"
                    aria-pressed={isActive}
                    title={section === "lr" ? "Logical Reasoning" : "Reading Comprehension passages"}
                    onClick={() => !isActive && sectionToggle.onSelect(section)}
                    className={cn(
                      "px-3 py-1.5 text-[13px] font-bold uppercase tracking-wider transition-colors",
                      isActive
                        ? "bg-[#7f1d1d] text-white"
                        : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    {section.toUpperCase()}
                  </button>
                );
              })}
            </div>
          )}

          {directions && (
            <button
              type="button"
              onClick={onOpenDirections ?? (() => setDirectionsOpen(true))}
              className="rounded-sm border border-slate-500 bg-white px-3 h-8 text-slate-900 hover:bg-slate-100 transition-colors text-[14px] font-semibold"
            >
              Directions
            </button>
          )}

          {leftTools}

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
          <div className="ml-0 flex w-full max-w-full flex-wrap items-center gap-1.5 sm:ml-auto sm:w-auto">
            {highlightToolsVisible && (
              <>
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
              </>
            )}

            <Popover open={aaOpen} onOpenChange={setAaOpen}>
              <PopoverTrigger asChild>
                <button
                  ref={aaTriggerRef}
                  type="button"
                  aria-label={displayLabel}
                  title={`${displayLabel}: ${currentFontLabel}`}
                  className={cn(
                    "px-2 py-1 rounded-sm text-slate-900 flex items-baseline transition-colors",
                    aaOpen
                      ? "bg-white border border-slate-700 shadow-[inset_0_2px_3px_rgba(0,0,0,0.18)]"
                      : "border border-transparent hover:bg-slate-200",
                  )}
                >
                  <span aria-hidden className="text-[20px] font-bold leading-none">A</span>
                  <span aria-hidden className="text-[13px] font-bold leading-none">a</span>
                  {displayLabel !== 'Text size' && <span className="ml-1 text-sm">{displayLabel}</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent aria-label="Reading preferences" align="end" sideOffset={6} collisionPadding={12}
                onCloseAutoFocus={(event) => { event.preventDefault(); aaTriggerRef.current?.focus(); }}
                className="w-64 max-w-[calc(100vw-24px)] p-2 bg-white border border-slate-200 shadow-lg rounded-md overflow-y-auto"
                style={{ maxHeight: 'min(70dvh, var(--radix-popover-content-available-height))' }}>
                <div className="px-3 pt-1 pb-2 text-sm font-semibold text-slate-900">Text size</div>
                <div role="group" aria-label="Text size options">
                {fontScaleOptions.map((opt) => {
                  const selected = Math.abs(fontScale - opt.value) < 0.001;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      aria-pressed={selected}
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
                </div>
                <p className="px-3 pt-2 text-xs text-slate-600">Current size: {currentFontLabel}</p>
                {a11yExtraSections}
              </PopoverContent>
            </Popover>

            {rightTools && (
              <>
                <PipeSeparator />
                <div className="flex items-center gap-0.5">{rightTools}</div>
              </>
            )}

            {timerLabelPrefix && (
              <div className="flex min-w-0 basis-full items-center sm:basis-auto">
                <PipeSeparator />
                <div className="min-w-0 pl-1 sm:min-w-[168px]">
                  <div
                    role="timer"
                    className={cn(
                      "text-[14px] font-semibold tabular-nums whitespace-normal",
                      timerOverBudget ? "text-red-700" : "text-slate-900",
                    )}
                  >
                    {timerLabelPrefix}: {paddedTimer}
                  </div>
                  {timerFraction !== null && (
                    <div
                      className="mt-1 h-[5px] w-full rounded-full bg-slate-200 overflow-hidden"
                      role="progressbar"
                      aria-label="Section time remaining"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(timerFraction * 100)}
                    >
                      <div
                        className={cn("h-full rounded-full transition-[width] duration-1000 ease-linear", timerBarColor)}
                        style={{ width: `${timerFraction * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {notesButtonVisible && onToggleNotes && (
              <>
                <PipeSeparator />
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={onToggleNotes}
                        aria-label={notesOpen ? "Close notes" : "Open notes"}
                        aria-pressed={!!notesOpen}
                        className={cn(
                          "p-1.5 rounded-sm transition-colors flex items-center justify-center",
                          notesOpen
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                            : "border border-transparent text-slate-800 hover:bg-slate-200",
                        )}
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {notesOpen ? "Close notes" : "Open notes"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            {studyTools && (
              <>
                <PipeSeparator />
                {studyTools}
              </>
            )}
          </div>
        </div>
      </div>

      {directions && !onOpenDirections && (
        <Dialog open={directionsOpen} onOpenChange={setDirectionsOpen}>
          {/* Dressed like the player it sits over, not like the app's dark
              chrome: white, plain sans, black text, the way LawHub shows its
              directions. */}
          <DialogContent className="max-w-3xl rounded-lg border-0 bg-white p-8 font-sans text-slate-900 [&>button]:text-slate-900">
            <DialogHeader>
              <DialogTitle className="text-center text-2xl font-semibold text-slate-900">
                {directions.title}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {directions.srDescription}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-[19px] leading-snug text-slate-900 [&_p]:m-0">
              {directions.body}
            </div>
          </DialogContent>
        </Dialog>
      )}
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

function PipeSeparator() {
  return <span aria-hidden className="w-px h-6 bg-slate-400 mx-2.5" />;
}

export type { HighlightColor };

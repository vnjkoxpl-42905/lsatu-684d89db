import type { Preferences, ReadingMode, ReaderTheme } from "./types";

export const DEFAULT_PREFERENCES: Preferences = {
  wpm: 200,
  reading_mode: "serial",
  number_of_lines: 1,
  words_per_line: 1,
  center_text: true,
  theme: "system",
  font_family: "Arial",
  font_size: 36,
  line_spacing: 1.0,
  punctuation_pauses: true,
  speed_variability: false,
  goal_wpm: 600,
};

export const WPM_MIN = 50;
export const WPM_MAX = 5000;
export const LINES_MIN = 1;
export const LINES_MAX = 6;
export const WORDS_PER_LINE_MIN = 1;
export const WORDS_PER_LINE_MAX = 6;
export const LINE_SPACING_MIN = 1.0;
export const LINE_SPACING_MAX = 2.0;
export const LINE_SPACING_STEP = 0.1;

export const READING_MODES: { value: ReadingMode; label: string }[] = [
  { value: "serial", label: "Serial" },
  { value: "flow", label: "Flow" },
  { value: "highlight", label: "Highlight" },
  { value: "scroll", label: "Scroll" },
  { value: "ereader", label: "e-Reader" },
];

export const THEMES: { value: ReaderTheme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "high_contrast", label: "High Contrast" },
  { value: "system", label: "System" },
];

/** Font label shown in the menu -> CSS font-family stack. */
export const FONTS: { label: string; stack: string }[] = [
  { label: "Arial", stack: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", stack: "'Times New Roman', Times, serif" },
  { label: "Verdana", stack: "Verdana, Geneva, sans-serif" },
  { label: "Calibri", stack: "Calibri, Carlito, sans-serif" },
  { label: "Microsoft Sans Serif", stack: "'Microsoft Sans Serif', Tahoma, sans-serif" },
  { label: "Impact", stack: "Impact, 'Arial Black', sans-serif" },
  { label: "Lucida Console", stack: "'Lucida Console', Monaco, monospace" },
  { label: "Comic Sans MS", stack: "'Comic Sans MS', 'Comic Sans', cursive" },
  { label: "Georgia", stack: "Georgia, serif" },
  { label: "Palatino Linotype", stack: "'Palatino Linotype', Palatino, 'Book Antiqua', serif" },
  { label: "Tahoma", stack: "Tahoma, Geneva, sans-serif" },
  { label: "Trebuchet MS", stack: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: "Courier New", stack: "'Courier New', Courier, monospace" },
  { label: "OpenDyslexic", stack: "OpenDyslexic, 'Comic Sans MS', sans-serif" },
  { label: "Antikor", stack: "Antikor, Georgia, serif" },
  { label: "Code New Roman", stack: "'Code New Roman', 'Courier New', monospace" },
  { label: "CQ Mono", stack: "'CQ Mono', 'Courier New', monospace" },
  { label: "Pointfree", stack: "Pointfree, 'Courier New', monospace" },
  { label: "Fira Mono", stack: "'Fira Mono', 'Courier New', monospace" },
];

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 44, 50, 56, 62, 68, 74];

/** Pause multipliers, applied only when a chunk is exactly one word. */
export const PAUSE_SENTENCE = 2.0;
export const PAUSE_PUNCTUATION = 1.5;
export const PAUSE_PARAGRAPH = 2.5;

/** Speed variability clamp. */
export const VARIABILITY_MIN = 0.75;
export const VARIABILITY_MAX = 1.5;

export const STAT_PERIODS = [
  { value: "24h", label: "24 Hours", ms: 24 * 3600_000 },
  { value: "7d", label: "7 Days", ms: 7 * 86400_000 },
  { value: "14d", label: "14 Days", ms: 14 * 86400_000 },
  { value: "30d", label: "30 Days", ms: 30 * 86400_000 },
  { value: "6m", label: "6 Months", ms: 182 * 86400_000 },
] as const;

/** Theme colours. High Contrast is fixed; the others use app tokens via classes. */
export const THEME_CLASSES: Record<Exclude<ReaderTheme, "system">, string> = {
  light: "bg-white text-zinc-900",
  dark: "bg-black text-white",
  high_contrast: "bg-black text-[#FFFF00]",
};

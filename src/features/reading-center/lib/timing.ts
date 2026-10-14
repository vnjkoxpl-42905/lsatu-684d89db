import type { Chunk, Preferences } from "./types";
import {
  PAUSE_PARAGRAPH, PAUSE_PUNCTUATION, PAUSE_SENTENCE, VARIABILITY_MAX, VARIABILITY_MIN,
} from "./constants";

export function msPerWord(wpm: number): number {
  return 60000 / wpm;
}

/** Pause multiplier for a one-word chunk. Returns 1 for multi-word chunks or when pauses are off. */
function pauseFactor(chunk: Chunk, pausesOn: boolean): number {
  const words = chunk.endWord - chunk.startWord + 1;
  if (!pausesOn || words !== 1) return 1;
  const t = chunk.rows[0][0];
  if (t.endsParagraph) return PAUSE_PARAGRAPH;
  if (t.endsSentence) return PAUSE_SENTENCE;
  if (t.hasPunctuation) return PAUSE_PUNCTUATION;
  return 1;
}

function chunkChars(chunk: Chunk): number {
  return chunk.rows.flat().reduce((n, t) => n + t.text.replace(/[^\p{L}\p{N}]/gu, "").length, 0);
}

/**
 * Display duration (ms) for every chunk, in order.
 * Speed variability: longer chunks get more time, shorter get less, clamped, then rescaled so the
 * total equals the no-variability total.
 */
export function chunkDurations(
  chunks: Chunk[],
  prefs: Pick<Preferences, "wpm" | "punctuation_pauses" | "speed_variability">,
): number[] {
  const base = msPerWord(prefs.wpm);
  const plain = chunks.map((c) => (c.endWord - c.startWord + 1) * base * pauseFactor(c, prefs.punctuation_pauses));
  if (!prefs.speed_variability || chunks.length === 0) return plain;

  const totalWords = chunks.reduce((n, c) => n + (c.endWord - c.startWord + 1), 0);
  const totalChars = chunks.reduce((n, c) => n + chunkChars(c), 0);
  const avgChars = totalChars / Math.max(1, totalWords);
  const varied = chunks.map((c, i) => {
    const words = c.endWord - c.startWord + 1;
    const raw = avgChars > 0 ? chunkChars(c) / (words * avgChars) : 1;
    const factor = Math.min(VARIABILITY_MAX, Math.max(VARIABILITY_MIN, raw));
    return plain[i] * factor;
  });
  const plainTotal = plain.reduce((a, b) => a + b, 0);
  const variedTotal = varied.reduce((a, b) => a + b, 0);
  const scale = variedTotal > 0 ? plainTotal / variedTotal : 1;
  return varied.map((d) => d * scale);
}

/** Milliseconds left from the start of chunk `fromChunk` to the end. */
export function remainingMs(durations: number[], fromChunk: number): number {
  let sum = 0;
  for (let i = Math.max(0, fromChunk); i < durations.length; i++) sum += durations[i];
  return sum;
}

/** "N minutes remaining", "1 minute remaining" or "Less than a minute remaining". */
export function formatRemaining(ms: number): string {
  if (ms < 60000) return "Less than a minute remaining";
  const m = Math.ceil(ms / 60000);
  return m === 1 ? "1 minute remaining" : `${m} minutes remaining`;
}

/** Whole-number percent of words read, 0 to 100. */
export function percentRead(wordIndex: number, totalWords: number): number {
  if (totalWords <= 0) return 0;
  return Math.min(100, Math.max(0, Math.floor((wordIndex / totalWords) * 100)));
}

/** Effective WPM for a session. Returns 0 if no active time. */
export function effectiveWpm(wordsRead: number, activeMs: number): number {
  if (activeMs <= 0) return 0;
  return Math.round(wordsRead / (activeMs / 60000));
}

/** Estimated whole minutes to read `words` at `wpm`, at least 1. */
export function estimateMinutes(words: number, wpm: number): number {
  return Math.max(1, Math.round(words / wpm));
}

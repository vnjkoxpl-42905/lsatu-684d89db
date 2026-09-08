/**
 * Cutting one stimulus's speech into the LINES she was rephrasing.
 *
 * The drill is line by line: she reads one line silently, looks away, says that
 * line back in her own words, then returns to the text for the next one. The
 * app never asks her which line she is on (ADR 0013) and it never will -- a tap
 * per line is ninety taps a section and one mistimed tap desyncs the whole
 * recording. So the split is worked out AFTERWARDS, from two things the run
 * already leaves behind:
 *
 * - **The silence.** She is silent while reading, so every spoken line arrives
 *   as its own burst with a gap in front of it. Bursts are the candidate units,
 *   and nothing here assumes she talks continuously.
 * - **The order.** She works top to bottom, so bursts map to lines in order.
 *   That makes this an alignment, not a classification: a burst can only belong
 *   to the line it is nearest to in sequence, which is far more robust than
 *   asking which line a paraphrase "sounds like".
 *
 * Wording is the tiebreak, not the decision. A rephrase shares content words
 * with the line it came from, so overlap picks between the two lines an
 * ordering leaves ambiguous.
 *
 * Nothing in this file is a boundary she is GRADED against. Coverage stays per
 * stimulus (ADR 0013); this exists so she can be shown, and hear, which line
 * each part of her run belongs to.
 */

export interface TimedWord {
  word: string;
  /** Seconds from the start of the recording, as the transcriber reports them. */
  start: number;
  end: number;
}

export interface Utterance {
  text: string;
  startMs: number;
  endMs: number;
}

export interface LineSpan {
  /** 1-based line number within the stimulus, matching the authored chunk. */
  n: number;
  /** The line as written. */
  text: string;
  /** What she said for it, joined in order. Empty when she said nothing. */
  spoken: string;
  startMs?: number;
  endMs?: number;
}

/**
 * The gap that separates one spoken line from the next, in milliseconds.
 *
 * She has to look back at the screen and read the next line silently before she
 * speaks again, so the real gaps are seconds long. This is set below the
 * shortest of those and above the pauses inside a sentence; it is a default
 * rather than a constant because it is the one number here that wants tuning
 * against real recordings.
 */
export const LINE_GAP_MS = 1200;

/** Break a stretch of words into bursts of speech separated by silence. */
export function splitUtterances(words: TimedWord[], gapMs = LINE_GAP_MS): Utterance[] {
  const out: Utterance[] = [];
  let current: TimedWord[] = [];
  let previousEnd = 0;

  const flush = () => {
    if (!current.length) return;
    out.push({
      text: current.map((w) => w.word).join(" ").trim(),
      startMs: Math.round(current[0].start * 1000),
      endMs: Math.round(current[current.length - 1].end * 1000),
    });
    current = [];
  };

  for (const w of words) {
    if (current.length && w.start * 1000 - previousEnd >= gapMs) flush();
    current.push(w);
    previousEnd = w.end * 1000;
  }
  flush();
  return out;
}

const STOP = new Set(
  ("a an and are as at be been but by for from had has have he her his i if in is it its of on or " +
    "she so that the their then there they this to was were what which who will with you your not no " +
    "do does did been being them these those we us our").split(" "),
);

function contentTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/**
 * How much a burst sounds like it came from a given line.
 *
 * Content words only, and symmetric-ish: a long burst about a short line should
 * not be punished for saying more than the line did. Zero is a legitimate
 * answer -- a pure reaction ("wait, that can't be right") shares no words with
 * anything -- which is why ordering, not this, decides the attribution.
 */
export function lineSimilarity(spoken: string, line: string): number {
  const a = new Set(contentTokens(spoken));
  const b = contentTokens(line);
  if (!a.size || !b.length) return 0;
  const hits = b.filter((t) => a.has(t)).length;
  return hits / b.length;
}

/**
 * How a spoken content word scores against a line.
 *
 * A word the line contains is a hit. A word some OTHER line contains, and this
 * one does not, is evidence the stretch has run on into a neighbour, and costs
 * a little; it is what stops one line's span from swallowing the next line's
 * retelling when she never paused between them. A word in no line at all -- a
 * reaction, a filler, her own phrasing -- is free either way, which is what
 * keeps a reaction with the line it followed.
 */
const FOREIGN_WORD_COST = 0.5;
/**
 * Starting a new line's span mid-phrase costs this much, in hit units. A stray
 * word from the neighbouring line is worth 1.5 to the wrong side (a hit for
 * one line, a foreign-word cost avoided for the other), so this sits above
 * that: one such word ("mathematical", in "the mathematical theory was based
 * on...") cannot buy a cut inside a phrase when a full stop or a breath sits a
 * few words away, and two lines' worth of content still can. Silence and sentence
 * ends are free; a comma is half price.
 */
const CUT_WITHOUT_SILENCE_COST = 2;

/**
 * Attribute her words to lines, in order.
 *
 * Every line takes one contiguous stretch of her words, or nothing, and the
 * stretches come in line order: she works top to bottom, so line 3's retelling
 * cannot come before line 2's. Within that rule the split is chosen to put each
 * line's content words with that line, which is what the silence alone could
 * not do. The first cut keyed off silence and dealt whole bursts to lines, so a
 * student who retold three lines in one breath had all three filed under line
 * 1 and lines 2 and 3 shown as skipped -- on the same card whose detail lists
 * said she carried them (PT1.S3 stimulus 1, 2026-09-08).
 *
 * Found exactly, by dynamic programming over word positions, for the same
 * reason the burst alignment was: one greedy mis-cut pushes every later line
 * onto the wrong words. Words are never left out. Whatever she said between two
 * retellings belongs to the earlier one, since that is what she had just read.
 *
 * A line she never spoke about comes back with an empty `spoken`, which is a
 * skip and must never be read as a pass.
 */
export function attributeWords(words: TimedWord[], lines: string[], gapMs = LINE_GAP_MS): LineSpan[] {
  const spans: LineSpan[] = lines.map((text, i) => ({ n: i + 1, text, spoken: "" }));
  const n = words.length;
  const k = lines.length;
  if (!k || !n) return spans;

  const lineTokens = lines.map((l) => new Set(contentTokens(l)));
  const wordTokens = words.map((w) => contentTokens(w.word)[0] ?? null);

  // gain[j][i]: what line j earns from the first i words, as a prefix sum, so
  // any stretch scores in O(1).
  const gain: number[][] = lineTokens.map((own) => {
    const prefix = new Array<number>(n + 1).fill(0);
    for (let i = 0; i < n; i++) {
      const t = wordTokens[i];
      let v = 0;
      if (t) {
        if (own.has(t)) v = 1;
        else if (lineTokens.some((other) => other.has(t))) v = -FOREIGN_WORD_COST;
      }
      prefix[i + 1] = prefix[i] + v;
    }
    return prefix;
  });

  // What it costs to begin a stretch at word i. Free after silence or a full
  // stop, since those are where a retelling of one line actually ends; cheap
  // after a comma; and the full price mid-phrase, so a cut never lands inside
  // "mathematical theory" when a breath or a period was a few words away.
  const cutCost = words.map((w, i) => {
    if (i === 0 || w.start * 1000 - words[i - 1].end * 1000 >= gapMs) return 0;
    const prev = words[i - 1].word;
    if (/[.?!]["')]*$/.test(prev)) return 0;
    if (/[,;:]["')]*$/.test(prev)) return CUT_WITHOUT_SILENCE_COST / 2;
    return CUT_WITHOUT_SILENCE_COST;
  });

  // best[j][i]: the best score with lines 0..j-1 placed and the first i words
  // used; the words 0..i-1 are all taken, by construction. from[j][i] records
  // the choice for the walk back: -1 means line j-1 took nothing.
  const NEG = -Infinity;
  const best: number[][] = Array.from({ length: k + 1 }, () => new Array<number>(n + 1).fill(NEG));
  const from: number[][] = Array.from({ length: k + 1 }, () => new Array<number>(n + 1).fill(-2));
  best[0][0] = 0;
  for (let j = 1; j <= k; j++) {
    for (let i = 0; i <= n; i++) {
      // Line j-1 takes nothing.
      let value = best[j - 1][i];
      let choice = -1;
      // Line j-1 takes words p..i-1.
      for (let p = 0; p < i; p++) {
        if (best[j - 1][p] === NEG) continue;
        const v = best[j - 1][p] + gain[j - 1][i] - gain[j - 1][p] - cutCost[p];
        if (v > value) {
          value = v;
          choice = p;
        }
      }
      best[j][i] = value;
      from[j][i] = choice;
    }
  }

  // Every word is taken, so the answer ends at i = n. Walk back.
  let i = n;
  for (let j = k; j >= 1; j--) {
    const p = from[j][i];
    if (p === -1) continue;
    const span = spans[j - 1];
    const taken = words.slice(p, i);
    span.spoken = taken.map((w) => w.word).join(" ").trim();
    span.startMs = Math.round(taken[0].start * 1000);
    span.endMs = Math.round(taken[taken.length - 1].end * 1000);
    i = p;
  }
  // The DP always reaches i = 0 (line 1 may take from word 0), so nothing is
  // left over; if it ever were, it belongs to the first line.
  if (i > 0) {
    const first = spans[0];
    const taken = words.slice(0, i);
    first.spoken = `${taken.map((w) => w.word).join(" ").trim()} ${first.spoken}`.trim();
    first.startMs = Math.round(taken[0].start * 1000);
    first.endMs = first.endMs ?? Math.round(taken[taken.length - 1].end * 1000);
  }
  return spans;
}

/**
 * The burst alignment this replaced, kept for the callers that still deal in
 * whole utterances. New code should go through `attributeWords`.
 */
export function attributeLines(utterances: Utterance[], lines: string[]): LineSpan[] {
  const words: TimedWord[] = [];
  for (const u of utterances) {
    const parts = u.text.split(/\s+/).filter(Boolean);
    const step = parts.length ? (u.endMs - u.startMs) / 1000 / parts.length : 0;
    parts.forEach((word, idx) => {
      const start = u.startMs / 1000 + idx * step;
      words.push({ word, start, end: start + step });
    });
  }
  return attributeWords(words, lines);
}

/** The whole job: the words she said with the text on screen, cut into lines. */
export function linesFromWords(
  workingWords: TimedWord[],
  lines: string[],
  gapMs = LINE_GAP_MS,
): LineSpan[] {
  return attributeWords(workingWords, lines, gapMs);
}

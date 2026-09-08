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
 * Attribute bursts to lines, in order.
 *
 * A monotone alignment: burst 1 cannot belong to a later line than burst 2. The
 * best such alignment is found exactly rather than greedily, because a greedy
 * pass that mis-assigns one burst pushes every later burst onto the wrong line
 * and the whole stimulus reads as somebody else's work -- the same failure the
 * transcript slicing already had once.
 *
 * A line she never spoke about comes back with an empty `spoken`, which is a
 * skip and must never be read as a pass.
 */
export function attributeLines(utterances: Utterance[], lines: string[]): LineSpan[] {
  const spans: LineSpan[] = lines.map((text, i) => ({ n: i + 1, text, spoken: "" }));
  if (!lines.length || !utterances.length) return spans;

  const m = utterances.length;
  const k = lines.length;
  const sim: number[][] = utterances.map((u) => lines.map((l) => lineSimilarity(u.text, l)));

  // dp[i][j]: best score having placed the first i bursts within the first j
  // lines. Either line j takes nothing, or it takes burst i.
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(k + 1).fill(-Infinity));
  for (let j = 0; j <= k; j++) dp[0][j] = 0;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= k; j++) {
      const skipLine = dp[i][j - 1];
      const takeBurst = dp[i - 1][j] === -Infinity ? -Infinity : dp[i - 1][j] + sim[i - 1][j - 1];
      dp[i][j] = Math.max(skipLine, takeBurst);
    }
  }

  const assigned = new Array<number>(m).fill(k - 1);
  let i = m;
  let j = k;
  while (i > 0 && j > 0) {
    const takeBurst = dp[i - 1][j] === -Infinity ? -Infinity : dp[i - 1][j] + sim[i - 1][j - 1];
    if (dp[i][j] === takeBurst) {
      assigned[i - 1] = j - 1;
      i--;
    } else {
      j--;
    }
  }
  // Anything left over belongs to the first line: she cannot have been ahead of
  // where she started.
  for (; i > 0; i--) assigned[i - 1] = 0;

  utterances.forEach((u, index) => {
    const line = spans[assigned[index]];
    line.spoken = line.spoken ? `${line.spoken} ${u.text}` : u.text;
    line.startMs = line.startMs === undefined ? u.startMs : Math.min(line.startMs, u.startMs);
    line.endMs = line.endMs === undefined ? u.endMs : Math.max(line.endMs, u.endMs);
  });

  return spans;
}

/** The whole job: the words she said with the text on screen, cut into lines. */
export function linesFromWords(
  workingWords: TimedWord[],
  lines: string[],
  gapMs = LINE_GAP_MS,
): LineSpan[] {
  return attributeLines(splitUtterances(workingWords, gapMs), lines);
}

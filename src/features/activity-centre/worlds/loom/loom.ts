// The Loom hangs a passage as two sheets and fires a thread from the marked
// second-paragraph phrase up to the first-paragraph idea it compresses.
//
// The thread's landing is the one derivation that could actively teach the
// wrong thing, and it nearly did. Measured across the bank of 20:
//
// - All 20 items carry a `**"marked phrase"**` in the second paragraph, a topic,
//   and an authored `partial` example. Seven plant a named near-miss.
// - Landing the thread by lexical similarity alone lands item 18 on "Critics
//   long read the flat affect as a FAILURE of characterisation", which is the
//   opposing view and the near-miss the bank names, when the credited answer is
//   the later reading that the flatness is deliberate. The credited answers are
//   translations rather than quotations, so they share vocabulary with both
//   sides of a debate and similarity cannot tell the sides apart.
// - The fix is the bank's own: where a near-miss is authored, the sentence that
//   best matches it is excluded before the thread is thrown. That is a relative
//   test, not a threshold, because the near-miss is written in the author's
//   words too and an absolute cut-off misses it.
//
// With that guard all 20 threads land on the correct span, checked one by one
// against the credited answer rather than counted.

import type { ActivityItem } from "../../api/types";

export interface Callback {
  order: number;
  /** Q1 through Q5, the locked ladder. */
  rung: number;
  /** The first sheet: where the idea lives. */
  source: string;
  /** The second sheet: where the callback phrase sits. */
  caller: string;
  /** The marked phrase, without its markup or quotes. */
  phrase: string;
  /** Where the phrase sits in the caller sheet, for the bracket of light. */
  phraseAt: { start: number; end: number } | null;
  /** The credited translation of the referenced idea. */
  credited: string;
  /** Where the thread lands on the source sheet, or null when it cannot be sure. */
  landing: { text: string; start: number; end: number } | null;
  /** The planted near-miss, when the bank plants one. */
  nearMiss: string | null;
  /** The bank's own example of a `partial` answer. */
  partialExample: string | null;
  /** The item's topic, for the weaver's log. */
  topic: string | null;
}

const MARKED = /\*\*"([^"]+)"\*\*/;
const TOPIC = /Topic:\s*([^.]+)\./;
/**
 * The authored near-miss.
 *
 * The optional closing quote matters: the bank writes both `Near-miss: the
 * original charge of failed characterisation.` and `Near-miss: "the marbles
 * shown as art."`, and a pattern that demands the period sit directly against
 * the marker silently drops every quoted one. That was one of eight going
 * missing, and the near-miss is what keeps the thread off the opposing view.
 */
const NEAR_MISS = /Near-miss:\s*(.+?)\.?"?\s*`partial`/s;
const PARTIAL = /`partial`:\s*"([^"]+)"/;

const STOP = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "for", "with", "by",
  "is", "are", "was", "were", "be", "been", "it", "its", "this", "that", "these",
  "those", "as", "from", "into", "than", "then", "so", "not", "no", "but", "which",
  "who", "what", "when", "where", "had", "has", "have", "their", "they", "them",
]);

/** Light stemming, so "failed" and "failure" are the same word to the guard. */
function stem(word: string): string {
  for (const suffix of ["ingly", "edly", "ing", "ness", "ed", "es", "ly", "s"]) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !STOP.has(w))
      .map(stem),
  );
}

/** Share of the target's content words the candidate carries. */
export function carries(target: string, candidate: string): number {
  const A = tokens(target);
  if (!A.size) return 0;
  const B = tokens(candidate);
  let shared = 0;
  for (const t of A) if (B.has(t)) shared += 1;
  return shared / A.size;
}

/** Sentences of a sheet, with their offsets, long enough to be an idea. */
function sentences(sheet: string) {
  const out: { text: string; start: number; end: number }[] = [];
  const re = /[^.!?]+[.!?]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sheet)) !== null) {
    const text = m[0].trim();
    if (text.length > 15) {
      const start = m.index + m[0].indexOf(text[0]);
      out.push({ text, start, end: start + text.length });
    }
  }
  return out;
}

/**
 * Where the thread lands.
 *
 * The near-miss exclusion runs first and is relative: whichever source sentence
 * best matches the authored near-miss is taken off the table entirely. Without
 * it the thread lands on the opposing view whenever the two sides of a debate
 * share vocabulary, which is most of the harder rungs.
 */
export function findLanding(
  source: string,
  credited: string,
  nearMiss: string | null,
): { text: string; start: number; end: number } | null {
  const sents = sentences(source);
  if (!sents.length) return null;

  let excluded = -1;
  if (nearMiss && sents.length > 1) {
    let best = 0;
    sents.forEach((s, n) => {
      const score = carries(nearMiss, s.text);
      if (score > best) {
        best = score;
        excluded = n;
      }
    });
  }

  const scored = sents
    .map((s, n) => ({ n, s, score: carries(credited, s.text) }))
    .filter((c) => c.n !== excluded)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;
  const best = scored[0];
  const second = scored[1]?.score ?? 0;
  // A thread that lands on a sentence it only half resembles points the
  // student's eye at the wrong line, which is worse than not throwing.
  if (best.score < 0.25 || best.score - second < 0.08) return null;
  return best.s;
}

export function parseCallback(item: ActivityItem): Callback | null {
  const credited = item.credited_answers?.[0];
  if (!credited) return null;

  const sheets = item.prompt.split(/\n\s*\n/);
  if (sheets.length < 2) return null;
  const source = sheets[0].trim();
  const callerRaw = sheets.slice(1).join("\n\n").trim();

  const marked = callerRaw.match(MARKED);
  if (!marked) return null;
  const phrase = marked[1];

  // The caller sheet reads without its markup; the bracket of light needs the
  // phrase's position in that cleaned text, not in the marked-up source.
  const caller = callerRaw.replace(MARKED, phrase);
  const at = caller.indexOf(phrase);

  const explanation = item.explanation ?? "";
  const nearMissRaw = explanation.match(NEAR_MISS)?.[1]?.trim() ?? null;
  const nearMiss =
    nearMissRaw && !/^none\b/i.test(nearMissRaw)
      ? nearMissRaw.replace(/^"+|"+$/g, "").replace(/\.$/, "").trim()
      : null;

  return {
    order: item.order,
    rung: Number(item.category?.match(/Q(\d)/i)?.[1] ?? 0),
    source,
    caller,
    phrase,
    phraseAt: at >= 0 ? { start: at, end: at + phrase.length } : null,
    credited,
    landing: findLanding(source, credited, nearMiss),
    nearMiss,
    partialExample: explanation.match(PARTIAL)?.[1] ?? null,
    topic: explanation.match(TOPIC)?.[1]?.trim() ?? null,
  };
}

/* ------------------------------------------------------------------ *
 * Reading the throw
 * ------------------------------------------------------------------ */

export type ThrowKind = "thread" | "taut" | "slack";

export interface Throw {
  /**
   * `thread` is a clean throw that stays woven; `taut` is the right referent
   * with no translation, which the world hangs colourless until restated;
   * `slack` falls away.
   */
  kind: ThrowKind;
  /** True when the answer points at the idea the bank plants as the near miss. */
  wrongSide: boolean;
  /** True when the answer names a location instead of saying what the idea is. */
  locationOnly: boolean;
}

/**
 * Language that points at where an idea is instead of saying what it is. The
 * drill's rubric singles this out: "the thing in the first paragraph about the
 * drums" identifies a location and says nothing.
 */
const LOCATIONAL =
  /\b(first|second|earlier|previous|opening)\s+(paragraph|para|part|sentence|line)\b|\bthe (thing|bit|part|idea|point)\s+(about|in|with|where)\b|\bparagraph\s*[12]\b|\b¶\s*[12]\b/i;

/**
 * Read the throw against the drill's locked two-part standard: the right
 * referent AND a real translation. Pointing alone never earns a thread.
 */
export function readThrow(callback: Callback, response: string): Throw {
  const text = response.trim();
  if (!text) return { kind: "slack", wrongSide: false, locationOnly: false };

  const toCredited = carries(callback.credited, text);
  const toNearMiss = callback.nearMiss ? carries(callback.nearMiss, text) : 0;

  // Pointing at the planted near-miss is the wrong side of the debate, which
  // the rubric marks wrong even when the topic is right.
  const wrongSide = toNearMiss > toCredited && toNearMiss >= 0.4;
  if (wrongSide) return { kind: "slack", wrongSide: true, locationOnly: false };

  const locationOnly = LOCATIONAL.test(text);

  // Right referent, no content: the thread lands but stays colourless.
  //
  // The bar here is deliberately low. A location-only answer is content-poor by
  // construction ("the thing in the first paragraph about the plaza" carries one
  // content word), so asking it to clear the same overlap as a real translation
  // would drop every one of them to slack and collapse the drill's two-part
  // standard into one part. What is being asked is only whether they pointed at
  // the right thing at all.
  if (locationOnly && toCredited >= 0.12) {
    return { kind: "taut", wrongSide: false, locationOnly: true };
  }

  if (toCredited >= 0.55 && !locationOnly) {
    return { kind: "thread", wrongSide: false, locationOnly: false };
  }
  if (toCredited >= 0.3) {
    return { kind: "taut", wrongSide: false, locationOnly };
  }
  return { kind: "slack", wrongSide: false, locationOnly };
}

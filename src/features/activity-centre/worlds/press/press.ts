// The Press turns a dense paragraph into one line of type. To stage that, the
// world needs the paragraph broken into the ideas that must survive, the
// credited slug, and the two named traps, all of which the bank authors.
//
// One thing this module deliberately does NOT do is decide which big ideas a
// student's sentence carried. That was measured against the bank and it cannot
// be derived from text: the checklist is written in analytic language ("common
// view:", "camp two:", "old frame:") that never appears in a summary, so the
// median overlap between an idea and its OWN credited slug is 0.25 and many are
// zero. Any threshold either marks the credited answer as missing most of its
// ideas or marks everything covered. Coverage is the Coach's judgment, passed
// in; when it is absent the checklist renders unticked rather than guessed.

import type { ActivityItem } from "../../api/types";

export interface BigIdea {
  /** The authored position in the checklist, 1-based. */
  n: number;
  text: string;
}

export interface Press {
  order: number;
  /** The dense paragraph. This is the monolith. */
  monolith: string;
  /** The credited one-sentence summary. This is the slug. */
  slug: string;
  ideas: BigIdea[];
  /** The authored near-miss summaries the drill names. */
  traps: { narrow?: string; topic?: string };
  /**
   * The credited slug's own length, which the compression gauge reads against.
   * Derived from his answer rather than a number I chose.
   */
  targetWords: number;
}

export type TrapKind = "narrow" | "topic" | "sprawl";

export interface Stroke {
  /** How many sentences the student wrote. The drill asks for one. */
  sentences: number;
  wordCount: number;
  /**
   * The named trap the sentence fell into, or null when the press makes no
   * claim. Derived by nearest authored form, and only when that form beats the
   * credited one by a real margin.
   */
  trap: TrapKind | null;
  /**
   * Which big ideas survived, by their authored number. Supplied by the Coach.
   * Undefined means nobody has judged it, which the bed renders as unticked
   * rather than as missed.
   */
  covered?: number[];
}

const IDEAS = /\((\d)\)\s*([^·]+?)(?=\s*·|\s*\.\s*Named traps:|$)/g;
const NARROW = /Too narrow:\s*"([^"]+)"/;
const TOPIC = /Topic[- ]only:\s*"([^"]+)"/;

const STOP = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "for", "with", "by",
  "is", "are", "was", "were", "be", "been", "it", "its", "this", "that", "these",
  "those", "as", "from", "into", "than", "then", "so", "not", "no", "but", "which",
  "who", "what", "when", "where", "had", "has", "have", "their", "they", "them",
]);

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

/** Share of the longer sentence's content words the two have in common. */
function similarity(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared += 1;
  return shared / Math.max(A.size, B.size);
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Sentences, counted the way the drill means it: terminal punctuation that is
 * actually followed by more writing. A trailing full stop is not a second
 * sentence, and neither is "Dr." mid-clause.
 */
const ABBREVIATION = /\b(?:Dr|Mr|Mrs|Ms|Prof|Sr|Jr|St|vs|etc|al|Fig|No|[A-Z])$/;

export function sentenceCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  let count = 0;
  let carriedFrom = 0;
  for (const m of trimmed.matchAll(/[.!?]+(?=\s+[A-Z"'(]|$)/g)) {
    const before = trimmed.slice(carriedFrom, m.index);
    // "the study by Dr. Aliyev" is one sentence; so is "J. R. R. Tolkien".
    if (ABBREVIATION.test(before.trimEnd())) continue;
    if (before.trim()) count += 1;
    carriedFrom = m.index! + m[0].length;
  }
  // Anything after the last terminal mark is a sentence in its own right.
  if (trimmed.slice(carriedFrom).trim()) count += 1;
  return Math.max(1, count);
}

export function parsePress(item: ActivityItem): Press | null {
  const slug = item.credited_answers?.[0];
  if (!slug) return null;

  const explanation = item.explanation ?? "";
  const ideas: BigIdea[] = [];
  for (const m of explanation.matchAll(IDEAS)) {
    const text = m[2].trim().replace(/\s*\.$/, "");
    if (text) ideas.push({ n: Number(m[1]), text });
  }
  if (!ideas.length) return null;

  return {
    order: item.order,
    monolith: item.prompt,
    slug,
    ideas,
    traps: {
      narrow: explanation.match(NARROW)?.[1],
      topic: explanation.match(TOPIC)?.[1],
    },
    targetWords: wordCount(slug),
  };
}

/**
 * Which authored form the student's sentence sits nearest to. All three are
 * full sentences in comparable vocabulary, which is why this works where idea
 * coverage does not: it is a choice between three known texts rather than a
 * judgment about meaning.
 */
export function nearestForm(response: string, press: Press): "credited" | TrapKind | null {
  const scores: [("credited" | TrapKind), number][] = [
    ["credited", similarity(response, press.slug)],
  ];
  if (press.traps.narrow) scores.push(["narrow", similarity(response, press.traps.narrow)]);
  if (press.traps.topic) scores.push(["topic", similarity(response, press.traps.topic)]);

  scores.sort((a, b) => b[1] - a[1]);
  const [best, bestScore] = scores[0];
  if (bestScore === 0) return null;
  // A near tie is not a diagnosis. The press says nothing rather than printing
  // a thin slug at a student whose sentence was merely worded unusually.
  const credited = scores.find(([k]) => k === "credited")![1];
  if (best !== "credited" && bestScore - credited < 0.05) return null;
  return best;
}

/**
 * Read the stroke. Sentence count and word count are measured; the trap is
 * derived; coverage is only ever passed through from the Coach.
 */
export function readStroke(response: string, press: Press, covered?: number[]): Stroke {
  const sentences = sentenceCount(response);
  const nearest = nearestForm(response, press);
  return {
    sentences,
    wordCount: wordCount(response),
    // Sprawl is the one trap that is measured rather than inferred, so it wins.
    trap: sentences > 1 ? "sprawl" : nearest === "credited" || nearest === null ? null : nearest,
    covered,
  };
}

/** The gauge's band, taken from the credited slug's own length. */
export function gaugeState(words: number, target: number): "short" | "in-range" | "long" {
  if (words < Math.round(target * 0.6)) return "short";
  if (words > Math.round(target * 1.5)) return "long";
  return "in-range";
}

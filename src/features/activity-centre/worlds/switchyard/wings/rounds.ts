// Round construction for the yard's two wings.
//
// Both wings drill against the SAME authored bank the main yard uses rather
// than new content: every statement a student meets in a wing is one Joshua
// wrote, already carrying a credited routing and a named indicator. That keeps
// the wings honest (nothing generated, nothing paraphrased) and it means a
// student's wing reps and their yard reps are about the same material.
//
// Selection is deterministic. Rounds are picked by offset, not at random, so a
// round is reproducible, testable, and reviewable before a student sees it.

import type { ActivityItem } from "../../../api/types";
import { indicatorOf, parseRouting } from "../routing";

export interface RoundItem {
  order: number;
  statement: string;
  /** The sufficient clause: the one that belongs on the IF track. */
  ifText: string;
  /** The necessary clause: the one that belongs on the THEN track. */
  thenText: string;
  /** The indicator the item turns on, when the bank names one. */
  indicator?: string;
  /**
   * Whether to present the necessary clause first. Alternating by item order
   * keeps the correct answer off a fixed position without reaching for
   * randomness, which would make a round impossible to reproduce.
   */
  swapped: boolean;
}

/** Every bank item whose credited answer parses into two clauses. */
export function routableItems(items: ActivityItem[]): RoundItem[] {
  const out: RoundItem[] = [];
  for (const item of items) {
    const routing = parseRouting(item.credited_answers[0]);
    if (!routing) continue;
    out.push({
      order: item.order,
      statement: item.prompt,
      ifText: routing.ifClause.text,
      thenText: routing.thenClause.text,
      indicator: indicatorOf(item.explanation),
      swapped: item.order % 2 === 0,
    });
  }
  return out;
}

/** The Sorting Yard's round: ten statements, taken in order from an offset. */
export function buildSortingRound(items: ActivityItem[], size = 10, offset = 0): RoundItem[] {
  const pool = routableItems(items);
  if (!pool.length) return [];
  const start = ((offset % pool.length) + pool.length) % pool.length;
  return Array.from({ length: Math.min(size, pool.length) }, (_, i) => pool[(start + i) % pool.length]);
}

/**
 * The hard indicator lexicon, in the spec's order. The look-alike pair sits
 * adjacent on purpose: "only if" marks the necessary condition and "the only"
 * marks the sufficient one, and drilling them apart is how that gets confused.
 */
export const LEXICON = [
  "unless",
  "without",
  "except",
  "only if",
  "the only",
  "presupposes",
  "depends on",
  "necessitates",
  "requires",
] as const;

export type LeverWord = (typeof LEXICON)[number];

export interface Lever {
  word: LeverWord;
  /** Real bank items that turn on this indicator. A lever with none is not rendered. */
  prompts: RoundItem[];
}

/**
 * Group the bank behind the levers. An indicator matches a lever when the
 * bank's named indicator contains the lever's word, which catches the authored
 * variants ("except where", "no…without", "not…unless") without a second list
 * to keep in sync.
 */
export function buildGallery(items: ActivityItem[]): Lever[] {
  const pool = routableItems(items);
  return LEXICON.map((word) => ({
    word,
    prompts: pool.filter((p) => {
      const ind = p.indicator?.toLowerCase();
      if (!ind) return false;
      // "only if" must not swallow the bare "only" items, and "the only" must
      // not be collected by the "only if" lever. Match the longer forms exactly.
      if (word === "only if") return ind.includes("only if") || ind === "if only";
      if (word === "the only") return ind.includes("the only");
      return ind.includes(word);
    }),
  })).filter((l) => l.prompts.length > 0);
}

// The Polarity Chamber turns a statement's plate over to show its negation, and
// measures how hard the student pushed.
//
// Negation Station is the one Activity that predates the content pipeline. Its
// 30 items are authored verbatim from Joshua's PDFs and live in
// `supabase/migrations/20260614100400_seed_negation_station.sql`, which stays
// authoritative. `negation-items.fixture.json` beside this file is a verbatim
// extract so the dev lab and these tests have the items without database
// access; it is deliberately NOT in `content/`, because everything there feeds
// the seed migration and this Activity must never be re-seeded.
//
// What the chamber can and cannot say:
//
// - It CAN place a quantifier statement and its credited negation on a strength
//   scale, because both ends are authored and the vocabulary is closed (all,
//   most, some, none). That is 16 of the 30 items.
// - It CANNOT do that for a conditional, causal or biconditional statement,
//   where strength is not a quantity. Those get the spec's own fallback: two
//   stamps that ask whether the answer contradicts and whether it is the
//   weakest thing that does.
// - It has NO authored polar opposite for any item. The bank names the trap in
//   its rules but never writes one out, so the chamber never shows a student a
//   manufactured overshoot. The overshoot it reacts to is the student's own,
//   measured from their own words.

import type { ActivityItem } from "../../api/types";
import fixture from "./negation-items.fixture.json";

/** The 30 items, verbatim. The migration remains the source of truth. */
export const NEGATION_ITEMS = fixture.items as ActivityItem[];

/** Rungs on the strength scale, weakest contradiction at the bottom. */
export type Level = "none" | "few" | "some" | "most" | "all";

export const SCALE: Level[] = ["none", "few", "some", "most", "all"];

export const LEVEL_LABEL: Record<Level, string> = {
  none: "None",
  few: "Few",
  some: "Some",
  most: "Most",
  all: "All",
};

/**
 * The closed quantifier vocabulary this bank actually uses. Ordered so the
 * longer, more specific phrases are tested first: "not all" must not be read as
 * "all", and "at least one" must not be read as "one".
 */
const QUANTIFIER: [RegExp, Level][] = [
  [/\bnot necessarily\b/i, "some"],
  [/\bat least one\b/i, "some"],
  [/\bhalf or fewer\b/i, "some"],
  // The negated forms come first, or "not typically" reads as "typically" and
  // the beam puts a negation on its own statement's rung.
  [/\bnot typically\b/i, "some"],
  [/\bthere are instances\b/i, "some"],
  [/\bnot all\b/i, "some"],
  [/\bnot every\b/i, "some"],
  [/\bnot everyone\b/i, "some"],
  [/\bno one\b/i, "none"],
  [/\bnone\b/i, "none"],
  [/\bnever\b/i, "none"],
  [/\bnothing\b/i, "none"],
  [/\bno\b/i, "none"],
  [/\bfew\b/i, "few"],
  [/\brarely\b/i, "few"],
  [/\bsome\b/i, "some"],
  [/\bsometimes\b/i, "some"],
  [/\bseveral\b/i, "some"],
  [/\bmany\b/i, "some"],
  [/\bmost\b/i, "most"],
  [/\bmajority\b/i, "most"],
  [/\busually\b/i, "most"],
  [/\btypically\b/i, "most"],
  [/\bevery\b/i, "all"],
  [/\beveryone\b/i, "all"],
  [/\balways\b/i, "all"],
  [/\ball\b/i, "all"],
];

/** Categories whose strength is a quantity, so the beam can measure them. */
const MEASURABLE = /quantifier|universal|generalization/i;

export interface Plate {
  order: number;
  /** The statement, engraved on the front of the plate. */
  statement: string;
  /** The credited negation, engraved on the reverse. */
  negation: string;
  /** The bank's own category label. */
  kind: string;
  /** The bank's explanation of the move. */
  why: string;
  /** True when the beam can measure this item rather than stamping it. */
  measurable: boolean;
  /** Where the statement sits on the scale, when its words fix a rung. */
  statementLevel: Level | null;
  /** Where the credited negation sits. */
  negationLevel: Level | null;
}

export function levelOf(text: string): Level | null {
  for (const [re, level] of QUANTIFIER) if (re.test(text)) return level;
  return null;
}

export function parsePlate(item: ActivityItem): Plate | null {
  const negation = item.credited_answers?.[0];
  if (!negation || !item.prompt) return null;

  const kind = item.category ?? "";
  const statementLevel = levelOf(item.prompt);
  const negationLevel = levelOf(negation);

  // The beam only claims a reading when the category is a quantity AND both
  // ends actually landed on the scale. One end alone measures nothing.
  const measurable =
    MEASURABLE.test(kind) && statementLevel !== null && negationLevel !== null;

  return {
    order: item.order,
    statement: item.prompt,
    negation,
    kind,
    why: item.explanation ?? "",
    measurable,
    statementLevel,
    negationLevel,
  };
}

export const PLATES: Plate[] = NEGATION_ITEMS.map(parsePlate).filter(Boolean) as Plate[];

/* ------------------------------------------------------------------ *
 * Reading the student's answer
 * ------------------------------------------------------------------ */

export type Push = "minimal" | "overshoot" | "undershoot" | "unmeasured";

export interface Reading {
  /** Where the student's own answer sits, when its words fix a rung. */
  level: Level | null;
  /**
   * How hard they pushed. `overshoot` is the drill's signature error: past the
   * credited rung, away from the original claim. `unmeasured` is the honest
   * answer whenever the scale does not apply, and it is not a verdict.
   */
  push: Push;
  /** Rungs between their answer and the credited one, when both are placed. */
  distance: number | null;
  /** Whether the answer restates the credited negation's content. */
  contradicts: boolean;
}

const STOP = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "for", "with", "by",
  "is", "are", "was", "were", "be", "been", "it", "its", "this", "that", "these",
  "those", "as", "from", "into", "than", "then", "so", "not", "no", "but", "which",
  "who", "what", "when", "where", "had", "has", "have", "their", "they", "them",
]);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !STOP.has(w)),
  );
}

function carries(target: string, candidate: string): number {
  const A = tokens(target);
  if (!A.size) return 0;
  const B = tokens(candidate);
  let shared = 0;
  for (const t of A) if (B.has(t)) shared += 1;
  return shared / A.size;
}

/**
 * Read the push.
 *
 * The overshoot is measured from the student's own words, never from a
 * manufactured polar opposite. Direction matters: the credited negation moves
 * away from the original claim, and going further in that same direction is the
 * overshoot the drill exists to catch. Falling short of it is a different
 * mistake and is named differently.
 */
export function readPush(plate: Plate, response: string): Reading {
  const text = response.trim();
  const contradicts = carries(plate.negation, text) >= 0.5;

  if (!text) {
    return { level: null, push: "unmeasured", distance: null, contradicts: false };
  }

  const level = levelOf(text);

  if (!plate.measurable || level === null || plate.negationLevel === null || plate.statementLevel === null) {
    return { level, push: "unmeasured", distance: null, contradicts };
  }

  const student = SCALE.indexOf(level);
  const credited = SCALE.indexOf(plate.negationLevel);
  const original = SCALE.indexOf(plate.statementLevel);
  const distance = Math.abs(student - credited);

  if (student === credited) {
    return { level, push: "minimal", distance: 0, contradicts };
  }

  // Which way the credited negation travelled from the original claim.
  const away = Math.sign(credited - original);
  const pushed = Math.sign(student - credited);

  return {
    level,
    push: away !== 0 && pushed === away ? "overshoot" : "undershoot",
    distance,
    contradicts,
  };
}

/**
 * The indicator family map.
 *
 * Every item in Conditional Rephrase carries a `category` naming the indicator
 * word it drills -- "Negative requirement: unless", "Trigger word: whenever" --
 * and there are 53 distinct ones across 62 items. That is a fine label to print
 * beside a question and a terrible thing to aggregate on: 53 buckets over 62
 * items is not a diagnosis, it is the item list with extra steps.
 *
 * So the ledger groups them. The grouping is THIS FILE and nothing else, for one
 * reason the plan was explicit about: `category` is display copy, and display
 * copy gets reworded. Group on the string and the ledger silently re-buckets
 * itself the day somebody fixes a capital letter. Group on an explicit map and a
 * reworded label fails a test instead, which is what you want, because the
 * failure is the reminder to say which family the new wording belongs to.
 *
 * The map also carries the indicator word separately from the family. Two
 * categories can drill the same word from different angles -- "Requirement word:
 * presupposes" and "Requirement word under jargon: presupposes" -- and a student
 * who missed both missed one word twice, not two words once.
 *
 * Keyed by Activity TITLE rather than slug, matching `worldForTitle`, because an
 * assignment snapshot carries the title and not the slug. An Activity with no
 * map gets no ledger and keeps the plain per-item recap, which is the honest
 * outcome: inventing families for content nobody has grouped is worse than
 * showing none.
 */

import type { ActivityItem } from "./api/types";

/**
 * Bump when an entry moves between families or a family's meaning changes, so a
 * stored ledger is never read under a grouping it was not computed with.
 * Nothing persists a ledger yet; this exists so the first thing that does has a
 * version to write down.
 */
export const INDICATOR_FAMILY_VERSION = 1;

export type IndicatorFamily =
  | "trigger"
  | "requirement"
  | "negative-requirement"
  | "negated-result"
  | "look-alike"
  | "compound"
  | "biconditional"
  | "chained";

export interface FamilyMeta {
  /** What the student sees. */
  label: string;
  /** One line of the lesson, shown only for a family that cost them marks. */
  lesson: string;
}

/**
 * Order matters: this is the order a student reads their misses in, and it runs
 * from the plainest form of the rule to the most tangled.
 */
export const INDICATOR_FAMILIES: Record<IndicatorFamily, FamilyMeta> = {
  trigger: {
    label: "Trigger words",
    lesson: "The word marks the sufficient side. What it introduces goes on the IF track.",
  },
  requirement: {
    label: "Requirement words",
    lesson: "The word marks the necessary side. What it introduces goes on the THEN track.",
  },
  "negative-requirement": {
    label: "Negative requirements",
    lesson: "Same rule, with a negation folded into the word. Translate to if not, then read it normally.",
  },
  "negated-result": {
    label: "Negated results",
    lesson: "The negation belongs to the necessary side, not to the trigger.",
  },
  "look-alike": {
    label: "Look-alikes",
    lesson: "only, the only, if only. A word apart on the page and opposite sides of the arrow.",
  },
  compound: {
    label: "Compound conditions",
    lesson: "Two clauses on one side. The flip has to negate both of them, and or becomes and.",
  },
  biconditional: {
    label: "Both directions",
    lesson: "if and only if is the one form that runs both ways. Nothing else does.",
  },
  chained: {
    label: "Chained conditionals",
    lesson: "More than one rule in a single sentence. Split them before translating either.",
  },
};

export interface IndicatorMeta {
  family: IndicatorFamily;
  /** The word itself, as a student would say it back. */
  indicator: string;
}

/**
 * The 53 categories of Conditional Rephrase, each placed by hand.
 *
 * Notes on the ones that are not a straight read of the label:
 *
 * - "Same rule, new seat: X" is a repeat of a rule in a new sentence, so the
 *   family is whatever X is: only if and only when are requirements, unless is
 *   a negative requirement. The seat is a teaching device, not a family.
 * - "Stacked negatives: unless" is an unless with a second negation on top. Same
 *   family, same word, harder sentence.
 * - "Not both" is a compound: the sentence bans a pair, and the translation has
 *   to break the pair apart.
 * - "Contrast inside the condition" (item 60) drills "necessitates" with a
 *   rather-than contrast in the necessary clause. The word is a requirement
 *   word; the contrast is a wrinkle in one item, and a family of one reads as
 *   noise in a diagnosis rather than as a lesson.
 * - "Requirement word: presupposes" and "Requirement word under jargon:
 *   presupposes" are deliberately two categories and one indicator. They merge.
 */
export const CONDITIONAL_REPHRASE_INDICATORS: Record<string, IndicatorMeta> = {
  "Trigger word: whenever": { family: "trigger", indicator: "whenever" },
  "Trigger word: when": { family: "trigger", indicator: "when" },
  "Trigger word: if": { family: "trigger", indicator: "if" },
  "Trigger word: every": { family: "trigger", indicator: "every" },
  "Trigger word: as long as": { family: "trigger", indicator: "as long as" },
  "Trigger word: all": { family: "trigger", indicator: "all" },
  "Trigger word: provided that": { family: "trigger", indicator: "provided that" },
  "Trigger word: guarantees": { family: "trigger", indicator: "guarantees" },
  "Trigger word: ensures": { family: "trigger", indicator: "ensures" },

  "Requirement word: only if": { family: "requirement", indicator: "only if" },
  "Requirement word: only when": { family: "requirement", indicator: "only when" },
  "Requirement word: must": { family: "requirement", indicator: "must" },
  "Requirement word: only with": { family: "requirement", indicator: "only with" },
  "Requirement word: requires": { family: "requirement", indicator: "requires" },
  "Requirement word: on the condition that": {
    family: "requirement",
    indicator: "on the condition that",
  },
  "Requirement word: depends on": { family: "requirement", indicator: "depends on" },
  "Requirement word: the only way": { family: "requirement", indicator: "the only way" },
  "Requirement word: essential to": { family: "requirement", indicator: "essential to" },
  "Requirement word: in order to": { family: "requirement", indicator: "in order to" },
  "Requirement word: demands": { family: "requirement", indicator: "demands" },
  "Requirement word: necessitates": { family: "requirement", indicator: "necessitates" },
  "Requirement word: presupposes": { family: "requirement", indicator: "presupposes" },
  "Requirement word under jargon: presupposes": {
    family: "requirement",
    indicator: "presupposes",
  },
  "Same rule, new seat: only if": { family: "requirement", indicator: "only if" },
  "Same rule, new seat: only when": { family: "requirement", indicator: "only when" },
  "Contrast inside the condition": { family: "requirement", indicator: "necessitates" },

  "Negative requirement: unless": { family: "negative-requirement", indicator: "unless" },
  "Negative requirement: without": { family: "negative-requirement", indicator: "without" },
  "Negative requirement: or else": { family: "negative-requirement", indicator: "or else" },
  "Negative requirement: otherwise": { family: "negative-requirement", indicator: "otherwise" },
  "Negative requirement: cannot … without": {
    family: "negative-requirement",
    indicator: "cannot … without",
  },
  "Negative requirement: no … without": {
    family: "negative-requirement",
    indicator: "no … without",
  },
  "Negative requirement: until": { family: "negative-requirement", indicator: "until" },
  "Negative requirement: not … unless": {
    family: "negative-requirement",
    indicator: "not … unless",
  },
  "Negative requirement: not until": { family: "negative-requirement", indicator: "not until" },
  "Negative requirement: absent": { family: "negative-requirement", indicator: "absent" },
  "Negative requirement: except": { family: "negative-requirement", indicator: "except" },
  "Negative requirement: except where": {
    family: "negative-requirement",
    indicator: "except where",
  },
  "Negative requirement: no one … unless": {
    family: "negative-requirement",
    indicator: "no one … unless",
  },
  "Same rule, new seat: unless": { family: "negative-requirement", indicator: "unless" },
  "Stacked negatives: unless": { family: "negative-requirement", indicator: "unless" },

  "Negated result: none": { family: "negated-result", indicator: "none" },
  "Negated result: never": { family: "negated-result", indicator: "never" },
  "Negated result: cannot": { family: "negated-result", indicator: "cannot" },

  "Look-alike pair: the only": { family: "look-alike", indicator: "the only" },
  "Look-alike pair: only": { family: "look-alike", indicator: "only" },
  "Look-alike pair: if only": { family: "look-alike", indicator: "if only" },

  "Compound condition: except where": { family: "compound", indicator: "except where" },
  "Compound condition: the only": { family: "compound", indicator: "the only" },
  "Compound condition: no … without": { family: "compound", indicator: "no … without" },
  "Not both": { family: "compound", indicator: "not both" },

  "Both ways: if and only if": { family: "biconditional", indicator: "if and only if" },

  "Two conditionals in one sentence": { family: "chained", indicator: "two in one sentence" },
};

/** Every Activity that has had its categories placed into families, by title. */
const MAPS_BY_TITLE: Record<string, Record<string, IndicatorMeta>> = {
  "Conditional Rephrase": CONDITIONAL_REPHRASE_INDICATORS,
};

/**
 * The map for an Activity, or null when nobody has grouped its categories.
 *
 * Null is a real answer and the callers treat it as one. The other seven
 * Activities carry four to seven categories each, which are already family-sized
 * and may well need no map at all -- but that is a judgement about their content
 * and it has not been made, so this does not make it for them.
 */
export function indicatorMapFor(title: string | undefined): Record<string, IndicatorMeta> | null {
  if (!title) return null;
  return MAPS_BY_TITLE[title] ?? null;
}

/** The family and word an item drills, when its Activity has been mapped. */
export function indicatorFor(
  item: ActivityItem,
  map: Record<string, IndicatorMeta> | null,
): IndicatorMeta | null {
  if (!map || !item.category) return null;
  return map[item.category] ?? null;
}

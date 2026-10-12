// The Debate Chamber stages a rebuttal as two opposed plinths: somebody else's
// claim on one, and the author's actual claim, which the argument never states
// in content terms, on the other.
//
// What the bank supports, measured across its 42 items before being used:
//
// - The attributed claim isolates on 42 of 42 via an attribution marker and its
//   that-clause. Rejection PHRASES were tried first and abandoned: the drill's
//   Level 3 and 4 items carry no separable rejection at all, because the
//   rejection is the framing verb ("It is erroneous to infer that ...") rather
//   than a sentence of its own. Detecting the attribution is stable; detecting
//   the rejection is chasing English.
//
// - The certainty positions come from a small closed lexicon that this bank
//   actually uses: no / never / cannot on one end, must / all / every on the
//   other, and the credited answers' can / at least one / not necessarily in
//   between. A claim whose words are not in that lexicon gets no needle, and
//   the arc stays dark rather than inventing a strength.
//
// The arc's LABELS are still an open question on the drill's README, so nothing
// here treats them as final; they are one string table in one place.

import type { ActivityItem } from "../../api/types";

/** Where a claim sits on the Certainty Arc. */
export type Strength = "none" | "not-necessarily" | "sometimes" | "usually" | "always";

export const ARC: Strength[] = ["none", "not-necessarily", "sometimes", "usually", "always"];

/**
 * The arc's engraved vocabulary. Unconfirmed against Joshua's teaching language
 * (open question 1 on the drill's README), which is why it is one table here
 * rather than spelled into the components.
 */
export const ARC_LABEL: Record<Strength, string> = {
  none: "None",
  "not-necessarily": "Not necessarily",
  sometimes: "Sometimes",
  usually: "Usually",
  always: "Always",
};

export interface Rebuttal {
  order: number;
  level: number;
  /** The whole argument, as it reads on the page. */
  argument: string;
  /** Somebody else's position, for their plinth. Null when it cannot be isolated. */
  attributed: string | null;
  /** The author's actual claim, content-stated. This is the credited answer. */
  credited: string;
  /** Where each claim sits on the arc, or null when its words fix no position. */
  attributedStrength: Strength | null;
  creditedStrength: Strength | null;
  /** The authored overshoot, when the bank quotes one. */
  overshoot: string | null;
  /** Qualifiers the credited claim carries that an answer must not drop. */
  qualifiers: string[];
}

/* ------------------------------------------------------------------ *
 * Vocabulary
 * ------------------------------------------------------------------ */

const ATTRIBUTION_VERB =
  "(?:maintains?|holds?|argues?|argued|claims?|claimed|says?|said|states?|asserts?|writes?|wrote|written|concludes?|supposes?|infer|inferred|insists?|contends?|assumed|assumption|inference|suggestion|view|account|report|conclusion|position|believed|follow|holding|accept)";

/**
 * Strength words, checked longest-first so "can never" is not read as "can" and
 * "not necessarily" is not read as "not".
 */
const STRENGTH: [RegExp, Strength][] = [
  [/\bnot necessarily\b/i, "not-necessarily"],
  [/\bneed not\b/i, "not-necessarily"],
  // Negated universals read as the loosened claim, not the universal. "Does
  // not always fire unevenly" is the minimal negation of "always", and reading
  // it as "always" would land the author on the position they are rejecting.
  [/\bnot always\b/i, "sometimes"],
  [/\bcan never\b/i, "none"],
  [/\bcannot\b/i, "none"],
  [/\bcould not\b/i, "none"],
  [/\bnever\b/i, "none"],
  [/\bimpossible\b/i, "none"],
  [/\bno\b/i, "none"],
  [/\bnone\b/i, "none"],
  [/\bnot all\b/i, "sometimes"],
  [/\bnot every\b/i, "sometimes"],
  [/\bat least one\b/i, "sometimes"],
  [/\bsometimes\b/i, "sometimes"],
  [/\bpossible\b/i, "sometimes"],
  [/\bcan\b/i, "sometimes"],
  [/\bcould\b/i, "sometimes"],
  [/\busually\b/i, "usually"],
  [/\bgenerally\b/i, "usually"],
  [/\bmost\b/i, "usually"],
  [/\bmust\b/i, "always"],
  [/\balways\b/i, "always"],
  [/\bevery\b/i, "always"],
  [/\ball\b/i, "always"],
  [/\bany\b/i, "always"],
  [/\bexclusively\b/i, "always"],
];

/** Words whose loss changes a claim's scope, per the drill's own rubric. */
const QUALIFIER = [
  "exclusively",
  "only",
  "all",
  "every",
  "any",
  "necessarily",
  "not necessarily",
  "at least one",
  "not all",
  "not every",
  "sometimes",
  "usually",
  "most",
];

/** Referential language that leaves a rebuttal contentless. */
const REFERENTIAL =
  /\b(this|that|these|those|they|the account|the claim|the view|the report|the assumption|the suggestion|the inference|the position)\b/i;

const REJECTION =
  /\b(not so|is false|in error|are wrong|is wrong|does not hold|cannot be sustained|cannot stand|does not withstand|mistaken|fails?|incorrect|not correct|unwarranted|unsound|unfounded|untrue|do not support)\b/i;

/**
 * The rejection sentence, when the argument has one of its own.
 *
 * Levels 3 and 4 reject inside the framing verb ("It is erroneous to infer
 * that ..."), so there is nothing separable to ghost, and null is the honest
 * answer rather than a phrase pulled out of the middle of a clause.
 */
const REJECTION_SENTENCE =
  /(?:^|(?<=[.;,])\s)([^.;,]{0,90}?\b(?:not so|is false|in error|are wrong|is wrong|does not hold|cannot be sustained|cannot stand|does not withstand|is mistaken|were mistaken|are mistaken|fails|is incorrect|is not correct|is unwarranted|is unsound|is unfounded|is untrue)\b[^.]*\.)/i;

export function rejectionOf(argument: string): string | null {
  return argument.match(REJECTION_SENTENCE)?.[1]?.trim() ?? null;
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

/** Share of the target's content words the candidate carries. */
function carries(target: string, candidate: string): number {
  const A = tokens(target);
  if (!A.size) return 0;
  const B = tokens(candidate);
  let shared = 0;
  for (const t of A) if (B.has(t)) shared += 1;
  return shared / A.size;
}

/* ------------------------------------------------------------------ *
 * Derivation
 * ------------------------------------------------------------------ */

/** Where a claim's own words put it on the arc, or null if they fix nothing. */
export function strengthOf(text: string): Strength | null {
  for (const [re, s] of STRENGTH) if (re.test(text)) return s;
  return null;
}

/**
 * Somebody else's position.
 *
 * Taken from the attribution marker forward, to the end of its sentence. The
 * fronted form ("That a tremor ... is an inference the data do not support")
 * is handled first because its claim runs before the marker, not after.
 */
export function attributedClaim(prompt: string): string | null {
  const fronted = prompt.match(/^That\s+(.+?)\s+is an inference\b/is);
  if (fronted) return fronted[1].trim();

  const withThat = new RegExp(`\\b${ATTRIBUTION_VERB}\\b[^.]{0,25}?\\bthat\\b`, "i");
  const bare = new RegExp(`\\b${ATTRIBUTION_VERB}\\b\\s+(?=[a-z])`, "i");

  const m = prompt.match(withThat) ?? prompt.match(bare);
  if (!m || m.index === undefined) return null;

  const rest = prompt.slice(m.index + m[0].length).trim();
  const claim = rest.split(/(?<=[.!?])\s/)[0].trim();
  // A stub is not a claim. Better to leave their plinth dark than to engrave
  // half a sentence on it and call it somebody's position.
  return claim.length > 15 ? claim : null;
}

const OVERSHOOT = /Overshoot[^:]*:\s*"([^"]+)"/;

export function parseRebuttal(item: ActivityItem): Rebuttal | null {
  const credited = item.credited_answers?.[0];
  if (!credited) return null;

  const attributed = attributedClaim(item.prompt);
  const level = Number(item.category?.match(/Level\s*(\d)/i)?.[1] ?? 0);

  /*
   * The arc measures ONE claim's strength, and a Level 4 compound rebuttal is
   * not one claim: it is a concession, a rejected sub-claim, and a judgment
   * about what the surviving ground supports. Item 42 is the proof. Its
   * attributed side says "no genuine inscription is cut this deep" and its
   * credited side says "the depth is no evidence of forgery" - both read as
   * "none", about different propositions, which would draw both needles to the
   * same point and show a student a distance of zero on the one lesson the arc
   * exists to teach. Compounds get no needles.
   */
  const compound = level >= 4;

  return {
    order: item.order,
    level,
    argument: item.prompt,
    attributed,
    credited,
    // The attributed strength is read off the isolated claim when there is one,
    // and off the whole argument otherwise: the rejection phrases are
    // contentless, so a strong modal in the argument belongs to the claim.
    attributedStrength: compound ? null : strengthOf(attributed ?? item.prompt),
    creditedStrength: compound ? null : strengthOf(credited),
    overshoot: item.explanation?.match(OVERSHOOT)?.[1] ?? null,
    qualifiers: QUALIFIER.filter((q) => new RegExp(`\\b${q}\\b`, "i").test(credited)),
  };
}

/* ------------------------------------------------------------------ *
 * Reading the student's answer
 * ------------------------------------------------------------------ */

export type TrapKind = "premise" | "vague-referential" | "overshoot" | "scope-drop";

export interface Resolution {
  /** Where the student's answer sits on the arc, when its words fix a position. */
  strength: Strength | null;
  /** The named trap, or null when the chamber makes no claim. */
  trap: TrapKind | null;
  /** Qualifiers the credited claim carries and the answer does not. */
  dropped: string[];
  /** True when the answer carries the credited claim's content. */
  resolved: boolean;
}

/**
 * Read the answer.
 *
 * Order matters and is the drill's own: an unresolved referential answer is
 * that before it is anything else, and a premise answer is a different mistake
 * from a claim stated too strongly. Each check is one the bank supports; when
 * none fires the chamber names no trap rather than guessing between four.
 */
export function readResolution(rebuttal: Rebuttal, response: string): Resolution {
  const strength = strengthOf(response);
  const resolved = carries(rebuttal.credited, response) >= 0.6;

  const dropped = rebuttal.qualifiers.filter(
    (q) => !new RegExp(`\\b${q}\\b`, "i").test(response),
  );

  // Contentless: it points at the other side and says nothing of its own.
  const contentless =
    REFERENTIAL.test(response) &&
    REJECTION.test(response) &&
    carries(rebuttal.credited, response) < 0.35;
  if (contentless) {
    return { strength, trap: "vague-referential", dropped, resolved: false };
  }

  // A premise answer restates the argument's evidence rather than its claim.
  // Only the sentences that are neither the attributed claim nor the credited
  // one can be evidence, so a match there is the premise trap.
  const evidence = rebuttal.argument
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 20 &&
        carries(s, rebuttal.credited) < 0.5 &&
        (!rebuttal.attributed || carries(s, rebuttal.attributed) < 0.5),
    );
  if (!resolved && evidence.some((s) => carries(s, response) >= 0.6)) {
    return { strength, trap: "premise", dropped, resolved: false };
  }

  // Overshoot: the authored one, or a position further out than credited on the
  // side the author moved away from.
  //
  // The authored check is a nearest-of-two, not a threshold. An overshoot and
  // the credited answer are claims about the same subject that differ by a
  // single word ("the catch is EASIEST to correct" against "it is POSSIBLE to
  // correct"), so they share almost all their content words and a bare
  // threshold flags the credited answer itself as the trap. The response has to
  // sit nearer the overshoot than the credited claim, by a margin.
  const toOvershoot = rebuttal.overshoot !== null ? carries(rebuttal.overshoot, response) : 0;
  const toCredited = carries(rebuttal.credited, response);
  const authoredOvershoot =
    rebuttal.overshoot !== null && toOvershoot >= 0.6 && toOvershoot - toCredited >= 0.1;
  const overRotated =
    strength !== null &&
    rebuttal.creditedStrength !== null &&
    rebuttal.attributedStrength !== null &&
    // The author moved from the attributed position toward the credited one.
    // Going further in that direction than credited is the overshoot.
    Math.sign(ARC.indexOf(rebuttal.creditedStrength) - ARC.indexOf(rebuttal.attributedStrength)) ===
      Math.sign(ARC.indexOf(strength) - ARC.indexOf(rebuttal.creditedStrength)) &&
    strength !== rebuttal.creditedStrength;

  if (authoredOvershoot || (overRotated && !resolved)) {
    return { strength, trap: "overshoot", dropped, resolved };
  }

  // Scope drop: the right claim with a qualifier missing.
  if (resolved && dropped.length) {
    return { strength, trap: "scope-drop", dropped, resolved };
  }

  return { strength, trap: null, dropped, resolved };
}

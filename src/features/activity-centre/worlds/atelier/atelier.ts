// The Argument Atelier turns an argument into the structure it always had:
// panes of glass, one claim each, with the conclusion crowned on top.
//
// Two things this module derives, both measured against the bank of 62 before
// being trusted:
//
// 1. The claims. Splitting on sentences alone is wrong for this drill. Level 2
//    is "conclusion before a support indicator", where the conclusion is the
//    CLAUSE before "since"/"because", not a whole sentence. Splitting there too
//    took the crown from 22 items to 45.
//
// 2. The crown. 45 of 62 locate to one claim by a real margin; the other 17
//    stay uncrowned and say so. Six of those are authored "(derived)" or
//    "(substituted)", meaning the conclusion is genuinely not in the argument,
//    which is the whole of Level 5. The rest are paraphrased past recognition.
//    Crucially, none of the 45 crowns land on a claim the bank names as the
//    wrong turn; that is asserted in the tests and is the property that makes
//    crowning safe at all.
//
// What this module does NOT derive is the per-pane role tag. The spec's margin
// labels (BACKGROUND, OPPOSING VIEW) are still an open question on the drill's
// own README, and the bank's parentheticals are verdict tags, not roles. A
// pane is the crown or it is not; nothing here invents a third label.

import type { ActivityItem } from "../../api/types";

/** One claim, on its own pane. */
export interface Claim {
  n: number;
  text: string;
  /** True when this claim was split off behind a support indicator. */
  behindSupport: boolean;
}

export interface Argument {
  order: number;
  level: number;
  claims: Claim[];
  /** The credited main conclusion, as the bank states it. */
  conclusion: string;
  /**
   * Which claim is the conclusion, or null when it is not on the table. Null is
   * not a failure: at Level 5 the conclusion is unstated and the student has to
   * build it, and the atelier stages exactly that.
   */
  crown: number | null;
  /** True when the bank itself marks the conclusion as derived or substituted. */
  unstated: boolean;
  /** The claim the bank names as the wrong turn, when it names a quotable one. */
  wrongTurn: number | null;
  /** The conclusion indicator, for the small-caps the ladder fades at Level 3. */
  indicator: string | null;
}

const SUPPORT =
  /\b(since|because|for|as|given that|after all|in that)\b/i;

/** Conclusion indicators, longest first so "it follows that" beats "for". */
const INDICATORS = [
  "it follows that",
  "which means that",
  "for this reason",
  "this is not so",
  "consequently",
  "accordingly",
  "therefore",
  "thus",
  "hence",
  "so",
  "clearly",
  "should",
];

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
function carries(target: Set<string>, candidate: string): number {
  if (!target.size) return 0;
  const C = tokens(candidate);
  let shared = 0;
  for (const t of target) if (C.has(t)) shared += 1;
  return shared / target.size;
}

/**
 * Split an argument into its claims.
 *
 * Sentences first, then a second cut in front of a support indicator, which is
 * where this drill's Level 2 hides the conclusion. The 25-character floor keeps
 * "As the report shows, ..." from being cut into a fragment and a stub: a
 * support indicator that early is running the sentence, not joining two claims.
 */
export function splitClaims(prompt: string): Claim[] {
  const out: Claim[] = [];
  for (const sentence of prompt.trim().split(/(?<=[.!?])\s+(?=[A-Z"'(])/)) {
    const s = sentence.trim();
    if (!s) continue;
    const m = s.match(new RegExp(`,\\s*${SUPPORT.source}`, "i")) ?? s.match(new RegExp(`\\s${SUPPORT.source}`, "i"));
    if (m && m.index !== undefined && m.index > 25) {
      out.push({ n: out.length, text: s.slice(0, m.index).replace(/[\s,]+$/, ""), behindSupport: false });
      out.push({ n: out.length, text: s.slice(m.index).replace(/^[\s,]+/, ""), behindSupport: true });
    } else {
      out.push({ n: out.length, text: s, behindSupport: false });
    }
  }
  return out;
}

/** The level from the bank's own category string. */
function levelOf(category: string): number {
  const m = category.match(/Level\s*(\d)/i);
  return m ? Number(m[1]) : 0;
}

export function indicatorOf(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  for (const ind of INDICATORS) {
    // Word boundaries on BOTH sides. Checking only the left lets "so" match
    // inside "sothern", which would print a training-wheel small-cap over a
    // word that is not an indicator at all.
    if (new RegExp(`\\b${ind}\\b`).test(lower)) return ind;
  }
  return null;
}

/**
 * Which claim the credited conclusion is, or null.
 *
 * The margin is what makes this safe. A best score that barely beats the runner
 * up means two claims restate each other, and crowning either would be a guess
 * shown to a student as the answer.
 */
export function findCrown(claims: Claim[], conclusion: string): number | null {
  const target = tokens(conclusion);
  if (!target.size || !claims.length) return null;

  const scored = claims
    .map((c) => ({ n: c.n, score: carries(target, c.text) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1]?.score ?? 0;
  if (best.score < 0.6 || best.score - second < 0.2) return null;
  return best.n;
}

const UNSTATED = /^\((derived|substituted)\)/i;
const WRONG_TURN = /Wrong turn:\s*"([^"]+)"/;

export function parseArgument(item: ActivityItem): Argument | null {
  const conclusionRaw = item.credited_answers?.[0];
  if (!conclusionRaw) return null;

  const claims = splitClaims(item.prompt);
  if (!claims.length) return null;

  const unstated = UNSTATED.test(conclusionRaw);
  const conclusion = conclusionRaw.replace(UNSTATED, "").replace(/^:\s*/, "").trim();

  // An unstated conclusion is never crowned, even if its words happen to echo a
  // premise. The bank has already said it is not on the table.
  const crown = unstated ? null : findCrown(claims, conclusion);

  let wrongTurn: number | null = null;
  const wt = item.explanation?.match(WRONG_TURN)?.[1];
  if (wt) {
    const at = findCrown(claims, wt);
    // Never mark the crown as the wrong turn, whichever way the match fell.
    wrongTurn = at !== null && at !== crown ? at : null;
  }

  return {
    order: item.order,
    level: levelOf(item.category ?? ""),
    claims,
    conclusion,
    crown,
    unstated,
    wrongTurn,
    indicator: indicatorOf(item.prompt),
  };
}

export type PickPlacement = "crown" | "support" | "wrong-turn" | "off-table";

export interface Build {
  /** The claim that rises, or null when the conclusion was never on the table. */
  crown: number | null;
  /** The claims that slide beneath it. */
  supports: number[];
  /** Where the student's own answer landed in the true structure. */
  placement: PickPlacement | null;
  /** The claim their answer matched, when it matched one. */
  pickedClaim: number | null;
  /**
   * How far their pick sits from the crown, in panes. The spec makes this the
   * diagnosis: the vertical distance from crown to marker is the feedback.
   * Null when there is no crown or no located pick to measure between.
   */
  distance: number | null;
}

/**
 * Read the build.
 *
 * The student's response is located the same way the crown is, and by the same
 * margin, so a vague answer places nowhere rather than being pinned to a pane
 * it only half resembles.
 */
export function readBuild(argument: Argument, response?: string): Build {
  const supports = argument.claims.map((c) => c.n).filter((n) => n !== argument.crown);

  if (!response?.trim()) {
    return { crown: argument.crown, supports, placement: null, pickedClaim: null, distance: null };
  }

  // A response that matches the credited conclusion is right whether or not the
  // conclusion is on the table, which is the only way Level 5 can be answered.
  if (carries(tokens(argument.conclusion), response) >= 0.6) {
    return { crown: argument.crown, supports, placement: "crown", pickedClaim: argument.crown, distance: 0 };
  }

  const pickedClaim = findCrown(argument.claims, response);
  if (pickedClaim === null) {
    return { crown: argument.crown, supports, placement: "off-table", pickedClaim: null, distance: null };
  }

  const placement: PickPlacement =
    pickedClaim === argument.crown
      ? "crown"
      : pickedClaim === argument.wrongTurn
        ? "wrong-turn"
        : "support";

  return {
    crown: argument.crown,
    supports,
    placement,
    pickedClaim,
    distance: argument.crown === null ? null : Math.abs(pickedClaim - argument.crown),
  };
}

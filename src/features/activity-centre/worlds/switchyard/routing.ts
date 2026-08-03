// The Switchyard routes a conditional's two condition-groups onto two tracks:
// the sufficient clause onto IF, the necessary clause onto THEN. To animate
// that, the world needs the credited answer broken into its two clauses and
// each clause's polarity, which is what this module derives.
//
// The credited answers are authored, not free-form: every Conditional Rephrase
// item's first credited answer is written as "If X, then Y." The contrapositive
// is authored too, but several are written in shorthand ("Tank fine, pumps
// cycled."), so the flip is DERIVED from the parsed clauses and the authored
// text is shown alongside as the credited plate rather than parsed.

export interface Clause {
  /** The clause text as authored, with any leading negation left intact. */
  text: string;
  /** True when the clause is stated negatively; drives the polarity lamp. */
  negated: boolean;
}

export interface Routing {
  /** The sufficient condition. Couples onto the IF track. */
  ifClause: Clause;
  /** The necessary condition. Couples onto the THEN track. */
  thenClause: Clause;
}

const IF_THEN = /^\s*if\s+(.+?),\s*then\s+(.+?)\s*$/i;

// Negation as it is actually written in the bank. Ordered longest-first so
// "cannot" is not matched by "not" with a different span.
const NEGATIONS = [
  "cannot",
  "can not",
  "does not",
  "did not",
  "do not",
  "will not",
  "would not",
  "is not",
  "are not",
  "was not",
  "were not",
  "may not",
  "must not",
  "no longer",
  "not ",
  "n't",
  "never",
  "neither",
  "nothing",
];

/** Whether a clause reads as negative, which lights the capsule's polarity ring. */
export function isNegated(clause: string): boolean {
  const s = ` ${clause.toLowerCase().trim()} `;
  if (/\bno\s+\w/.test(s) && !/\bno\s+longer\b/.test(s)) return true;
  return NEGATIONS.some((n) => s.includes(n));
}

function trimTerminal(s: string): string {
  return s.replace(/\s*[.;]\s*$/, "").trim();
}

/**
 * Parse an authored "If X, then Y." credited answer into its two clauses.
 * Returns null when the answer is not in that form, which the world treats as
 * "no routing available" and falls back to plain text rather than guessing.
 */
export function parseRouting(creditedAnswer: string): Routing | null {
  const match = trimTerminal(creditedAnswer).match(IF_THEN);
  if (!match) return null;

  const [, sufficient, necessary] = match;
  const ifText = trimTerminal(sufficient);
  const thenText = trimTerminal(necessary);
  if (!ifText || !thenText) return null;

  return {
    ifClause: { text: ifText, negated: isNegated(ifText) },
    thenClause: { text: thenText, negated: isNegated(thenText) },
  };
}

/**
 * The contrapositive as the machine performs it: the capsules swap tracks and
 * their polarity inverts, in one movement. This is derived rather than parsed
 * from the authored contrapositive, because the flip has to be a transformation
 * the student watches, not a second sentence that appears.
 */
export function flip(routing: Routing): Routing {
  return {
    ifClause: { text: routing.thenClause.text, negated: !routing.thenClause.negated },
    thenClause: { text: routing.ifClause.text, negated: !routing.ifClause.negated },
  };
}

/**
 * The indicator word the item turns on ("only if", "unless", "the only").
 * Authored as the first quoted span of the item's explanation, which is where
 * the bank puts it. Returned so the departures board can light it in place,
 * and only after the yard has routed.
 */
export function indicatorOf(explanation: string): string | undefined {
  const m = explanation.match(/"([^"]{2,24})"/);
  return m ? m[1] : undefined;
}

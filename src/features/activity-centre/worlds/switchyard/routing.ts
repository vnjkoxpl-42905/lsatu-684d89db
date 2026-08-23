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

/* ------------------------------------------------------------------ *
 * Signal faults
 *
 * The locked partial set is three named errors, and the spec gives each one its
 * own choreography in the yard. Which one a student made is DERIVED here by
 * comparing their parsed routing against the credited one, rather than asked of
 * the Coach: the Coach returns a verdict and prose, and reading an error type
 * out of prose would be guessing. A structural comparison either finds the
 * error or honestly returns none.
 * ------------------------------------------------------------------ */

export type FaultKind = "reversal" | "dropped-negation" | "trimmed-condition";
export type FaultSide = "if" | "then";

export interface Fault {
  kind: FaultKind;
  /** Which track carries the affected capsule. Reversal affects both. */
  side: FaultSide | "both";
}

// Words that carry polarity rather than content. Stripped before comparing, so
// "is not refueled" still aligns with "is refueled" and the difference surfaces
// as a dropped negation rather than as two unrelated clauses.
const POLARITY_TOKENS = new Set([
  "not",
  "no",
  "never",
  "cannot",
  "cant",
  "dont",
  "doesnt",
  "didnt",
  "wont",
  "wouldnt",
  "isnt",
  "arent",
  "wasnt",
  "werent",
  "neither",
  "nothing",
]);

// Function words carry no discriminating content for alignment.
const STOP_TOKENS = new Set(["a", "an", "the", "is", "are", "was", "were", "be", "been", "to", "of"]);

function contentTokens(clause: string): string[] {
  return clause
    .toLowerCase()
    .replace(/n't\b/g, " not")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !POLARITY_TOKENS.has(t) && !STOP_TOKENS.has(t));
}

/** Share of the longer clause's content words the two clauses have in common. */
function alignment(a: string, b: string): number {
  const A = new Set(contentTokens(a));
  const B = new Set(contentTokens(b));
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared += 1;
  return shared / Math.max(A.size, B.size);
}

/** True when `short` says a strict subset of what `full` says, and materially less. */
function isTrimmed(short: string, full: string): boolean {
  const S = contentTokens(short);
  const F = new Set(contentTokens(full));
  if (S.length < 2 || !S.every((t) => F.has(t))) return false;
  return F.size - new Set(S).size >= 2;
}

/**
 * Name the student's error, or return null when their routing is credited-clean
 * or too far from it to classify. Null is a real answer: the yard then makes no
 * claim about which mistake was made and the Coach takes the item.
 */
export function diagnose(credited: Routing, student: Routing | null): Fault | null {
  if (!student) return null;

  const straight =
    alignment(student.ifClause.text, credited.ifClause.text) +
    alignment(student.thenClause.text, credited.thenClause.text);
  const crossed =
    alignment(student.ifClause.text, credited.thenClause.text) +
    alignment(student.thenClause.text, credited.ifClause.text);

  // Both clauses sit on the wrong track: the reversal, the error this drill
  // exists to kill. Requires a real crossed match, not merely a weak straight one.
  if (crossed > straight && crossed >= 1) return { kind: "reversal", side: "both" };
  if (straight < 1) return null;

  // Routed correctly. Anything left is a fault inside a capsule.
  if (student.ifClause.negated !== credited.ifClause.negated) {
    return { kind: "dropped-negation", side: "if" };
  }
  if (student.thenClause.negated !== credited.thenClause.negated) {
    return { kind: "dropped-negation", side: "then" };
  }
  if (isTrimmed(student.ifClause.text, credited.ifClause.text)) {
    return { kind: "trimmed-condition", side: "if" };
  }
  if (isTrimmed(student.thenClause.text, credited.thenClause.text)) {
    return { kind: "trimmed-condition", side: "then" };
  }
  return null;
}

/** Whether the student's routing differs enough from credited to be worth showing. */
export function differs(credited: Routing, student: Routing | null): boolean {
  if (!student) return false;
  const same = (a: Clause, b: Clause) =>
    a.negated === b.negated && contentTokens(a.text).join(" ") === contentTokens(b.text).join(" ");
  return !(same(student.ifClause, credited.ifClause) && same(student.thenClause, credited.thenClause));
}

/* ------------------------------------------------------------------ *
 * The fast path
 *
 * A student who writes an answer the author already wrote down needs no model
 * to confirm it. This recognises exactly that case and nothing else.
 *
 * It compares against EVERY credited answer, not just the first. In this bank
 * the second credited answer is the contrapositive, and on items 46, 47 and 48
 * it is a genuinely different logical direction. Checking only slot 0 would
 * grade the answer the task explicitly asks for as wrong.
 *
 * It makes no inference: a correct paraphrase the author did not write ("fans
 * are running all night" for "fans run overnight") falls through, because
 * `differs` compares token sequences with no stemming or synonyms. Falling
 * through means asking the Coach, which is the safe direction to fail in.
 * ------------------------------------------------------------------ */

/** Bumped whenever the rules above change, so shadow telemetry is attributable. */
export const PARSER_VERSION = "routing-1";

/**
 * True when the student's routing is structurally identical to one of the
 * item's credited answers. False is not a claim that the answer is wrong; it
 * only means this cannot be settled without the Coach.
 */
export function matchesAnyCredited(creditedAnswers: string[] | undefined, response: string): boolean {
  const student = parseRouting(response);
  if (!student) return false;
  return (creditedAnswers ?? []).some((credited) => {
    const routing = parseRouting(credited);
    return routing ? !differs(routing, student) : false;
  });
}

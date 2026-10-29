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

  // A sentence carrying TWO conditionals is not two clauses, and the regex above
  // will happily hand back the whole tail as one. Item 62 parsed to a THEN of
  // "the flood layer dates to spring; and if the match is trustworthy, then the
  // stratum was sealed" -- an entire second rule inside one capsule, drawn on
  // screen as though it were a single condition. Returning null is the honest
  // answer: the world already falls back to the plain prompt and the authored
  // answers, which is correct, rather than a diagram that is wrong.
  if (/\bif\b|\bthen\b/i.test(ifText) || /\bif\b|\bthen\b/i.test(thenText)) return null;

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
const STOP_TOKENS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "to", "of",
  "by", "in", "on", "at", "for", "that", "it", "they", "them", "their",
]);

const TOKEN_ALIASES: Record<string, string> = {
  overnight: "night",
};

function stem(token: string): string {
  const aliased = TOKEN_ALIASES[token] ?? token;
  if (aliased.length > 5 && aliased.endsWith("ing")) {
    const root = aliased.slice(0, -3);
    return root.length > 2 && root.at(-1) === root.at(-2) ? root.slice(0, -1) : root;
  }
  if (aliased.length > 4 && aliased.endsWith("ies")) return `${aliased.slice(0, -3)}y`;
  if (aliased.length > 4 && aliased.endsWith("ed")) return aliased.slice(0, -2);
  if (aliased.length > 3 && aliased.endsWith("s") && !aliased.endsWith("ss")) return aliased.slice(0, -1);
  return aliased;
}

function contentTokens(clause: string): string[] {
  return clause
    .toLowerCase()
    .replace(/n't\b/g, " not")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !POLARITY_TOKENS.has(t) && !STOP_TOKENS.has(t))
    .map(stem);
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
 * claim about which named mistake was made.
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
 * Exact structural matching
 *
 * A student who writes an answer the author already wrote down needs no model
 * to confirm it. This recognises exactly that case and nothing else.
 *
 * It compares against EVERY credited answer, not just the first. In this bank
 * the second credited answer is the contrapositive, and on items 46, 47 and 48
 * it is a genuinely different logical direction. Checking only slot 0 would
 * grade the answer the task explicitly asks for as wrong.
 *
 * This narrow helper remains useful for exact authored structures. The
 * authoritative local judge below handles ordinary paraphrases and named
 * conditional-logic errors without calling the Coach.
 * ------------------------------------------------------------------ */

/** Bumped whenever the rules above change, so shadow telemetry is attributable. */
export const PARSER_VERSION = "routing-2-local-judge";

/**
 * True when the student's routing is structurally identical to one of the
 * item's credited answers. False is not a claim that the answer is wrong.
 */
export function matchesAnyCredited(creditedAnswers: string[] | undefined, response: string): boolean {
  const student = parseRouting(response);
  if (!student) return false;
  return (creditedAnswers ?? []).some((credited) => {
    const routing = parseRouting(credited);
    return routing ? !differs(routing, student) : false;
  });
}

export interface LocalConditionalVerdict {
  verdict: "correct" | "partial" | "incorrect";
  feedback: string;
}

const MIN_CLAUSE_ALIGNMENT = 0.67;

function normalizedSentence(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function aligned(a: Clause, b: Clause): boolean {
  return alignment(a.text, b.text) >= MIN_CLAUSE_ALIGNMENT;
}

function samePolarity(a: Clause, b: Clause): boolean {
  return a.negated === b.negated;
}

/**
 * Judge a Conditional Rephrase answer entirely on-device.
 *
 * The prompt requires an If X, then Y form, which gives this parser a closed
 * grammar. Content words are compared by overlap after light normalization,
 * while direction and negation are checked separately. This accepts harmless
 * additions and ordinary inflection without turning a shared noun into proof
 * that a different claim is correct.
 */
export function judgeConditionalResponse(
  creditedAnswers: string[] | undefined,
  response: string,
): LocalConditionalVerdict {
  const answers = creditedAnswers ?? [];
  const normalized = normalizedSentence(response);
  if (!normalized) {
    return { verdict: "incorrect", feedback: "Write the statement as If [sufficient], then [necessary]." };
  }

  // The final bank item contains two conditionals. Exact authored wording is
  // still deterministically knowable even though the one-routing visual parser
  // correctly refuses to squeeze two rules onto one pair of tracks.
  if (answers.some((answer) => normalizedSentence(answer) === normalized)) {
    return { verdict: "correct", feedback: "" };
  }

  const student = parseRouting(response);
  if (!student) {
    return {
      verdict: "incorrect",
      feedback: "Use one complete structure: If [sufficient], then [necessary].",
    };
  }

  const candidates = answers.map(parseRouting).filter((routing): routing is Routing => Boolean(routing));

  for (const credited of candidates) {
    const sameContent = aligned(student.ifClause, credited.ifClause) && aligned(student.thenClause, credited.thenClause);
    if (
      sameContent &&
      samePolarity(student.ifClause, credited.ifClause) &&
      samePolarity(student.thenClause, credited.thenClause) &&
      !isTrimmed(student.ifClause.text, credited.ifClause.text) &&
      !isTrimmed(student.thenClause.text, credited.thenClause.text)
    ) {
      return { verdict: "correct", feedback: "" };
    }
  }

  for (const credited of candidates) {
    const straight = aligned(student.ifClause, credited.ifClause) && aligned(student.thenClause, credited.thenClause);
    if (straight && (!samePolarity(student.ifClause, credited.ifClause) || !samePolarity(student.thenClause, credited.thenClause))) {
      return {
        verdict: "partial",
        feedback: "Your clauses are on the right tracks, but a negation changed. Check every not, no, never, and cannot.",
      };
    }
  }

  for (const credited of candidates) {
    const reversed = aligned(student.ifClause, credited.thenClause) && aligned(student.thenClause, credited.ifClause);
    if (reversed) {
      return {
        verdict: "partial",
        feedback: "You reversed the arrow. The necessary condition does not guarantee the sufficient condition.",
      };
    }
  }

  for (const credited of candidates) {
    if (isTrimmed(student.ifClause.text, credited.ifClause.text) || isTrimmed(student.thenClause.text, credited.thenClause.text)) {
      return {
        verdict: "partial",
        feedback: "One side of the conditional lost part of the original condition. Carry the whole condition across.",
      };
    }
  }

  return {
    verdict: "incorrect",
    feedback: "The direction or content does not match the statement. Find the trigger, then identify what it requires.",
  };
}

/* ------------------------------------------------------------------ *
 * The flip, and where it is safe to perform
 *
 * `flip()` swaps the clauses and inverts the polarity flag, but it cannot
 * rewrite the clause TEXT -- so a flipped rail used to read "the beacon goes
 * dark" with the lamp lit, directly above a plate reading "If the beacon did
 * not go dark". They contradicted each other on screen, in the drill about
 * negation. That is why the flip was never performed.
 *
 * Making it true means showing polarity as readable text rather than as an
 * unlabelled lamp, which needs the clause split into a positive core and a
 * polarity. That split is only sound for some of the bank:
 *
 *   - "the string quartet is not"      an ellipsis; the core is a noun phrase
 *   - "lack impulsive onsets"          lexical negation, invisible to the list
 *   - "no fixture is shielded"         the bare no + noun path
 *   - "both X and Y" / "X rather than Y"   NOT [...] does not resolve the scope
 *
 * Rather than guess at those, an item earns the animated flip only by passing a
 * gate that is checkable in a test. Everything else shows the AUTHORED
 * contrapositive plate with a static junction and no derived rails, which is
 * not a downgrade: the authored sentence is correct by construction.
 * ------------------------------------------------------------------ */

/**
 * Negations that behave as auxiliaries: they sit between a subject and its
 * predicate, and swapping them for their positive form leaves a clause that
 * still reads. Longest-first so "cannot" is never matched as "can not".
 */
const POLARITY_PAIRS: [negative: string, positive: string][] = [
  ["cannot", "can"],
  ["can not", "can"],
  ["does not", "does"],
  ["do not", "do"],
  ["did not", "did"],
  ["is not", "is"],
  ["are not", "are"],
  ["was not", "was"],
  ["were not", "were"],
  ["will not", "will"],
  ["would not", "would"],
  ["has not", "has"],
  ["have not", "have"],
  ["had not", "had"],
  ["may not", "may"],
  ["must not", "must"],
];

/**
 * Negation the list above cannot lift: it is carried by the verb itself, by a
 * determiner, or by a word with no positive twin. A clause containing any of
 * these is negative in a way this module cannot state positively, so it is
 * excluded rather than guessed at.
 */
const UNLIFTABLE_NEGATION =
  /\b(never|neither|nothing|none|nobody|nor|without|lack|lacks|lacked|lacking|absent|fail|fails|failed|unable|refuses?|refused|omits?|omitted|missing|no longer|barred|prevents?|prevented)\b/i;

/** Structures where a single polarity token cannot say what it applies to. */
const NEEDS_SCOPE = /\b(and|or|but|rather than|instead of|both|either|unless|except)\b|[;:]/i;

export interface Polarity {
  /** The clause stated positively, ready to carry a polarity token beside it. */
  core: string;
  /** Whether the clause as authored is negative. */
  negated: boolean;
}

/**
 * Split a clause into a positive core and a polarity, or return null when that
 * cannot be done truthfully. Null is the load-bearing return: it is what keeps
 * an unsound flip off the screen.
 */
export function readPolarity(clause: string): Polarity | null {
  const text = clause.trim();
  if (!text) return null;
  if (NEEDS_SCOPE.test(text)) return null;
  if (UNLIFTABLE_NEGATION.test(text)) return null;
  // The bare "no + noun" path: negation carried by a determiner, which cannot be
  // lifted out without rewriting the noun phrase.
  if (/\bno\s+\w/i.test(text)) return null;

  const lower = text.toLowerCase();
  const hits = POLARITY_PAIRS.filter(([negative]) =>
    new RegExp(`\\b${negative.replace(/ /g, "\\s+")}\\b`, "i").test(lower),
  );
  if (hits.length === 0) {
    // No negation signal of any kind. Guard against the contracted forms the
    // pair list does not carry rather than calling the clause positive.
    if (/n't\b/i.test(text)) return null;
    return { core: text, negated: false };
  }
  if (hits.length > 1) return null; // two negations: not this module's problem

  const [negative, positive] = hits[0];
  const span = new RegExp(`\\b${negative.replace(/ /g, "\\s+")}\\b`, "i");
  // An ellipsis ends ON the negation ("the string quartet is not"), so lifting
  // it leaves a noun phrase rather than a clause.
  if (span.test(text) && /\b(is|are|was|were|does|do|did|has|have|had|will|would|may|must|can)?\s*not\s*$/i.test(text)) {
    return null;
  }
  const core = text.replace(span, positive).replace(/\s+/g, " ").trim();
  if (!core || core === text) return null;
  return { core, negated: true };
}

/** A routing whose every clause can be stated positively with a polarity beside it. */
export interface DerivedRouting {
  ifClause: Polarity;
  thenClause: Polarity;
}

/**
 * The contrapositive as readable structure: the clauses swap tracks and each
 * polarity inverts, with the core text carried across untouched. Returns null
 * when either clause cannot be read, which is the signal to show the authored
 * plate instead of a derived diagram.
 */
export function derivedFlip(routing: Routing): DerivedRouting | null {
  const ifSide = readPolarity(routing.ifClause.text);
  const thenSide = readPolarity(routing.thenClause.text);
  if (!ifSide || !thenSide) return null;
  return {
    ifClause: { core: thenSide.core, negated: !thenSide.negated },
    thenClause: { core: ifSide.core, negated: !ifSide.negated },
  };
}

// Authored contrapositives are written loosely: only 13 of 62 use "If X, then
// Y", while 36 drop the "then". This reads that looser form, and is used ONLY
// to check a derived flip against what the author wrote. It never feeds the
// display, which still requires the strict form.
const IF_COMMA = /^\s*if\s+(.+?),\s*(.+?)\s*$/i;

export function parseAuthoredContrapositive(answer: string): Routing | null {
  const strict = parseRouting(answer);
  if (strict) return strict;

  const match = trimTerminal(answer).match(IF_COMMA);
  if (!match) return null;
  const ifText = trimTerminal(match[1]);
  const thenText = trimTerminal(match[2]);
  if (!ifText || !thenText) return null;
  if (/\bif\b|\bthen\b/i.test(ifText) || /\bif\b|\bthen\b/i.test(thenText)) return null;
  return {
    ifClause: { text: ifText, negated: isNegated(ifText) },
    thenClause: { text: thenText, negated: isNegated(thenText) },
  };
}

/**
 * Whether this item earns the animated flip.
 *
 * The last condition is the one that makes the rest trustworthy: the derived
 * polarity must AGREE with the polarity of the sentence the author wrote. That
 * is not belt and braces. Items 52 and 53 turn on "takes the color unevenly" --
 * lexical negation carried by a prefix, invisible to any list of negation words
 * worth maintaining -- and the derived flip would have rendered a double
 * negative the student had to untangle. Checking against the author catches
 * that, and catches every other case the word lists have not thought of yet.
 *
 * An item that fails any condition is not broken. It shows the authored plate,
 * which is correct by construction.
 */
export function flipIsDerivable(creditedAnswers: string[] | undefined): boolean {
  const [first, second] = creditedAnswers ?? [];
  if (!first || !second) return false;

  const routing = parseRouting(first);
  if (!routing) return false;
  const derived = derivedFlip(routing);
  if (!derived) return false;

  const authored = parseAuthoredContrapositive(second);
  if (!authored) return false;
  const authoredIf = readPolarity(authored.ifClause.text);
  const authoredThen = readPolarity(authored.thenClause.text);
  if (!authoredIf || !authoredThen) return false;

  return (
    derived.ifClause.negated === authoredIf.negated &&
    derived.thenClause.negated === authoredThen.negated
  );
}

// Relationship figures and affirmative-only matching use the item's own key.
// Historical snapshots keep their own indicators; no canonical bank is substituted.

import type { ActivityItem } from "../../api/types";

export type RelationKind = "conditional" | "causal" | "comparative";

export interface Relation {
  kind: RelationKind;
  /** The indicator words as the bank quotes them. */
  indicators: string[];
  /**
   * Where each indicator sits in the statement, as [start, end) offsets. A
   * figure is drawn between these, so an indicator that cannot be found is
   * never given a position.
   */
  anchors: { text: string; start: number; end: number }[];
  /** Separated phrases ("stronger ... than") where every half must be quoted. */
  requiredParts?: string[][];
}

export interface Signal {
  order: number;
  rung: number;
  statement: string;
  relations: Relation[];
  /** The count the bank declares in its own explanation, when it declares one. */
  declared: number | null;
}

const GROUP =
  /(conditional|causal|comparative|comparison)\s*,\s*((?:"[^"]+"(?:\s+and\s+)?)+)/gi;
const QUOTED = /"([^"]+)"/g;

/** Words too common to anchor a figure to on their own. */
const UNANCHORABLE = new Set(["to", "the", "a", "an", "of", "in", "on"]);

function normalizeKind(raw: string): RelationKind {
  const k = raw.toLowerCase();
  // The bank writes "comparative"; the drill's badge says "Comparison". One
  // name internally so the geometries table cannot drift from the parser.
  return k === "comparison" ? "comparative" : (k as RelationKind);
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function locate(word: string, statement: string): { text: string; start: number; end: number } | null {
  const m = statement.match(new RegExp(`\\b${escape(word)}\\b`, "i"));
  if (!m || m.index === undefined) return null;
  return { text: statement.slice(m.index, m.index + m[0].length), start: m.index, end: m.index + m[0].length };
}

/**
 * Where an indicator sits in its statement.
 *
 * Tried whole first, because "only if" is one indicator and should anchor as
 * one. When the whole phrase is not contiguous in the text, it is split: a
 * comparative like "more … than" is authored as a pair precisely because the
 * statement separates them, and the figure needs both ends.
 */
export function anchorsFor(indicator: string, statement: string) {
  const whole = indicator.trim().replace(/[.,]+$/, "").trim();
  const direct = locate(whole, statement);
  if (direct) return [direct];

  const out: { text: string; start: number; end: number }[] = [];
  for (const part of whole.split(/…|\.\.\./).map((p) => p.trim()).filter(Boolean)) {
    const asPhrase = locate(part, statement);
    if (asPhrase) {
      out.push(asPhrase);
      continue;
    }
    for (const raw of part.split(/\s+/)) {
      const word = raw.replace(/[.,]+$/, "");
      if (!word || UNANCHORABLE.has(word.toLowerCase())) continue;
      const at = locate(word, statement);
      if (at) out.push(at);
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Split a statement into words, keeping each one's character offsets. */
export function splitWords(statement: string) {
  const out: { i: number; text: string; start: number; end: number }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(statement)) !== null) {
    out.push({ i: i++, text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

export function parseSignal(item: ActivityItem): Signal | null {
  const credited = item.credited_answers?.[0];
  if (!credited) return null;

  const relations: Relation[] = [];
  for (const m of credited.matchAll(GROUP)) {
    const kind = normalizeKind(m[1]);
    const indicators = [...m[2].matchAll(QUOTED)].map((q) => q[1]);
    if (!indicators.length) continue;

    const anchors = indicators.flatMap((ind) => anchorsFor(ind, item.prompt))
      .filter((anchor, index, all) => all.findIndex((a) => a.start === anchor.start && a.end === anchor.end) === index)
      .sort((a, b) => a.start - b.start);
    relations.push({ kind, indicators, anchors });
  }
  if (!relations.length) return null;
  for (const r of relations) {
    const keyed = item.answer_key?.relationships?.find((k) => normalizeKind(k.type) === r.kind);
    if (keyed?.required_parts?.length) r.requiredParts = keyed.required_parts;
  }

  const declared = item.explanation?.match(/(\d+)\s+relationship/)?.[1];

  return {
    order: item.order,
    rung: Number(item.category?.match(/Rung\s*(\d)/i)?.[1] ?? 0),
    statement: item.prompt,
    relations,
    declared: declared ? Number(declared) : null,
  };
}

/* ------------------------------------------------------------------ *
 * Which way a conditional points
 * ------------------------------------------------------------------ */

/**
 * A conditional figure is an arrow, and an arrow makes a claim about direction.
 * Pointing it the wrong way teaches the reversal error, which is the single
 * mistake the Switchyard exists to drill against, so the direction comes from
 * an explicit lexicon of standard indicators rather than from position or guess.
 *
 * `sufficient` means the indicator's own clause is the trigger, and the arrow
 * leaves it. `necessary` means the indicator's clause is what must hold, and
 * the arrow points into it. Anything not listed gets NO arrowhead: the shaft
 * still draws and still connects the two groups, it just makes no claim about
 * which way the rule runs.
 */
const DIRECTION: [RegExp, "sufficient" | "necessary"][] = [
  // Necessary-condition markers first: "only if" must beat "if".
  [/^only if$/i, "necessary"],
  [/^only when$/i, "necessary"],
  [/^only where$/i, "necessary"],
  [/^the only$/i, "necessary"],
  [/^requires?$/i, "necessary"],
  [/^required$/i, "necessary"],
  [/^depends on$/i, "necessary"],
  [/^contingent on$/i, "necessary"],
  [/^necessary$/i, "necessary"],
  [/^if$/i, "sufficient"],
  [/^when$/i, "sufficient"],
  [/^whenever$/i, "sufficient"],
  [/^wherever$/i, "sufficient"],
  [/^where$/i, "sufficient"],
  [/^provided$/i, "sufficient"],
  [/^as long as$/i, "sufficient"],
  [/^given$/i, "sufficient"],
];

export function directionOf(indicator: string): "sufficient" | "necessary" | null {
  const bare = indicator.trim().replace(/[.,]+$/, "");
  for (const [re, dir] of DIRECTION) if (re.test(bare)) return dir;
  return null;
}

/* ------------------------------------------------------------------ *
 * Reading the student's answer
 * ------------------------------------------------------------------ */

export interface Reading {
  /** Relationships the student named that are really there. */
  found: RelationKind[];
  /** Relationships they named that the statement does not carry. */
  invented: RelationKind[];
  /** Relationships in the statement they did not name. */
  missed: RelationKind[];
  /** True when they also quoted at least one credited indicator per found type. */
  quotedIndicators: boolean;
  /**
   * A figure is drawn only for a relation the student both named AND is real.
   * A named-but-absent type draws as a ghost that dissolves.
   */
  drawn: RelationKind[];
}

/**
 * The words a student uses to name each type. The drill's own dial says
 * "Comparison", so that has to count; so do the textbook names a student brings
 * from elsewhere ("necessary condition", "if-then", "cause and effect").
 */
// Keep labels, pair boundaries and type recognition on the same vocabulary.
// The Edge Function has a runtime-local copy, pinned by parity tests.
export const KIND_PATTERNS: Record<RelationKind, string> = {
  conditional: String.raw`conditional(?:s|ly)?|(?:necessary|sufficient)\s+conditions?|conditions?|if\s*[-/]?\s*then(?:\s+rule)?|requirements?`,
  causal: String.raw`causal(?:ity|ly)?|causation|cause[sd]?(?:\s+and\s+effect)?`,
  comparative: String.raw`comparat(?:ive|ively)|comparisons?|compar(?:e|es|ing|ed)`,
};
const KIND_WORDS = Object.entries(KIND_PATTERNS).map(([kind, pattern]) =>
  [new RegExp(`\\b(?:${pattern})\\b`, "gi"), kind as RelationKind] as const,
);

/**
 * "Conditional, requires (not causal)" rules causal OUT. Counting that as a
 * claim of causation drew a ghost for the exact mistake the student had just
 * avoided, so a type word sitting right after a negation is not a claim.
 */
const NEGATED_BEFORE = /\b(?:not|no|never|isn't|isnt|is\s+not|rather\s+than|instead\s+of|neither|nor)\s+(?:a\s+|an\s+|the\s+)?$/i;

function namedKinds(response: string): Set<RelationKind> {
  const named = new Set<RelationKind>();
  for (const [re, kind] of KIND_WORDS) {
    for (const m of response.matchAll(re)) {
      const before = response.slice(Math.max(0, (m.index ?? 0) - 24), m.index);
      if (!NEGATED_BEFORE.test(before)) named.add(kind);
    }
  }
  return named;
}

/**
 * Read a free-text answer in the drill's game format ("conditional, only if").
 *
 * The type is what gets matched; the indicator is checked separately, because
 * the drill's own rubric says type alone is not a complete answer and the
 * world should be able to show a figure drawn from the wrong anchor words.
 */
export function readAnswer(signal: Signal, response: string): Reading {
  const named = namedKinds(response);

  const real = new Set(signal.relations.map((r) => r.kind));

  const found = [...named].filter((k) => real.has(k));
  const invented = [...named].filter((k) => !real.has(k));
  const drawn = matchedKinds(signal, response);
  const missed = [...real].filter((k) => !drawn.includes(k));

  // Did they quote an actual indicator for each type they got right?
  const quotedIndicators = found.length > 0 && found.every((kind) => drawn.includes(kind));

  return { found, invented, missed, quotedIndicators, drawn };
}

/* ------------------------------------------------------------------ *
 * Instant grading
 * ------------------------------------------------------------------ */

/** Lowercase, straight quotes gone, "only-if" read as "only if". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, " ")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Words that turn a short indicator into a different one. "Only if" is not
 * "if", and a student who writes "only if" on an item keyed "if" has named the
 * wrong condition, so a bare "if" match inside "only if" proves nothing.
 */
const LONGER_FORM = /\b(?:only|even|as|not)\s+$/;

/**
 * True when an answer is the credited answer in substance: it names exactly the
 * types the sentence carries, none it does not, and quotes at least one
 * credited indicator for every relationship.
 *
 * This only ever says yes. False is not a verdict of wrong; it means the answer
 * needs judgment, and the Coach takes it. That is what makes it safe to trust:
 * it confirms the answer key rather than reasoning about the student.
 */
function answerPairs(response: string) {
  // Confirm each type/indicator pair locally. A bag of words cannot distinguish
  // "causal, since; comparative, more evenly than" from the swapped labels.
  // Unstructured prose stays with the Coach rather than being guessed correct.
  const boundary = new RegExp(`[,](?=\\s*(?:(?:a|an)\\s+)?(?:${Object.values(KIND_PATTERNS).join("|")})\\b)|[;\\n]+`, "i");
  return response.split(boundary).filter((part) => part.trim()).map((part) => ({
    named: namedKinds(part),
    answer: normalize(part),
  }));
}

function matchedKinds(signal: Signal, response: string): RelationKind[] {
  const pairs = answerPairs(response);
  return signal.relations.filter((r) => {
    const claimed = pairs.filter((pair) => pair.named.has(r.kind));
    return claimed.length > 0 && claimed.every((pair) =>
      pair.named.size === 1 && confidentPair(r, pair.answer, signal.statement),
    );
  }).map((r) => r.kind);
}

/**
 * The structured key and the credited answer must say the same thing. If an
 * edit ever lets them drift, nothing is marked instantly and the Coach (which
 * reads the key) decides, so there are never two divergent instant keys.
 */
export function keyAgreesWithCredited(item: ActivityItem): boolean {
  const key = item.answer_key;
  if (!key) return true;
  const signal = parseSignal(item);
  if (!signal || !Array.isArray(key.relationships) || key.relationships.length !== signal.relations.length) return false;
  return key.relationships.every((k, i) => {
    const r = signal.relations[i];
    return normalizeKind(k.type) === r.kind && Array.isArray(k.indicators)
      && k.indicators.length === r.indicators.length && k.indicators.every((x, j) => x === r.indicators[j]);
  });
}

const PAIR_LABEL = Object.fromEntries(Object.entries(KIND_PATTERNS).map(([kind, pattern]) =>
  [kind, new RegExp(`^(?:a\\s+|an\\s+)?(?:${pattern})\\b[\\s,:().]*`, "i")],
)) as Record<RelationKind, RegExp>;

/** Ordered endpoints, never a bag of words. A wider quotation must be text
 * from this statement; explicitly split answers must use the keyed parts. */
function indicatorIn(indicator: string, answer: string): boolean {
  const parts = normalize(indicator.replace(/[.,]+$/, "")).split(/…|\.\.\./).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return false;
  const re = new RegExp(parts.map((p) => `\\b${escape(p)}\\b`).join("[\\s\\S]*?"), "g");
  for (const m of answer.matchAll(re)) {
    if (!LONGER_FORM.test(answer.slice(0, m.index))) return true;
  }
  return false;
}

/** Positive pairs only. Unknown prose and contradictory extras go to Coach.
 * Every consumed quotation is either an authored split or an exact source span
 * containing a credited indicator. No arbitrary gaps or reordered endpoints. */
function confidentPair(r: Relation, answer: string, statement: string): boolean {
  const cleaned = answer.replace(/\(\s*(?:not|no|never)\s+(?:a\s+|an\s+|the\s+)?(?:conditional|causal|comparative|comparison)\s*\)/gi, " ").trim();
  const label = PAIR_LABEL[r.kind];
  if (!label.test(cleaned)) return false;
  const remainder = cleaned.replace(label, "").trim();
  if (!remainder) return false;
  const source = normalize(statement);
  const indicators = r.indicators.map((i) => normalize(i.replace(/[.,]+$/, "")).trim());
  // Required parts document equivalent split forms, but never make an optional
  // second indicator mandatory (for example Q11's contiguous less time than).
  const splits = [...indicators.filter((i) => /…|\.\.\./.test(i)),
    ...(r.requiredParts ?? []).map((parts) => parts.map((p) => normalize(p).trim()).join(" ... "))];
  const trim = (text: string) => text.replace(/^[\s,:.]+|[\s,:.]+$/g, "");
  const validUnit = (text: string): boolean => {
    const unit = trim(text);
    if (!unit) return false;
    if (splits.some((split) => {
      const parts = split.split(/…|\.\.\./).map((part) => part.trim());
      const forms = [parts.join(" ... "), parts.join(" "), parts.join(" and "), parts.join(", ")];
      const candidate = unit.replace(/\s*(?:…|\.\.\.)\s*/g, " ... ").replace(/\s*,\s*/g, ", ");
      return forms.includes(candidate) && indicatorIn(split, source);
    })) return true;
    return new RegExp(`\\b${escape(unit)}\\b`).test(source)
      && indicators.some((indicator) => indicatorIn(indicator, unit));
  };
  // Try complete spans before separating alternatives: an exact quotation can
  // itself contain commas or 'and'. Memoization bounds ambiguous partitions.
  const memo = new Map<string, boolean>();
  const consume = (raw: string): boolean => {
    const rest = trim(raw);
    if (memo.has(rest)) return memo.get(rest)!;
    if (validUnit(rest)) return true;
    memo.set(rest, false);
    for (const m of rest.matchAll(/\s+and\s+|\s*,\s*/g)) {
      if (validUnit(rest.slice(0, m.index)) && consume(rest.slice(m.index! + m[0].length))) {
        memo.set(rest, true);
        return true;
      }
    }
    return false;
  };
  return consume(remainder);
}

export function matchesCredited(item: ActivityItem, response: string): boolean {
  const signal = parseSignal(item);
  if (!signal || !response.trim()) return false;
  if (!keyAgreesWithCredited(item)) return false;
  const named = namedKinds(response);
  const real = new Set(signal.relations.map((r) => r.kind));
  if (named.size !== real.size || [...named].some((k) => !real.has(k))) return false;
  if (!answerPairs(response).every((pair) => pair.named.size === 1 && signal.relations.some((r) =>
    pair.named.has(r.kind) && confidentPair(r, pair.answer, signal.statement),
  ))) return false;
  const matched = matchedKinds(signal, response);
  return signal.relations.every((r) => matched.includes(r.kind));
}

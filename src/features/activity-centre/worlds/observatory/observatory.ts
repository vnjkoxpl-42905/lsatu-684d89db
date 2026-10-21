// The Signal Observatory draws the relationship hiding in a statement as a
// figure between the statement's own words.
//
// This is the most machine-readable bank in the Centre, and the world leans on
// that rather than on judgment. Measured across its 48 items:
//
// - All 48 credited answers parse as `type, "indicator"` groups, including the
//   multi-relationship form (`conditional, "Only if"; causal, "because" and
//   "accelerates"`).
// - All 109 indicator words anchor to real words in their own statement, so
//   every figure is drawn from text the student can see rather than from a
//   position I chose. Three shapes of indicator needed handling to get there:
//   a quote carrying a trailing period ("lags."), a split comparative
//   ("more … than"), and a separated pair ("stronger than" appearing as
//   "stronger ... than").
// - The authored relationship count agrees with the parsed group count on 47 of
//   48. Item 40 declares four and lists three; that is an authoring
//   inconsistency, flagged rather than papered over, and the parse follows the
//   credited answer because that is what the student is graded against.
//
// What this module does NOT do is decide which words are jargon. The Rung 4
// dimming is still an open question on the drill's README and would need a
// technical-vocabulary list nobody has written; dimming words by my own guess
// at what looks technical would show a student my judgment as his teaching.

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

    const anchors = indicators.flatMap((ind) => anchorsFor(ind, item.prompt));
    relations.push({ kind, indicators, anchors });
  }
  if (!relations.length) return null;

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

const KIND_WORDS: [RegExp, RelationKind][] = [
  [/\bconditional(?:ly)?\b/i, "conditional"],
  [/\bcausal(?:ity|ly)?\b|\bcause[sd]?\b/i, "causal"],
  [/\bcomparat(?:ive|ison)\b|\bcompar(?:e|ing|ed)\b/i, "comparative"],
];

/**
 * Read a free-text answer in the drill's game format ("conditional, only if").
 *
 * The type is what gets matched; the indicator is checked separately, because
 * the drill's own rubric says type alone is not a complete answer and the
 * world should be able to show a figure drawn from the wrong anchor words.
 */
export function readAnswer(signal: Signal, response: string): Reading {
  const named = new Set<RelationKind>();
  for (const [re, kind] of KIND_WORDS) if (re.test(response)) named.add(kind);

  const real = new Set(signal.relations.map((r) => r.kind));

  const found = [...named].filter((k) => real.has(k));
  const invented = [...named].filter((k) => !real.has(k));
  const missed = [...real].filter((k) => !named.has(k));

  // Did they quote an actual indicator for each type they got right?
  const quotedIndicators =
    found.length > 0 &&
    found.every((kind) =>
      signal.relations
        .filter((r) => r.kind === kind)
        .some((r) =>
          r.indicators.some((ind) => {
            const bare = ind.replace(/[.,]+$/, "").split(/…|\.\.\./)[0].trim();
            return bare.length > 1 && new RegExp(`\\b${escape(bare)}\\b`, "i").test(response);
          }),
        ),
    );

  return { found, invented, missed, quotedIndicators, drawn: found };
}

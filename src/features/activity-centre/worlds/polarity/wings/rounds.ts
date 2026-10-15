// Round construction for the chamber's wing.
//
// The spec asks for two wings and this file builds one, because the other two
// need material the bank does not contain:
//
// - The Strength Ladder wants a statement plus FOUR candidate negations, one
//   minimal and the rest too strong. Each item authors exactly one negation,
//   the credited one. The other three would be mine, written to look like near
//   misses of his, which is the one thing this Centre does not do.
// - Overshoot Court wants a flawed negation to rule on. No item writes one out.
//   The drill's rules name the polar-opposite trap in general terms and the
//   worked example does not carry one either.
//
// Both become buildable the moment those are authored, and neither needs a code
// change beyond a new builder here.
//
// What the bank DOES author on all 30 items is the kind of statement, and that
// is a real first move: "to negate 'every,' show just one counterexample" only
// works once you have seen that it is an 'every' statement.

import type { Plate } from "../polarity";

export interface AssayCall {
  order: number;
  statement: string;
  /** The bank's own category label for this statement. */
  kind: string;
  /** Four labels, one of them right. */
  options: string[];
  /** The bank's explanation, shown after the call. */
  why: string;
}

/** A fixed scramble, so a returning student meets the same call. */
function scramble<T>(list: T[], seed: number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The Assay.
 *
 * What kind of claim is on the plate? The negation move follows from the answer,
 * so this is the step before the chamber's own.
 *
 * Distractors are other categories the bank itself uses, never invented ones,
 * and an item whose category is unique in the bank is skipped rather than
 * padded with labels that do not exist.
 */
export function buildAssay(plates: Plate[], size = 10): AssayCall[] {
  const kinds = [...new Set(plates.map((p) => p.kind).filter(Boolean))];
  // Four options need four real labels to choose between.
  if (kinds.length < 4) return [];

  const calls: AssayCall[] = [];
  for (const p of plates) {
    if (!p.kind || !p.why) continue;

    const others = kinds.filter((k) => k !== p.kind);
    // Walk the pool from a different offset per item so the same three
    // distractors do not follow the student through the whole round.
    const start = (p.order * 3) % others.length;
    const picked: string[] = [];
    for (let i = 0; picked.length < 3 && i < others.length; i += 1) {
      picked.push(others[(start + i) % others.length]);
    }

    calls.push({
      order: p.order,
      statement: p.statement,
      kind: p.kind,
      options: scramble([p.kind, ...picked], p.order),
      why: p.why,
    });
    if (calls.length >= size) break;
  }
  return calls;
}

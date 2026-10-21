// Round construction for the lab's two wings.
//
// Both build from authored data only: the credited candidates, the authored
// traps, and the four items whose own text fixes a charge. Nothing here invents
// a meaning, a valence, or a near-miss.

import type { ActivityItem } from "../../../api/types";
import { parseSpecimen, type Charge, type Specimen } from "../specimen";

export interface BoundaryCall {
  order: number;
  word: string;
  fieldNote: string;
  /** The meaning being proposed for the word. */
  proposal: string;
  /** Whether the proposal is inside the word's boundary. */
  verdict: "accept" | "reject";
  /** The authored reasoning shown after the call. */
  why: string;
}

export interface ChargeCall {
  order: number;
  word: string;
  fieldNote: string;
  charge: Charge;
  why: string;
}

export function specimensOf(items: ActivityItem[]): Specimen[] {
  return items.map(parseSpecimen).filter(Boolean) as Specimen[];
}

/**
 * The Boundary Room.
 *
 * Every authored trap is a rejection, so a room built from traps alone would
 * have one answer and a student could clear it without reading. Each trap is
 * therefore paired with one of the item's own credited candidates, which is an
 * acceptance. The call is even, and both halves are Joshua's words.
 */
export function buildBoundaryRound(items: ActivityItem[]): BoundaryCall[] {
  const calls: BoundaryCall[] = [];
  for (const item of items) {
    const s = parseSpecimen(item);
    if (!s?.trap) continue;

    calls.push({
      order: s.order,
      word: s.word,
      fieldNote: s.fieldNote,
      proposal: s.trap,
      verdict: "reject",
      why: item.explanation,
    });
    calls.push({
      order: s.order,
      word: s.word,
      fieldNote: s.fieldNote,
      proposal: s.candidates[0],
      verdict: "accept",
      why: item.credited_answers[0],
    });
  }
  // Interleave so the two verdicts alternate rather than arriving in blocks.
  const rejects = calls.filter((c) => c.verdict === "reject");
  const accepts = calls.filter((c) => c.verdict === "accept");
  const out: BoundaryCall[] = [];
  for (let i = 0; i < Math.max(rejects.length, accepts.length); i += 1) {
    // Alternate which side leads so the pattern is not itself a tell.
    const pair = i % 2 === 0 ? [rejects[i], accepts[i]] : [accepts[i], rejects[i]];
    for (const c of pair) if (c) out.push(c);
  }
  return out;
}

/**
 * The Charge Round.
 *
 * Valence-only calls, which is the drill's own fallback skill and the thing his
 * welcome tells students is a real answer. It can only include items whose own
 * text fixes a charge, and today that is four of the fifty-one: a valence for
 * the other forty-seven would be my judgment shown to a student as his.
 *
 * The round grows the moment those charges are authored. Nothing here needs to
 * change for that to happen.
 */
export function buildChargeRound(items: ActivityItem[], size = 10): ChargeCall[] {
  return specimensOf(items)
    .filter((s): s is Specimen & { charge: Charge } => s.charge !== null)
    .slice(0, size)
    .map((s) => {
      const item = items.find((i) => i.order === s.order)!;
      return {
        order: s.order,
        word: s.word,
        fieldNote: s.fieldNote,
        charge: s.charge,
        why: item.credited_answers[0],
      };
    });
}

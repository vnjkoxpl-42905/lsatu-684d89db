// Round construction for the chamber's two wings.
//
// Every candidate and every flawed answer a student reads here is authored: the
// credited claim, the bank's quoted overshoot, its quoted scope note, or a
// sentence lifted whole from the argument. Nothing is generated. In particular
// no scope-dropped candidate is manufactured by deleting a qualifier from his
// credited answer, which would be putting my sentence in front of a student as
// a near miss of his.
//
// The cost of that rule is round size, and it is paid openly: Strength Match
// runs only on the items that carry enough authored candidates to make a call
// that cannot be guessed, and the wing says so when there are none.

import type { ActivityItem } from "../../../api/types";
import { parseRebuttal, rejectionOf, type Rebuttal, type TrapKind } from "../chamber";

export interface MatchCandidate {
  id: string;
  text: string;
  /** The credited answer, or the trap this candidate commits. */
  kind: "credited" | TrapKind;
}

export interface MatchCall {
  order: number;
  level: number;
  attributed: string;
  argument: string;
  candidates: MatchCandidate[];
}

export interface AutopsyCase {
  order: number;
  level: number;
  argument: string;
  attributed: string;
  credited: string;
  /** The flawed answer under examination. Authored, never generated. */
  answer: string;
  /** Which trap it commits. */
  trap: TrapKind;
}

/** The four locked archetypes, in the order the drill names them. */
export const TRAPS: TrapKind[] = ["premise", "vague-referential", "overshoot", "scope-drop"];

export const TRAP_LABEL: Record<TrapKind, string> = {
  premise: "Premise",
  "vague-referential": "Vague referential",
  overshoot: "Overshoot",
  "scope-drop": "Scope drop",
};

const SCOPE_NOTE = /Scope note:\s*"([^"]+)"/;

/** One rejection parser for the whole world, shared with the chamber floor. */
const REJECTION =
  /\b(?:not so|is false|in error|are wrong|is wrong|does not hold|cannot be sustained|cannot stand|does not withstand|is mistaken|were mistaken|are mistaken|fails|is incorrect|is not correct|is unwarranted|is unsound|is unfounded|is untrue)\b/i;

const STOP = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "for", "with", "by",
  "is", "are", "was", "were", "be", "been", "it", "its", "this", "that", "these",
  "those", "as", "from", "into", "than", "then", "so", "not", "no", "but", "which",
  "who", "what", "when", "where", "had", "has", "have", "their", "they", "them",
]);

function tokens(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)),
  );
}

function carries(target: string, candidate: string): number {
  const A = tokens(target);
  if (!A.size) return 0;
  const B = tokens(candidate);
  let shared = 0;
  for (const t of A) if (B.has(t)) shared += 1;
  return shared / A.size;
}

/** A fixed scramble, so a returning student sees the same call. */
function scramble<T>(list: T[], seed: number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function rebuttalsOf(items: ActivityItem[]): Rebuttal[] {
  return items.map(parseRebuttal).filter(Boolean) as Rebuttal[];
}

/**
 * The argument's evidence: a sentence that is neither the attributed claim nor
 * the credited one. Those are the sentences a premise answer restates.
 */
function evidenceOf(rebuttal: Rebuttal): string | null {
  const sentences = rebuttal.argument
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 24);

  for (const s of sentences) {
    if (carries(s, rebuttal.credited) >= 0.45) continue;
    if (rebuttal.attributed && carries(s, rebuttal.attributed) >= 0.45) continue;
    if (REJECTION.test(s)) continue;
    return s;
  }
  return null;
}

/**
 * Strength Match.
 *
 * The attributed claim plus every authored candidate the item carries. Three is
 * the floor: a two-way call is a coin toss, and this wing exists to make a
 * student weigh strengths rather than guess between two.
 */
export function buildStrengthMatch(items: ActivityItem[], size = 12): MatchCall[] {
  const calls: MatchCall[] = [];

  for (const r of rebuttalsOf(items)) {
    if (!r.attributed) continue;

    const candidates: MatchCandidate[] = [
      { id: "credited", text: r.credited, kind: "credited" },
    ];
    if (r.overshoot) {
      candidates.push({ id: "overshoot", text: r.overshoot, kind: "overshoot" });
    }
    const evidence = evidenceOf(r);
    if (evidence) candidates.push({ id: "premise", text: evidence, kind: "premise" });

    const rejection = rejectionOf(r.argument);
    if (rejection) {
      candidates.push({ id: "referential", text: rejection, kind: "vague-referential" });
    }

    if (candidates.length < 3) continue;

    calls.push({
      order: r.order,
      level: r.level,
      attributed: r.attributed,
      argument: r.argument,
      candidates: scramble(candidates, r.order),
    });
    if (calls.length >= size) break;
  }

  return calls;
}

/**
 * Trap Autopsy.
 *
 * One case per authored flawed answer. Each has a known label because the bank
 * named it: a quoted overshoot is an overshoot, a quoted scope note is a scope
 * drop, the argument's own rejection sentence is the vague referential answer,
 * and its evidence sentence is the premise answer.
 *
 * The round is capped per trap so one archetype cannot dominate; a round that
 * was three quarters overshoot would teach the label, not the diagnosis.
 */
export function buildTrapAutopsy(items: ActivityItem[], perTrap = 3): AutopsyCase[] {
  const byTrap = new Map<TrapKind, AutopsyCase[]>(TRAPS.map((t) => [t, []]));

  for (const r of rebuttalsOf(items)) {
    if (!r.attributed) continue;
    const base = {
      order: r.order,
      level: r.level,
      argument: r.argument,
      attributed: r.attributed,
      credited: r.credited,
    };

    if (r.overshoot) {
      byTrap.get("overshoot")!.push({ ...base, answer: r.overshoot, trap: "overshoot" });
    }

    const scope = itemScopeNote(items, r.order);
    if (scope) byTrap.get("scope-drop")!.push({ ...base, answer: scope, trap: "scope-drop" });

    const rejection = rejectionOf(r.argument);
    if (rejection) {
      byTrap
        .get("vague-referential")!
        .push({ ...base, answer: rejection, trap: "vague-referential" });
    }

    const evidence = evidenceOf(r);
    if (evidence) byTrap.get("premise")!.push({ ...base, answer: evidence, trap: "premise" });
  }

  // Interleave across traps so consecutive cases rarely share a label.
  const out: AutopsyCase[] = [];
  for (let i = 0; i < perTrap; i += 1) {
    for (const t of TRAPS) {
      const c = byTrap.get(t)![i];
      if (c) out.push(c);
    }
  }
  return out;
}

function itemScopeNote(items: ActivityItem[], order: number): string | null {
  const item = items.find((i) => i.order === order);
  return item?.explanation?.match(SCOPE_NOTE)?.[1] ?? null;
}

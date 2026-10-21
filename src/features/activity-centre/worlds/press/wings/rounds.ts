// Round construction for the pressroom's two wings.
//
// Everything a student reads here is Joshua's authored text: the checklist
// ideas, the two named traps, and the credited slug. Nothing is generated, and
// no candidate is a paraphrase of one of his.

import type { ActivityItem } from "../../../api/types";
import { parsePress, type BigIdea, type Press } from "../press";

export type CensusKind = "idea" | "trap" | "foreign";

export interface CensusCandidate {
  /** Stable within a page, so React keys and picks do not depend on text. */
  id: string;
  text: string;
  /** Whether this belongs on the paragraph's must-survive list. */
  survives: boolean;
  kind: CensusKind;
  /** The authored reason, shown after the call. */
  why: string;
}

export interface CensusPage {
  order: number;
  monolith: string;
  candidates: CensusCandidate[];
}

export interface JudgeCall {
  order: number;
  monolith: string;
  /** Three authored one-sentence summaries, one of them credited. */
  choices: { id: string; text: string; kind: "credited" | "narrow" | "topic" }[];
  ideas: BigIdea[];
}

const TRAP_WHY = {
  narrow: "True of the paragraph, but too small to be one of its big ideas.",
  topic: "That is the topic, not a point the paragraph makes about it.",
} as const;

const FOREIGN_WHY = "Not in this paragraph. It belongs to a different one.";
const IDEA_WHY = "On the list. A summary that drops this one is incomplete.";

/**
 * A fixed scramble.
 *
 * Deterministic on purpose: the same item always presents in the same order, so
 * a student who returns to a page is not re-reading a reshuffled list, and the
 * tests do not have to stub randomness.
 */
function scramble<T>(list: T[], seed: number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    // A small LCG stepped by position. Any fixed sequence would do; this one
    // just needs to not leave the authored order intact.
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pressesOf(items: ActivityItem[]): Press[] {
  return items.map(parsePress).filter(Boolean) as Press[];
}

/**
 * The Idea Census.
 *
 * The Main Hall asks the student to write a summary and needs the Coach to say
 * which ideas survived. This wing isolates the sub-skill underneath that and
 * needs nobody: the student calls, candidate by candidate, whether a thing has
 * to survive. Every call is checkable against the authored checklist.
 *
 * The distractors are the item's own two traps, which is the point of the wing:
 * "too narrow" and "topic-only" are exactly what students wrongly believe must
 * survive, and here they meet them one at a time instead of buried in their own
 * prose.
 *
 * Ideas from other items are mixed in as further non-survivors. Without them
 * every long candidate would be a trap and every short one an idea, and the
 * shape of a candidate would answer the question before its meaning did.
 */
export function buildIdeaCensus(items: ActivityItem[], foreignPer = 2): CensusPage[] {
  const presses = pressesOf(items);
  const pool = presses.flatMap((p) => p.ideas.map((i) => ({ order: p.order, text: i.text })));

  return presses.map((press) => {
    const candidates: CensusCandidate[] = press.ideas.map((idea) => ({
      id: `i${idea.n}`,
      text: idea.text,
      survives: true,
      kind: "idea",
      why: IDEA_WHY,
    }));

    if (press.traps.narrow) {
      candidates.push({
        id: "t-narrow",
        text: press.traps.narrow,
        survives: false,
        kind: "trap",
        why: TRAP_WHY.narrow,
      });
    }
    if (press.traps.topic) {
      candidates.push({
        id: "t-topic",
        text: press.traps.topic,
        survives: false,
        kind: "trap",
        why: TRAP_WHY.topic,
      });
    }

    // Walk the pool from a different offset per item so the same foreign ideas
    // do not follow the student through the whole census.
    const foreign = pool.filter((p) => p.order !== press.order);
    const start = (press.order * 7) % Math.max(1, foreign.length);
    for (let k = 0; k < Math.min(foreignPer, foreign.length); k += 1) {
      const pick = foreign[(start + k) % foreign.length];
      candidates.push({
        id: `f${k}`,
        text: pick.text,
        survives: false,
        kind: "foreign",
        why: FOREIGN_WHY,
      });
    }

    return {
      order: press.order,
      monolith: press.monolith,
      candidates: scramble(candidates, press.order),
    };
  });
}

/**
 * The Slug Judge.
 *
 * The Main Hall stages the traps against the student's own sentence, which is
 * the harder read: their sentence is theirs, and they are inclined to see their
 * meaning in it. Here the same three forms belong to nobody, so the too-narrow
 * and topic-only shapes can be learned before they have to be avoided.
 *
 * An item without both traps is left out rather than shown with two choices.
 */
export function buildSlugJudge(items: ActivityItem[]): JudgeCall[] {
  return pressesOf(items)
    .filter((p) => p.traps.narrow && p.traps.topic)
    .map((press) => ({
      order: press.order,
      monolith: press.monolith,
      ideas: press.ideas,
      choices: scramble(
        [
          { id: "credited", text: press.slug, kind: "credited" as const },
          { id: "narrow", text: press.traps.narrow!, kind: "narrow" as const },
          { id: "topic", text: press.traps.topic!, kind: "topic" as const },
        ],
        press.order,
      ),
    }));
}

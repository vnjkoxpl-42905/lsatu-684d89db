/**
 * The focus set: the handful of stimuli a finished run says to do again.
 *
 * Pure, so what the Report Card offers and what the tests assert are the same
 * decision. Three rules shape it, and all three come from the same place --
 * nobody is made to redo work they already did well:
 *
 * 1. Only weak stimuli qualify. Weak means the band was below the standard, or
 *    the run was recited word for word, or nothing of her own was said about
 *    it, or the Read she gave was not the move the key names.
 * 2. Nothing weak at all means no set. The card congratulates her and asks for
 *    nothing.
 * 3. When there IS something weak, the set is padded up to five with the
 *    next-lowest stimuli so a redo is worth sitting down for, and capped at ten
 *    so it stays a focus set rather than the section again.
 */

import type { SectionGrade, SectionStimulusGrade } from "../api/types";

export const FOCUS_MIN = 5;
export const FOCUS_MAX = 10;

export interface FocusSet {
  slugs: string[];
  stimuli: SectionStimulusGrade[];
  /** How many of them were actually weak, as against padding. */
  weakCount: number;
}

/** Did this stimulus fall short on any criterion the method scores? */
export function isWeak(s: SectionStimulusGrade): boolean {
  if (s.reciting) return true;
  if (s.band !== "at-the-standard") return true;
  if (s.coloured === false) return true;
  if (s.readGiven === false) return true;
  if (s.readMatches === false) return true;
  return false;
}

/** Worst first: a recital, then the lowest coverage, then authored order. */
function severity(s: SectionStimulusGrade): number {
  return (s.reciting ? -1000 : 0) + (s.percent ?? 0);
}

/**
 * Which stimuli to run again, or null when there is nothing to fix.
 *
 * Never throws and never invents a stimulus: everything returned came from the
 * grade it was given, so the slugs are always a subset of the run's own.
 */
export function pickFocusSet(
  grade: Pick<SectionGrade, "stimuli">,
  opts: { min?: number; max?: number } = {},
): FocusSet | null {
  const min = opts.min ?? FOCUS_MIN;
  const max = opts.max ?? FOCUS_MAX;
  const all = (grade.stimuli ?? []).filter((s) => typeof s?.slug === "string" && s.slug !== "");
  if (all.length === 0) return null;

  const ordered = [...all].sort((a, b) => severity(a) - severity(b));
  const weak = ordered.filter(isWeak);
  if (weak.length === 0) return null;

  const chosen: SectionStimulusGrade[] = [];
  for (const s of ordered) {
    if (chosen.length >= max) break;
    if (isWeak(s) || chosen.length < min) chosen.push(s);
  }

  // Back into the order she ran them in, so the redo reads like a section.
  const inOrder = chosen.sort(
    (a, b) => (a.item_order ?? all.indexOf(a)) - (b.item_order ?? all.indexOf(b)),
  );

  return {
    slugs: inOrder.map((s) => s.slug),
    stimuli: inOrder,
    weakCount: Math.min(weak.length, inOrder.length),
  };
}

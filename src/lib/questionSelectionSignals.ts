import type { QuestionStat } from '@/lib/questionStats';
import type { DifficultyBand } from '@/lib/studentLevel';

/**
 * Signals that turn cohort percentages into selection pressure.
 *
 * Pure arithmetic, no I/O, no bank, no supabase. `guidedDrillLevel.ts` is the
 * only caller that matters; it stays synchronous, so everything here does too.
 *
 * Deliberately separate from `studentLevel.ts`, which is untouched: bands are
 * a product decision about what a level means, and these are measurements of
 * what questions actually do. Mixing them would make the bands look derived.
 */

/**
 * Mean cohort accuracy at each labeled difficulty, measured across 2,223
 * questions that joined the bank to the explanation corpus (r = -0.90).
 * See references/guided-drill-difficulty-calibration.md.
 *
 * These are the anchors, not a model. Interpolating between measured points is
 * honest; fitting a curve through them would invent precision that the sample
 * does not support.
 */
export const DIFFICULTY_ANCHORS: readonly { difficulty: number; correctPct: number }[] = [
  { difficulty: 1, correctPct: 91.7 },
  { difficulty: 2, correctPct: 84.4 },
  { difficulty: 3, correctPct: 75.2 },
  { difficulty: 4, correctPct: 66.4 },
  { difficulty: 5, correctPct: 54.0 },
];

/**
 * Where a cohort accuracy sits on the 1-5 scale, by linear interpolation
 * between the anchors. Returns a fraction: 78% correct is a 2.7, not a 3.
 *
 * Clamped at both ends. A question 96% of people get right is a 1, not a 0.4,
 * because the scale has no room below 1 and pretending otherwise would let a
 * single very easy question drag an average out of range.
 */
export function empiricalDifficulty(correctPct: number | null | undefined): number | null {
  if (correctPct == null || !Number.isFinite(correctPct)) return null;

  const first = DIFFICULTY_ANCHORS[0];
  const last = DIFFICULTY_ANCHORS[DIFFICULTY_ANCHORS.length - 1];
  if (correctPct >= first.correctPct) return first.difficulty;
  if (correctPct <= last.correctPct) return last.difficulty;

  for (let i = 0; i < DIFFICULTY_ANCHORS.length - 1; i++) {
    const hi = DIFFICULTY_ANCHORS[i];
    const lo = DIFFICULTY_ANCHORS[i + 1];
    if (correctPct <= hi.correctPct && correctPct >= lo.correctPct) {
      const span = hi.correctPct - lo.correctPct;
      const t = span === 0 ? 0 : (hi.correctPct - correctPct) / span;
      return hi.difficulty + t * (lo.difficulty - hi.difficulty);
    }
  }
  return null;
}

/**
 * Blend the human label with the cohort measurement.
 *
 * The blend is partial on purpose, and 0.5 is not a hedge. The label is a
 * judgment about WHY a question is hard: what reasoning it demands, how the
 * trap is built. The percentage is what a cohort did to it. A question can be
 * easy to guess and hard to justify, and those are different teaching objects.
 * Letting the percentage win outright would quietly optimise the whole library
 * for guessability.
 *
 * With `weight` 0 this returns the label unchanged, which is what makes the
 * default path provably untouched.
 */
export function effectiveDifficulty(
  labeled: number | null | undefined,
  stat: QuestionStat | null | undefined,
  weight = 0.5,
): number | null {
  const label = typeof labeled === 'number' && Number.isFinite(labeled) ? labeled : null;
  if (weight <= 0) return label;

  const empirical = empiricalDifficulty(stat?.correctPct);
  if (empirical == null) return label;
  if (label == null) return empirical;

  const w = Math.min(1, weight);
  return label * (1 - w) + empirical * w;
}

/**
 * Band membership for a fractional difficulty.
 *
 * A band is a range of integer labels, so a fractional 2.7 belongs to the band
 * that contains the label it rounds to. Written as a half-open interval rather
 * than `Math.round` so that exactly 2.5 lands in the 3, consistently, instead
 * of inheriting whatever tie-breaking rounding happens to use.
 */
export function isInBandFractional(
  difficulty: number | null | undefined,
  band: DifficultyBand,
): boolean {
  if (difficulty == null || !Number.isFinite(difficulty)) return false;
  return difficulty >= band.min - 0.5 && difficulty < band.max + 0.5;
}

/**
 * Reduce a trap tag to the thing worth comparing.
 *
 * The corpus writes compound tags (`Too Strong; Greatest Risk`) and varies
 * casing (`Not A Flaw` / `Not a Flaw`). The base taxonomy is everything before
 * the first separator, matched case-insensitively.
 */
export function normalizeTrapTag(tag: string | null | undefined): string | null {
  if (!tag) return null;
  const base = String(tag).split(/[;:]/)[0].trim().replace(/\s+/g, ' ').toLowerCase();
  return base.length > 0 ? base : null;
}

/**
 * How well a question punishes the mistakes a student keeps making.
 *
 * 0 when there is nothing to target, no stat, or the question's dominant trap
 * is not one of them. When it does match, the score is the trap's share of the
 * wrong answers rather than a flat 1: a question where 39% of the wrong mass
 * sits on the target trap teaches that trap, and one where it barely leads a
 * four-way scatter teaches carelessness. Same tag, different lesson.
 */
export function trapScore(
  stat: QuestionStat | null | undefined,
  targets: readonly string[] | null | undefined,
): number {
  if (!stat || !targets || targets.length === 0) return 0;

  const wanted = new Set(targets.map(normalizeTrapTag).filter((t): t is string => t != null));
  if (wanted.size === 0) return 0;

  const tag = normalizeTrapTag(stat.topTrapTag);
  if (!tag || !wanted.has(tag)) return 0;

  const spread = stat.trapSpread;
  if (spread == null || !Number.isFinite(spread)) return 1;
  return Math.max(0, Math.min(1, spread));
}

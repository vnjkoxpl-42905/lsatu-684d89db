/**
 * What the RC builder tells the student before Start, computed in one place so
 * the timing hint, the launch summary, and the Start gate can never disagree.
 *
 * The builder's unit is the passage. A passage always arrives with all of its
 * questions, so a question count is only ever reported, never requested, and
 * it is read from loaded content once the set has been inspected.
 */

/** Same bounds the `secondsPerPassage` link parameter already accepts. */
export const RC_CUSTOM_PACE_MIN_SECONDS = 60;
export const RC_CUSTOM_PACE_MAX_SECONDS = 3600;

export type RcCustomPace =
  | { ok: true; seconds: number }
  | { ok: false; message: string };

export function formatPace(seconds: number): string {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * Reads a per-passage pace typed as `m:ss` or whole minutes. Rejects anything
 * else with a sentence the student can act on; nothing is silently coerced.
 */
export function parseCustomPace(text: string): RcCustomPace {
  const value = text.trim();
  const match = /^(\d{1,2})(?::(\d{1,2}))?$/.exec(value);
  if (!match) {
    return { ok: false, message: 'Enter a time per passage as minutes:seconds, for example 8:45.' };
  }
  const minutes = Number(match[1]);
  const seconds = match[2] === undefined ? 0 : Number(match[2]);
  if (seconds > 59) {
    return { ok: false, message: 'Seconds must be between 00 and 59.' };
  }
  const total = minutes * 60 + seconds;
  if (total < RC_CUSTOM_PACE_MIN_SECONDS || total > RC_CUSTOM_PACE_MAX_SECONDS) {
    return {
      ok: false,
      message: `Choose between ${formatPace(RC_CUSTOM_PACE_MIN_SECONDS)} and ${formatPace(RC_CUSTOM_PACE_MAX_SECONDS)} per passage.`,
    };
  }
  return { ok: true, seconds: total };
}

export interface RcBuildSummaryInput {
  /** The stepper value. Ignored when passages were hand-picked. */
  requestedPassages: number;
  /** Hand-picked passage IDs, in order. A non-empty list replaces the count. */
  handPickedIds: readonly number[];
  /** Passages the current filters allow (the adaptive selector's pool). */
  poolPassages: number;
  /** The inspected set, once loaded. Its counts come from loaded content. */
  inspected: { passageIds: readonly number[]; questionCounts: readonly number[] } | null;
  /** 0 when untimed. */
  secondsPerPassage: number;
}

export interface RcBuildSummary {
  source: 'hand-picked' | 'adaptive';
  /** What the student asked for, in passages. */
  requestedPassages: number;
  poolPassages: number;
  /** Passages the drill will actually contain if started now. */
  plannedPassages: number;
  /**
   * Questions in the inspected passages, counted from loaded content. Null
   * until the set is inspected: the index count is not a launch promise.
   */
  inspectedQuestions: number | null;
  /** Requested minus supplied, when the adaptive pool falls short. */
  shortfall: number;
  /** Whole-set time budget for the planned passages; null when untimed. */
  totalSeconds: number | null;
}

export function summarizeRcBuild(input: RcBuildSummaryInput): RcBuildSummary {
  const handPicked = input.handPickedIds.length > 0;
  const requestedPassages = handPicked ? input.handPickedIds.length : input.requestedPassages;

  const plannedPassages = input.inspected
    ? input.inspected.passageIds.length
    : handPicked
      ? input.handPickedIds.length
      : Math.min(input.requestedPassages, input.poolPassages);

  return {
    source: handPicked ? 'hand-picked' : 'adaptive',
    requestedPassages,
    poolPassages: input.poolPassages,
    plannedPassages,
    inspectedQuestions: input.inspected
      ? input.inspected.questionCounts.reduce((sum, n) => sum + n, 0)
      : null,
    shortfall: Math.max(0, requestedPassages - plannedPassages),
    totalSeconds: input.secondsPerPassage > 0 ? input.secondsPerPassage * plannedPassages : null,
  };
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

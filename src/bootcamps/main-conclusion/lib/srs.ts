/**
 * SM-2 spaced repetition algorithm.
 *
 * Standard SM-2 with the conventional initial values:
 *   ease (E-Factor) starts at 2.5; floor 1.3
 *   intervals: n=1 → 1 day; n=2 → 6 days; n>2 → prev * ease
 *   grade q ∈ [0,5]; q < 3 resets the interval and increments lapses
 *
 * Returns a mutated *new* item (no in-place mutation).
 */

export interface SrsState {
  ease: number;
  interval_days: number;
  lapses: number;
  reps: number; // successful repetitions in a row
  due_at_iso: string;
  last_grade: number;
}

export function blankSrs(now: Date = new Date()): SrsState {
  return {
    ease: 2.5,
    interval_days: 0,
    lapses: 0,
    reps: 0,
    due_at_iso: now.toISOString(),
    last_grade: 0,
  };
}

export function review(state: SrsState, grade: number, now: Date = new Date()): SrsState {
  const q = Math.max(0, Math.min(5, Math.round(grade)));
  let { ease, interval_days, lapses, reps } = state;

  if (q < 3) {
    // Lapse: reset.
    lapses += 1;
    reps = 0;
    interval_days = 1;
  } else {
    if (reps === 0) interval_days = 1;
    else if (reps === 1) interval_days = 6;
    else interval_days = Math.round(interval_days * ease);
    reps += 1;
  }

  // Update ease (SM-2 formula).
  ease = Math.max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  const due = new Date(now.getTime() + interval_days * 24 * 60 * 60 * 1000);

  return {
    ease,
    interval_days,
    lapses,
    reps,
    due_at_iso: due.toISOString(),
    last_grade: q,
  };
}

export function isDue(state: SrsState, now: Date = new Date()): boolean {
  return new Date(state.due_at_iso).getTime() <= now.getTime();
}

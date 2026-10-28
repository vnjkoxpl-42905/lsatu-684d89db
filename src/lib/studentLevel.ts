/**
 * The proficiency band a student works at, and how it maps onto the question
 * bank's 1-5 difficulty scale.
 *
 * The bands overlap on purpose. Hard cutoffs (1-2 / 3 / 4-5) starve the middle
 * band: a drill narrowed to a single difficulty value runs out of questions on
 * any question type that is not one of the big four. Overlapping bands keep
 * every level drawing from a pool large enough to fill a full drill.
 *
 * This module deliberately has no imports. The bands are needed by the assign
 * path, the runtime resolver, the teacher UI and the tests, and anything that
 * imported the supabase client or the question bank singleton to reach them
 * would drag both into every one of those callers.
 */

export type StudentLevel = 'beginner' | 'intermediate' | 'advanced';

export const STUDENT_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export interface DifficultyBand {
  min: number;
  max: number;
}

/**
 * The one place the band numbers are defined in TypeScript. They appear in SQL
 * exactly once more, in the guided_drills.level backfill, and a spec asserts
 * that migration still agrees with this table.
 */
export const LEVEL_BANDS: Record<StudentLevel, DifficultyBand> = {
  beginner: { min: 1, max: 3 },
  intermediate: { min: 2, max: 4 },
  advanced: { min: 3, max: 5 },
};

export const LEVEL_LABELS: Record<StudentLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/** The full difficulty range, used when no level applies. */
export const FULL_DIFFICULTY_RANGE: DifficultyBand = { min: 1, max: 5 };

export function isStudentLevel(value: unknown): value is StudentLevel {
  return typeof value === 'string' && (STUDENT_LEVELS as readonly string[]).includes(value);
}

/**
 * Narrow an untrusted value (a DB column, a URL param) to a level.
 * Strict: 'Beginner' and 'BEGINNER' are not levels. The stored values are
 * lowercase by CHECK constraint, so anything else is a bug worth surfacing
 * rather than silently coercing.
 */
export function coerceStudentLevel<T>(value: unknown, fallback: T): StudentLevel | T {
  return isStudentLevel(value) ? value : fallback;
}

export function levelBand(level: StudentLevel): DifficultyBand {
  return LEVEL_BANDS[level];
}

/** Midpoint of a band, used to rank out-of-band questions by nearness. */
export function bandMidpoint(band: DifficultyBand): number {
  return (band.min + band.max) / 2;
}

export function isInBand(difficulty: unknown, band: DifficultyBand): boolean {
  // A non-finite difficulty is never in band. One question in the bank has a
  // null difficulty, and the raw numeric comparisons used elsewhere let it pass
  // every filter (null < 1 and null > 5 are both false).
  if (typeof difficulty !== 'number' || !Number.isFinite(difficulty)) return false;
  return difficulty >= band.min && difficulty <= band.max;
}

/** Human-readable band, e.g. "difficulty 1-3". */
export function describeBand(band: DifficultyBand): string {
  return band.min === band.max
    ? `difficulty ${band.min}`
    : `difficulty ${band.min}-${band.max}`;
}

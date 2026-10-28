/**
 * Was the run inside its clock?
 *
 * One derivation, from the two numbers the Report Card prints, used everywhere
 * the answer is stated. Three surfaces used to answer this question and they
 * did not have to agree:
 *
 * - The card read the stored `within_time` flag. Where a row predates the flag
 *   it is `undefined`, which is neither true nor false, so the card said
 *   nothing at all and a student got a time with no verdict beside it.
 * - The launch surface preferred the flag and recomputed only when it was
 *   missing, so the same run could be counted one way in the stat strip and
 *   read another way on the card.
 * - Nothing anywhere checked the flag against the figure printed above it, so a
 *   row whose flag and clock disagree renders "28:32" under a twenty-five
 *   minute goal and says "Inside the time".
 *
 * The grader writes `within_time` from exactly this comparison
 * (`grade-rrc-section/index.ts`), so for every run graded since the flag
 * existed, deriving and reading agree. Deriving costs nothing and makes the
 * disagreement unrepresentable: the verdict is a function of the numbers she
 * can see, so it cannot contradict them.
 *
 * `within_goal` is a different and stricter question -- inside the clock AND
 * every stimulus coloured and given a Read -- and stays on the grade, because
 * it is not derivable from the clock alone.
 */
export interface RunClock {
  /** Drill seconds. Pauses are already out of it: the clock stops with the recorder. */
  total_seconds: number;
  /** The clock this section was set, in minutes. */
  goal_minutes: number;
}

export function insideTime(section: RunClock): boolean {
  return section.total_seconds > 0 && section.total_seconds <= section.goal_minutes * 60;
}

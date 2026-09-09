import type { RecentSectionRun } from "../api/activitiesClient";
import { insideTime } from "./sectionClock";

/**
 * What the launch surface says about a student's last few runs, derived and
 * nothing else.
 *
 * Every number here is read off runs she has already done. Nothing is scored,
 * nothing is predicted, and a number that cannot be established honestly is
 * absent rather than estimated -- which is why several of these are nullable.
 * The rule the whole file obeys: if we cannot know it, we do not print it.
 */

/**
 * One stimulus slot in a run, as the tick row draws it.
 *
 * Three states, not two, and the third is the important one. `notJudged` is a
 * stimulus she recorded and the judge returned no verdict for: our outage, not
 * her miss. Drawing it as an empty slot would tell her she skipped work she
 * actually did.
 *
 * `silent` is the fourth, and it is the one that is easy to get wrong. A
 * stimulus she never spoke into still produces a full grade row: the grader
 * writes `spoken: ""` with zero coverage and NO `ungraded` flag
 * (`grade-rrc-section/index.ts`). Treating the presence of a row as evidence of
 * recall would count her silence as work done and report "25 of 25" to somebody
 * who said nothing.
 *
 * The names deliberately avoid `carried`, which already means something else on
 * `SectionStimulusGrade` -- the NUMBER of details retained. Reusing it for "a
 * verdict exists" would make the two readings collide.
 */
export type TickState = "recorded" | "notJudged" | "silent" | "missing";

export interface RunTicks {
  /** One entry per authored slot, in authored order. */
  ticks: TickState[];
  /** Stimuli she actually spoke into, judged or not. Silence is not counted. */
  recorded: number;
  /** Authored slots in the section. */
  slots: number;
}

export interface SectionStats {
  /** Seconds on the clock for the most recent run. */
  lastRunSeconds: number | null;
  /**
   * Newest minus oldest, in seconds, across the runs shown. Negative is faster.
   * Null with fewer than two runs, where there is no trend to state.
   */
  trendSeconds: number | null;
  /** How many runs the trend spans. */
  trendRuns: number;
  /**
   * Stimuli recorded across every run whose slot count is knowable.
   *
   * `recorded`, not `recalled`. It counts stimuli she spoke into, judged or
   * not; it says nothing about how much came back. Under the old name the door
   * read "Recalled 73/75" for a student who could have recorded seventy-five
   * stimuli and recalled almost nothing on any of them.
   */
  recorded: number | null;
  /** Authored slots across those same runs. */
  recordedOf: number | null;
  /** The clock this section is run against, from the assignment. */
  targetMinutes: number | null;
  /** Runs finished inside the clock, of the ones measured against THIS target. */
  metTarget: number;
  /** Runs the target was measured over. Not every run, only the comparable ones. */
  targetRuns: number;
  /** Every run shown. */
  totalRuns: number;
}

/**
 * How many stimuli the section actually holds, for one run.
 *
 * `stimuli_in_section` is the authored count and is the answer whenever it is
 * present. Where it is not, the highest `item_order` on the run is the next best
 * evidence, because `item_order` is the authored position rather than an index
 * into whatever rows happened to arrive.
 *
 * `stimuli_graded` is deliberately NOT a fallback. On a partial grade it is
 * smaller than the section, so using it would quietly shrink the denominator and
 * turn an interrupted run into a perfect one.
 */
export function slotCountFor(run: RecentSectionRun): number | null {
  const authored = run.section?.stimuli_in_section;
  if (typeof authored === "number" && authored > 0) return authored;

  const orders = (run.stimuli ?? [])
    .map((s) => s.item_order)
    .filter((n): n is number => typeof n === "number");
  if (orders.length === 0) return null;
  // `item_order` is 1-based, so the highest one IS the slot count.
  return Math.max(...orders);
}

/**
 * The tick row for one run, or null when it cannot be drawn honestly.
 *
 * Null in two cases, and both are refusals rather than failures:
 *
 * - the slot count is unknowable, so the row has no length;
 * - any stimulus is missing `item_order` (grades written before ADR 0021's
 *   amendment), so positions would have to come from array order instead. That
 *   silently shifts every tick after a missing row and draws a picture that
 *   disagrees with the authored section.
 */
export function ticksFor(run: RecentSectionRun): RunTicks | null {
  const slots = slotCountFor(run);
  if (slots === null) return null;

  const stimuli = run.stimuli ?? [];
  if (stimuli.length === 0) return null;
  if (stimuli.some((s) => typeof s.item_order !== "number")) return null;
  // Without `spoken` there is no way to tell a stimulus she worked from one she
  // sat through, and guessing in either direction is a number we cannot stand
  // behind. Legacy runs are left out rather than assumed.
  if (stimuli.some((s) => typeof s.spoken !== "string")) return null;

  const ticks: TickState[] = Array.from({ length: slots }, () => "missing" as TickState);
  let recorded = 0;
  for (const s of stimuli) {
    const i = (s.item_order as number) - 1;
    if (i < 0 || i >= slots) continue;
    if (!s.spoken) {
      // A row with no words in it. She was there and said nothing, which is a
      // fact worth showing and is not the same as a stimulus we have no row for.
      ticks[i] = "silent";
      continue;
    }
    // She spoke. Whether the judge answered is the difference between the two
    // filled states, not between filled and empty.
    ticks[i] = s.ungraded ? "notJudged" : "recorded";
    recorded += 1;
  }
  return { ticks, recorded, slots };
}

function seconds(run: RecentSectionRun): number | null {
  // Timing is nested on the summary, not on the run. `SectionRunHistory` reads
  // it the same way.
  const n = run.section?.total_seconds;
  return typeof n === "number" ? n : null;
}

/**
 * The four cells of the stat strip.
 *
 * `runs` arrives newest-first, which is the order the query returns and the
 * order the table draws. Every derivation below depends on that, so it is stated
 * once here rather than re-discovered at each use.
 */
export function statsFor(
  runs: RecentSectionRun[],
  targetMinutes: number | null,
): SectionStats {
  const empty: SectionStats = {
    lastRunSeconds: null,
    trendSeconds: null,
    trendRuns: 0,
    recorded: null,
    recordedOf: null,
    targetMinutes,
    metTarget: 0,
    targetRuns: 0,
    totalRuns: 0,
  };
  if (runs.length === 0) return empty;

  const newest = seconds(runs[0]);
  const oldest = seconds(runs[runs.length - 1]);

  // Newest minus oldest. Getting faster has to come out negative, and the
  // subtraction the other way round reports an improving student as slowing
  // down.
  const trendSeconds =
    runs.length >= 2 && newest !== null && oldest !== null ? newest - oldest : null;

  // Only runs whose slot count is knowable contribute. A run with an unknowable
  // denominator is left out of both halves of the fraction rather than being
  // given a smaller one, which would inflate the percentage.
  let recorded = 0;
  let recordedOf = 0;
  let counted = 0;
  for (const run of runs) {
    const t = ticksFor(run);
    if (!t) continue;
    recorded += t.recorded;
    recordedOf += t.slots;
    counted += 1;
  }

  /*
   * The target cell is labelled with a CLOCK, so it has to count the clock.
   *
   * `within_goal` is stricter than it looks: it means inside the clock AND every
   * stimulus coloured and given a Read. Counting it under "25:00" would mark a
   * run that finished in twenty-two minutes as missing a twenty-five minute
   * target because of something that is not time at all. The clock question is
   * `insideTime`, derived from the two numbers rather than read off the stored
   * flag, so this cell and the Report Card cannot answer it differently.
   *
   * Only runs measured against the SAME target are counted. A run from before an
   * accommodation changed was judged against a different number, and folding it
   * in reports her against a clock she was never given.
   */
  const comparable = runs.filter(
    (r) => targetMinutes !== null && r.section?.goal_minutes === targetMinutes,
  );
  const insideClock = (r: RecentSectionRun) => insideTime(r.section);

  return {
    lastRunSeconds: newest,
    trendSeconds,
    trendRuns: runs.length,
    recorded: counted > 0 ? recorded : null,
    recordedOf: counted > 0 ? recordedOf : null,
    targetMinutes,
    metTarget: comparable.filter(insideClock).length,
    targetRuns: comparable.length,
    totalRuns: runs.length,
  };
}

/** `1502` -> `25:02`. */
export function clock(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "-" : "";
  const s = Math.abs(Math.round(totalSeconds));
  return `${sign}${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The trend, signed for a reader: `-6:52` is six minutes and change faster. */
export function signedClock(totalSeconds: number): string {
  if (totalSeconds === 0) return "0:00";
  const body = clock(Math.abs(totalSeconds));
  return `${totalSeconds < 0 ? "−" : "+"}${body}`;
}

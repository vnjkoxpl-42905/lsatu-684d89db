import { describe, expect, it } from "vitest";
import { clock, signedClock, slotCountFor, statsFor, ticksFor } from "./runStats";
import type { RecentSectionRun } from "../api/activitiesClient";

/**
 * The numbers on the section launch surface.
 *
 * Every one of these is derived from runs she has already done, so the tests
 * that matter are the ones about what happens when the evidence is incomplete:
 * a grader that returned nothing, a run written before positions were stored, a
 * partial grade. In each case the right answer is to say less, not to guess.
 */

function run(over: Partial<RecentSectionRun> = {}): RecentSectionRun {
  return {
    assignment_id: "a1",
    attempt_no: 1,
    source_section: "PT105.S2",
    graded_at: "2026-09-02T10:00:00Z",
    created_at: "2026-09-02T10:00:00Z",
    section: {
      accommodation: "standard",
      goal_minutes: 25,
      total_seconds: 1450,
      within_goal: true,
      mean_coverage: 90,
      stimuli_graded: 3,
      stimuli_in_section: 3,
      reciting_count: 0,
      listing_count: 0,
      uncoloured_count: 0,
      worst_dead_air_seconds: 0,
      dead_air_threshold_seconds: 8,
      decoy_failures: 0,
      clock: {},
    },
    ...over,
  } as RecentSectionRun;
}

function stim(item_order: number, over: Record<string, unknown> = {}) {
  return {
    slug: `s${item_order}`,
    item_order,
    carried: 3,
    total: 3,
    percent: 100,
    band: "at-the-standard",
    missed: [],
    decoysCarried: [],
    unjudged: [],
    reciting: false,
    listing: false,
    coloured: true,
    colourSpecific: true,
    dead_air_seconds: 0,
    spoken: "she said something here",
    ...over,
  } as never;
}

describe("how many stimuli the section holds", () => {
  it("takes the authored count when it is stored", () => {
    expect(slotCountFor(run())).toBe(3);
  });

  it("falls back to the highest authored position, not to the graded count", () => {
    // A partial grade: 25 authored, only 2 rows arrived. `stimuli_graded` would
    // say 2 and turn an interrupted run into a complete one.
    const r = run({
      section: { ...run().section, stimuli_in_section: undefined, stimuli_graded: 2 },
      stimuli: [stim(1), stim(25)],
    });
    expect(slotCountFor(r)).toBe(25);
  });

  it("says it does not know rather than guessing", () => {
    const r = run({
      section: { ...run().section, stimuli_in_section: undefined },
      stimuli: [stim(1, { item_order: undefined })],
    });
    expect(slotCountFor(r)).toBeNull();
  });
});

describe("the tick row", () => {
  it("fills a slot per stimulus, at its authored position", () => {
    const r = run({ stimuli: [stim(1), stim(3)] });
    expect(ticksFor(r)?.ticks).toEqual(["recorded", "missing", "recorded"]);
  });

  it("marks an ungraded stimulus as recorded-but-not-judged, never as a gap", () => {
    // The judge returned nothing. She still did the work, and an empty slot here
    // would report our outage as her having skipped it.
    const r = run({ stimuli: [stim(1), stim(2, { ungraded: "judge timed out" }), stim(3)] });
    const t = ticksFor(r);
    expect(t?.ticks).toEqual(["recorded", "notJudged", "recorded"]);
    expect(t?.recorded).toBe(3);
  });

  it("draws nothing at all when positions are not stored", () => {
    // Placing these by array index would shift every tick after a missing row
    // and draw a picture that disagrees with the authored section.
    const r = run({ stimuli: [stim(1), stim(2, { item_order: undefined })] });
    expect(ticksFor(r)).toBeNull();
  });

  it("draws nothing when the run carries no per-stimulus rows", () => {
    expect(ticksFor(run({ stimuli: undefined }))).toBeNull();
  });

  it("shows a stimulus she said nothing into as silent, not as recalled", () => {
    // The grader writes a full row with `spoken: ""` and no `ungraded` flag for
    // a stimulus she sat through. Counting the row would report her silence as
    // work done.
    const r = run({ stimuli: [stim(1), stim(2, { spoken: "" }), stim(3)] });
    const t = ticksFor(r);
    expect(t?.ticks).toEqual(["recorded", "silent", "recorded"]);
    expect(t?.recorded).toBe(2);
  });

  it("draws nothing for a run written before the words were stored", () => {
    const r = run({ stimuli: [stim(1), stim(2, { spoken: undefined })] });
    expect(ticksFor(r)).toBeNull();
  });
});

describe("the stat strip", () => {
  const faster = [
    run({ section: { ...run().section, total_seconds: 1450, within_time: true } }),
    // Inside the clock and NOT within_goal, which is the case that discriminates:
    // count the goal flag and this run disappears from a cell labelled with a time.
    run({
      section: { ...run().section, total_seconds: 1465, within_time: true, within_goal: false },
    }),
    run({
      section: { ...run().section, total_seconds: 1862, within_time: false, within_goal: false },
    }),
  ];

  it("reads the last run off the newest, through the nested summary", () => {
    expect(statsFor(faster, 25).lastRunSeconds).toBe(1450);
  });

  it("reports getting faster as a negative trend", () => {
    // 1450 - 1862. Subtracting the other way round reports an improving student
    // as slowing down.
    expect(statsFor(faster, 25).trendSeconds).toBe(-412);
  });

  it("reports getting slower as a positive trend", () => {
    const slower = [...faster].reverse();
    expect(statsFor(slower, 25).trendSeconds).toBe(412);
  });

  it("states no trend from a single run", () => {
    expect(statsFor([faster[0]], 25).trendSeconds).toBeNull();
  });

  it("never counts silence towards Recorded", () => {
    const r = run({ stimuli: [stim(1), stim(2, { spoken: "" }), stim(3)] });
    const s = statsFor([r], 25);
    expect(s.recorded).toBe(2);
    expect(s.recordedOf).toBe(3);
  });

  it("counts an ungraded stimulus as recorded", () => {
    const r = run({ stimuli: [stim(1), stim(2, { ungraded: "no verdict" }), stim(3)] });
    const s = statsFor([r], 25);
    expect(s.recorded).toBe(3);
    expect(s.recordedOf).toBe(3);
  });

  it("leaves a run with an unknowable denominator out of both halves", () => {
    const known = run({ stimuli: [stim(1), stim(2), stim(3)] });
    const unknowable = run({
      section: { ...run().section, stimuli_in_section: undefined },
      stimuli: [stim(1, { item_order: undefined })],
    });
    const s = statsFor([known, unknowable], 25);
    expect(s.recorded).toBe(3);
    expect(s.recordedOf).toBe(3);
  });

  it("has no recorded figure at all when no run can be counted", () => {
    const s = statsFor([run({ stimuli: undefined })], 25);
    expect(s.recorded).toBeNull();
    expect(s.recordedOf).toBeNull();
  });

  it("counts the clock, not the method conditions bundled into within_goal", () => {
    // 25:00 is 1500 seconds: 1450 and 1465 are inside it, 1862 is not. The
    // middle run is the one that matters, because its `within_goal` is false
    // and the cell is labelled with a time.
    //
    // This assertion used to read the same and pass for the wrong reason. The
    // middle run was 1665 seconds, which is 27:45 and outside the clock, and
    // the comment beside it claimed 1665 was inside 25:00. The fixture carried
    // `within_time: true` to match the mistaken arithmetic and the code trusted
    // the stored flag, so the error was invisible from both ends.
    const s = statsFor(faster, 25);
    expect(s.metTarget).toBe(2);
    expect(s.targetRuns).toBe(3);
  });

  it("does not let a stored flag outvote the clock it contradicts", () => {
    // 1665 seconds is 27:45. A row claiming otherwise is wrong, and the cell
    // has to say what its own number says: this is the shape of the Report Card
    // reading "28:32" over "Inside the time".
    const contradicted = run({
      section: { ...run().section, total_seconds: 1665, within_time: true },
    });
    expect(statsFor([contradicted], 25).metTarget).toBe(0);
  });

  it("recomputes the clock for a run written before within_time existed", () => {
    const legacy = run({
      section: { ...run().section, total_seconds: 1400, within_time: undefined, within_goal: false },
      stimuli: [stim(1), stim(2), stim(3)],
    });
    expect(statsFor([legacy], 25).metTarget).toBe(1);
  });

  it("leaves out a run measured against a different clock", () => {
    // Her accommodation changed. That run was judged against 35:00 and folding
    // it in would report her against a clock she was never given.
    const otherClock = run({
      section: { ...run().section, goal_minutes: 35, total_seconds: 2000, within_time: true },
      stimuli: [stim(1), stim(2), stim(3)],
    });
    const s = statsFor([faster[0], otherClock], 25);
    expect(s.targetRuns).toBe(1);
    expect(s.totalRuns).toBe(2);
  });

  it("is entirely empty for a student who has never run it", () => {
    const s = statsFor([], 25);
    expect(s.lastRunSeconds).toBeNull();
    expect(s.recorded).toBeNull();
    expect(s.totalRuns).toBe(0);
  });
});

describe("the clock", () => {
  it("pads the seconds", () => {
    expect(clock(1502)).toBe("25:02");
  });

  it("signs a trend so faster reads as less", () => {
    expect(signedClock(-412)).toBe("−6:52");
    expect(signedClock(412)).toBe("+6:52");
    expect(signedClock(0)).toBe("0:00");
  });
});

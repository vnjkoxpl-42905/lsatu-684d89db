import { describe, expect, it } from "vitest";
import { nextStep } from "./nextStep";
import type { SectionGradeSummary, SectionStimulusGrade } from "../api/types";

/**
 * The one sentence, and every case where there must not be one.
 *
 * The audit's question was whether she would know what to do tomorrow. The
 * risk in answering it is a card that always says something, which is a card
 * whose advice she learns to skip, so most of what is asserted here is silence.
 */

const summary = (over: Partial<SectionGradeSummary> = {}): SectionGradeSummary => ({
  accommodation: "standard",
  goal_minutes: 25,
  total_seconds: 1500,
  within_goal: true,
  mean_coverage: 90,
  stimuli_graded: 9,
  reciting_count: 0,
  listing_count: 0,
  uncoloured_count: 0,
  worst_dead_air_seconds: 0,
  dead_air_threshold_seconds: 10,
  decoy_failures: 0,
  clock: {},
  ...over,
});

const stim = (missed: string[] = []): SectionStimulusGrade => ({
  slug: "PT134_S3_Q1",
  carried: 10,
  total: 10 + missed.length,
  percent: 90,
  band: "at-the-standard",
  missed,
  decoysCarried: [],
  unjudged: [],
  reciting: false,
  listing: false,
  coloured: true,
  colourSpecific: true,
  dead_air_seconds: 0,
});

const run = (n: number, missed: string[][] = []) =>
  Array.from({ length: n }, (_, i) => stim(missed[i] ?? []));

describe("what to do next", () => {
  it("says nothing at all about a run with nothing clear to say", () => {
    // The failure mode this is written against is a generic encouragement.
    expect(nextStep(summary(), run(9))).toBeNull();
  });

  it("says nothing about a grade with no stimuli in it", () => {
    expect(nextStep(summary({ stimuli_graded: 0 }), [])).toBeNull();
  });

  it("names the missing Read before anything else, because it is the criterion", () => {
    const out = nextStep(summary({ no_read_count: 4, reciting_count: 4, uncoloured_count: 9 }), run(9));
    expect(out).toMatch(/no Read at all on 4/);
  });

  it("leaves one bad stimulus to its own row rather than hoisting it", () => {
    // One stimulus in nine is not the thing to work on tomorrow, and the row
    // for that stimulus already says it.
    expect(nextStep(summary({ no_read_count: 1, reciting_count: 1, uncoloured_count: 2 }), run(9))).toBeNull();
  });

  it("names reciting ahead of listing and colour, being furthest from the drill", () => {
    const out = nextStep(summary({ reciting_count: 3, listing_count: 5, uncoloured_count: 5 }), run(9));
    expect(out).toMatch(/word for word/);
  });

  it("names the colour when that is the only thing that fired", () => {
    expect(nextStep(summary({ uncoloured_count: 5 }), run(9))).toMatch(/reaction of your own/);
  });

  it("names the kind of detail she drops, once there is enough of it to be a pattern", () => {
    const misses = [
      ["All four of the nurses agreed."],
      ["Only some of them agreed."],
      ["Most of the sample was female."],
      ["The study ran in Sweden."],
    ];
    const out = nextStep(summary(), run(9, misses));
    expect(out).toMatch(/Numbers and quantifiers/);
    expect(out).toMatch(/3 of the 4/);
  });

  it("never names plain facts, which would otherwise be on every card ever printed", () => {
    // The residual bucket outnumbers everything else about eight to one, so a
    // count that includes it always crowns it and says nothing she can act on.
    const misses = [["The garden was replanted."], ["The council agreed."], ["The wall was rebuilt."]];
    expect(nextStep(summary(), run(9, misses))).toBeNull();
  });

  it("does not call two misses a pattern", () => {
    const misses = [["All four agreed."], ["Only some agreed."]];
    expect(nextStep(summary(), run(9, misses))).toBeNull();
  });

  it("gives one sentence, never two", () => {
    const out = nextStep(
      summary({ no_read_count: 9, reciting_count: 9, listing_count: 9, uncoloured_count: 9 }),
      run(9, [["All four agreed."], ["Only some agreed."], ["Most agreed."]]),
    );
    expect(out).not.toBeNull();
    // Sentences within the advice are fine; two pieces of advice are not.
    expect(out).not.toMatch(/word for word/);
    expect(out).not.toMatch(/reaction of your own/);
  });
});

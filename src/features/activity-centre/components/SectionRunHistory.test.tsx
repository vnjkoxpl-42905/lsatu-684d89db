import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionRunHistory } from "./SectionRunHistory";
import type { SectionGradeStub, SectionStimulusGrade } from "../api/types";

/**
 * The pile of runs, which nothing has ever read.
 *
 * A Report Card is one sitting. The drill's own instruction is three a day, so
 * by night four the interesting question has changed from "how did that go" to
 * "is this working, and what do I keep dropping", and both answers were already
 * in the database.
 */

const run = (over: Partial<SectionGradeStub> & { stimuli?: SectionStimulusGrade[] } = {}) =>
  ({
    assignment_id: "a1",
    attempt_no: 1,
    source_section: "PT105.S2",
    graded_at: "2026-09-02T10:00:00Z",
    section: {
      accommodation: "standard",
      goal_minutes: 25,
      total_seconds: 1380,
      within_goal: true,
      mean_coverage: 91,
      stimuli_graded: 23,
      reciting_count: 0,
      listing_count: 0,
      uncoloured_count: 0,
      read_matched_count: 20,
      worst_dead_air_seconds: 0,
      dead_air_threshold_seconds: 4,
      decoy_failures: 0,
      clock: {},
    },
    ...over,
  }) as SectionGradeStub;

describe("the shape of the week", () => {
  it("says nothing rather than an empty table when she has run none", () => {
    render(<SectionRunHistory grades={[]} emptyMessage="No sections run yet." />);
    expect(screen.getByText("No sections run yet.")).toBeInTheDocument();
  });

  it("lists every run, newest first", () => {
    render(
      <SectionRunHistory
        grades={[
          run({ assignment_id: "old", graded_at: "2026-08-30T10:00:00Z", section: { ...run().section, mean_coverage: 71 } }),
          run({ assignment_id: "new", graded_at: "2026-09-02T10:00:00Z" }),
        ]}
      />,
    );
    // The cell carries the band as a word beside the number now, because the
    // colour was the only thing saying which band a run was in.
    const cells = [...document.querySelectorAll("tbody tr")].map(
      (tr) => tr.children[2]?.textContent ?? "",
    );
    expect(cells.map((t) => t.split(",")[0])).toEqual(["91%", "71%"]);
    expect(cells[0]).toMatch(/at the standard/);
  });

  it("marks a run graded before The Read was measured as not asked, never as zero", () => {
    // A 0 would tell her she understood none of it. Nobody asked.
    render(<SectionRunHistory grades={[run({ section: { ...run().section, read_matched_count: undefined } })]} />);
    expect(screen.getByText("not asked")).toBeInTheDocument();
  });

  it("names the Attempt when a section has been run more than once", () => {
    render(<SectionRunHistory grades={[run({ attempt_no: 3 })]} />);
    expect(screen.getByText(/· 3/)).toBeInTheDocument();
  });

  it("says nothing about what keeps slipping until there are misses to read", () => {
    // The light read covers every run and carries no per-stimulus misses. The
    // table still works; the tally simply is not drawn.
    render(<SectionRunHistory grades={[run()]} />);
    expect(screen.queryByText("What keeps slipping")).not.toBeInTheDocument();
  });

  it("contains no em-dash anywhere on screen", () => {
    render(<SectionRunHistory grades={[run(), run({ attempt_no: 2 })]} />);
    expect(document.body.textContent ?? "").not.toMatch(/[—–]/);
  });
});

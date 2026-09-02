import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SectionReportCard } from "./SectionReportCard";
import type { SectionGrade, SectionStimulusGrade } from "../api/types";

// The Report Card is the only thing a student ever sees of the grader, so the
// rules asserted here are the ones that would embarrass us quietly: an internal
// identifier on screen, a raw score presented as a verdict, or an em-dash in
// copy Joshua would never type.

function stimulus(over: Partial<SectionStimulusGrade> = {}): SectionStimulusGrade {
  return {
    slug: "PT105_S2_Q1",
    carried: 18,
    total: 21,
    percent: 86,
    band: "at-the-standard",
    missed: ["This applies to all employees."],
    decoysCarried: [],
    unjudged: [],
    reciting: false,
    listing: false,
    coloured: true,
    colourSpecific: true,
    dead_air_seconds: 0,
    ...over,
  };
}

const grade: SectionGrade = {
  assignment_id: "a1",
  student_id: "s1",
  source_section: "PT105.S2",
  transcript_engine: "deepgram/nova-3",
  transcript_text: "…",
  grader_version: 1,
  graded_at: "2026-09-02T00:00:00Z",
  stimuli: [
    stimulus(),
    stimulus({ slug: "PT105_S2_Q2", percent: 100, carried: 12, total: 12, missed: [] }),
    stimulus({ slug: "PT105_S2_Q3", percent: 64, carried: 7, total: 11, band: "thin", reciting: true }),
  ],
  section: {
    accommodation: "standard",
    goal_minutes: 25,
    total_seconds: 1380,
    within_goal: true,
    mean_coverage: 83,
    stimuli_graded: 3,
    reciting_count: 1,
    listing_count: 0,
    uncoloured_count: 0,
    worst_dead_air_seconds: 1.2,
    dead_air_threshold_seconds: 4,
    decoy_failures: 1,
    clock: {},
  },
};

describe("what the student sees", () => {
  it("leads with a band, not a raw verdict", () => {
    render(<SectionReportCard grade={grade} />);
    expect(screen.getAllByText("At the standard").length).toBe(2);
    expect(screen.getByText("Thin")).toBeInTheDocument();
  });

  it("says how she did against her own time goal", () => {
    render(<SectionReportCard grade={grade} />);
    expect(screen.getByText("23:00 against a 25 minute goal")).toBeInTheDocument();
  });

  it("names the stimuli by position, never by the capture's identifier", () => {
    render(<SectionReportCard grade={grade} />);
    expect(screen.getByText("Stimulus 1")).toBeInTheDocument();
    // The slug is the source bank's own id and means nothing to her.
    expect(document.body.textContent).not.toMatch(/PT105_S2_Q/);
  });

  it("shows what slipped, and says so plainly when nothing did", () => {
    render(<SectionReportCard grade={grade} />);
    fireEvent.click(screen.getByText("Stimulus 1"));
    expect(screen.getByText("This applies to all employees.")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Stimulus 2"));
    expect(screen.getByText("You carried every detail in this one.")).toBeInTheDocument();
  });

  it("tells her when she recited rather than retold", () => {
    render(<SectionReportCard grade={grade} />);
    fireEvent.click(screen.getByText("Stimulus 3"));
    // Scoped to the tip, not the summary line, which also mentions it.
    expect(
      screen.getByText(/Say it in your own words instead/),
    ).toBeInTheDocument();
  });

  it("never shows the grader's own machinery", () => {
    render(<SectionReportCard grade={grade} />);
    for (const s of grade.stimuli) fireEvent.click(screen.getByText(`Stimulus ${grade.stimuli.indexOf(s) + 1}`));
    const text = document.body.textContent ?? "";
    // Decoys, grader versions and engine names are ours. A student reading
    // "decoy" would reasonably wonder what else we are not telling her.
    for (const leak of ["decoy", "grader", "nova-3", "deepgram", "unjudged", "colourSpecific"]) {
      expect(text.toLowerCase()).not.toContain(leak);
    }
  });

  it("contains no em-dash anywhere on screen", () => {
    render(<SectionReportCard grade={grade} />);
    // Joshua never types one, and a stray em-dash reads as machine-written.
    expect(document.body.textContent ?? "").not.toMatch(/[—–]/);
  });
});

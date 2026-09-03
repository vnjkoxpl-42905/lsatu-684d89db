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
  attempt_no: 1,
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

/**
 * What the grader measured and the card used to throw away.
 *
 * Every field asserted below was computed on the trial run, stored in
 * `activity_section_grades`, and rendered nowhere. A number a student cannot
 * interrogate is a number she has to take on faith, and two of these are not
 * even about her: a stimulus the judge never answered for is counted as
 * missed, which scores her for our outage, and she was the only person in a
 * position to notice the total looked wrong.
 */
describe("the evidence behind the number", () => {
  const withSection = (over: Partial<SectionGrade["section"]>, stimuliOver?: SectionStimulusGrade[]) =>
    ({ ...grade, section: { ...grade.section, ...over }, stimuli: stimuliOver ?? grade.stimuli }) as SectionGrade;

  it("leads with the run's own band, not the percentage", () => {
    render(<SectionReportCard grade={withSection({ mean_coverage: 91 })} />);
    // 91 is at the standard. The card used to print "91%" in 48px type with no
    // band at all, which is the exact thing its own docstring forbade.
    const hero = document.querySelector(".ac-display");
    expect(hero?.textContent).toBe("At the standard");
    expect(hero?.textContent).not.toMatch(/%/);
  });

  it("still says what she actually got, underneath", () => {
    render(<SectionReportCard grade={withSection({ mean_coverage: 91 })} />);
    expect(screen.getByText(/91% of the details carried/)).toBeInTheDocument();
  });

  it("shows The Read beside Coverage", () => {
    render(
      <SectionReportCard
        grade={withSection({ read_given_count: 3, read_matched_count: 2, no_read_count: 0 })}
      />,
    );
    expect(screen.getByText("Understood")).toBeInTheDocument();
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });

  it("says the goal was missed on its condition, not on the clock", () => {
    // The spec's own rule: the goal counts only with every stimulus recalled,
    // coloured and given a Read. Finishing early with four skipped was being
    // reported as making the goal.
    render(<SectionReportCard grade={withSection({ within_time: true, within_goal: false })} />);
    expect(screen.getByText(/Inside the time, but the goal only counts/)).toBeInTheDocument();
  });

  it("says plainly when we could not mark part of the run", () => {
    render(<SectionReportCard grade={withSection({ ungraded_count: 2 })} />);
    expect(screen.getByText(/2 stimuli could not be marked/)).toBeInTheDocument();
    expect(screen.getByText(/ours, not yours/)).toBeInTheDocument();
  });

  it("warns when its own check on the marking came back unhappy", () => {
    render(<SectionReportCard grade={withSection({ decoy_failures: 1 })} />);
    expect(screen.getByText(/treat the number on one or two of these lightly/)).toBeInTheDocument();
  });

  it("shows a reaction that would have fitted any stimulus", () => {
    // Measured on 18 of 22 in the trial and shown on none. It is the one
    // standard the whole method turns on.
    render(
      <SectionReportCard
        grade={withSection({}, [stimulus({ coloured: true, colourSpecific: false })])}
      />,
    );
    fireEvent.click(screen.getByText("Stimulus 1"));
    expect(screen.getByText(/would have fitted any stimulus/)).toBeInTheDocument();
  });

  it("shows where she froze inside a recall", () => {
    render(<SectionReportCard grade={withSection({}, [stimulus({ dead_air_seconds: 7 })])} />);
    fireEvent.click(screen.getByText("Stimulus 1"));
    expect(screen.getByText(/quiet for 7s/)).toBeInTheDocument();
  });

  it("shows what the machine heard", () => {
    render(
      <SectionReportCard
        grade={withSection({}, [stimulus({ spoken: "so the director thinks exploiting is bad" })])}
      />,
    );
    fireEvent.click(screen.getByText("Stimulus 1"));
    expect(screen.getByText("What you said")).toBeInTheDocument();
    expect(screen.getByText(/so the director thinks exploiting is bad/)).toBeInTheDocument();
  });

  it("offers a Clip when the recording is reachable, and none when it is not", () => {
    const one = [stimulus({ spoken: "x", recall_window_ms: { start: 1000, end: 4000 } })];
    const { unmount } = render(
      <SectionReportCard
        grade={withSection({ audio_bucket: "drill-recordings", audio_path: "s1/a1.webm" }, one)}
      />,
    );
    fireEvent.click(screen.getByText("Stimulus 1"));
    expect(screen.getByRole("button", { name: /hear it back/i })).toBeInTheDocument();
    unmount();

    render(<SectionReportCard grade={withSection({ audio_path: null }, one)} />);
    fireEvent.click(screen.getByText("Stimulus 1"));
    expect(screen.queryByRole("button", { name: /hear it back/i })).not.toBeInTheDocument();
  });

  it("names the Attempt only when there has been more than one", () => {
    const { unmount } = render(<SectionReportCard grade={grade} />);
    expect(document.body.textContent).not.toMatch(/Attempt/);
    unmount();
    render(<SectionReportCard grade={{ ...grade, attempt_no: 2 }} />);
    expect(screen.getByText(/Attempt 2/)).toBeInTheDocument();
  });

  it("does not show a stimulus it could not mark as a score she earned", () => {
    render(<SectionReportCard grade={withSection({}, [stimulus({ ungraded: "judge timed out", carried: 0, percent: 0, band: "lost-it" })])} />);
    fireEvent.click(screen.getByText("Stimulus 1"));
    expect(screen.getByText(/could not be marked/)).toBeInTheDocument();
    // And not the reason, which is ours.
    expect(document.body.textContent).not.toMatch(/timed out/);
  });
});

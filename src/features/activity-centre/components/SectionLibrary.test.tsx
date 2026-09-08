import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ActivityAssignmentSummary } from "../api/types";
import { SectionLibrary } from "./SectionLibrary";

// The list she picks a section from. Three rules the drill puts on it, each of
// which fails quietly rather than loudly if it breaks.

const choices = [
  { id: "a1", title: "…PT102 Section 3", source_section: "PT102.S3", stimulus_count: 22, goal_minutes: { standard: 25 } },
  { id: "a2", title: "…PT105 Section 2", source_section: "PT105.S2", stimulus_count: 23, goal_minutes: { standard: 25 } },
];

const attempt = (over: Partial<ActivityAssignmentSummary>): ActivityAssignmentSummary =>
  ({
    id: "x", student_id: "s", title: "t", status: "completed", item_count: 23,
    created_at: "2026-09-01T10:00:00Z", completed_at: "2026-09-01T10:30:00Z",
    mode: "section", source_section: "PT105.S2", instructions: {},
    ...over,
  }) as ActivityAssignmentSummary;

const load = () => Promise.resolve(choices);
/** No Report Cards unless a test says otherwise; the list works without them. */
const noGrades = () => Promise.resolve([]);

describe("choosing a section", () => {
  it("lists every section and never hides one she has done", async () => {
    // The regular picker drops a section she has sat. Right at 200 sections,
    // wrong at three: she would run out in three nights.
    render(<SectionLibrary attempts={[attempt({})]} onStart={vi.fn()} loadChoices={load} loadGrades={noGrades} />);
    await screen.findByText("PT102.S3");
    expect(screen.getByText("PT105.S2")).toBeInTheDocument();
  });

  it("shows the clock and not the stimulus count", async () => {
    // A stimulus is our grain, not hers, and the counts differ per section for
    // a reason she cannot see: two questions can share a stimulus.
    render(<SectionLibrary attempts={[]} onStart={vi.fn()} loadChoices={load} loadGrades={noGrades} />);
    await screen.findByText("PT102.S3");
    expect(screen.getAllByText("25 min").length).toBe(2);
    expect(screen.queryByText(/22 stimuli/)).not.toBeInTheDocument();
    expect(screen.queryByText(/stimuli/)).not.toBeInTheDocument();
  });

  it("lists every Attempt separately, not a count", async () => {
    render(
      <SectionLibrary
        attempts={[
          attempt({ id: "r1", created_at: "2026-09-01T10:00:00Z" }),
          attempt({ id: "r2", created_at: "2026-08-30T10:00:00Z" }),
        ]}
        onStart={vi.fn()}
        loadChoices={load}
        loadGrades={noGrades}
      />,
    );
    await screen.findByText("PT105.S2");
    expect(screen.getByText(/Attempt 2/)).toBeInTheDocument();
    expect(screen.getByText(/Attempt 1/)).toBeInTheDocument();
  });

  it("starts a run through the server, never by inserting one", async () => {
    // The row carries the Details her Coverage is scored against, so it is
    // built under definer rights. She names the section and nothing else.
    const begin = vi.fn(() => Promise.resolve("new-assignment"));
    const onStart = vi.fn();
    render(
      <SectionLibrary attempts={[]} onStart={onStart} loadChoices={load} beginAttempt={begin} />,
    );
    await screen.findByText("PT102.S3");
    fireEvent.click(screen.getAllByRole("button", { name: "Start" })[0]);
    await vi.waitFor(() => expect(begin).toHaveBeenCalledWith("a1"));
    await vi.waitFor(() => expect(onStart).toHaveBeenCalledWith("new-assignment"));
  });

  it("says so when a section will not start, rather than hanging", async () => {
    const begin = vi.fn(() => Promise.reject(new Error("nope")));
    render(<SectionLibrary attempts={[]} onStart={vi.fn()} loadChoices={load} beginAttempt={begin} />);
    await screen.findByText("PT102.S3");
    fireEvent.click(screen.getAllByRole("button", { name: "Start" })[0]);
    expect(await screen.findByText(/Could not start that section/)).toBeInTheDocument();
  });
});

/**
 * A past Attempt is a way back to its Report Card.
 *
 * Grading finishes minutes after she stops, so the Report Card is something she
 * comes BACK to -- and coming back was the one path that did not lead to it.
 * This list rendered the same runs as flat grey text, which meant a grade she
 * could not possibly have seen when it was produced was unreachable for ever
 * afterwards.
 */
describe("getting back to a Report Card", () => {
  const graded = () =>
    Promise.resolve([
      {
        assignment_id: "r1",
        attempt_no: 1,
        source_section: "PT105.S2",
        graded_at: "2026-09-01T10:40:00Z",
        section: { mean_coverage: 91 },
      },
    ] as never);

  /*
   * Reported by a student, not found by a test.
   *
   * Celia finished her first section, saw "87% carried" on this row, and asked
   * where the graded responses were. The button already went to her Report
   * Card. It just read as a caption with a number on it, so she never pressed
   * it. A row that is the only way back to the card has to say so.
   */
  it("says what the row opens, so a percentage is not the end of the road", async () => {
    render(
      <SectionLibrary
        attempts={[attempt({ id: "r1" })]}
        onStart={vi.fn()}
        onOpenAttempt={vi.fn()}
        loadChoices={load}
        loadGrades={graded}
        beginAttempt={vi.fn()}
      />,
    );
    expect(await screen.findByText("See what you missed")).toBeInTheDocument();
  });

  it("opens that Attempt's own assignment", async () => {
    const onOpenAttempt = vi.fn();
    render(
      <SectionLibrary
        attempts={[attempt({ id: "r1" })]}
        onStart={vi.fn()}
        onOpenAttempt={onOpenAttempt}
        loadChoices={load}
        loadGrades={graded}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: /Attempt 1/ }));
    expect(onOpenAttempt).toHaveBeenCalledWith("r1");
  });

  it("says what she scored, rather than only that it is done", async () => {
    render(
      <SectionLibrary
        attempts={[attempt({ id: "r1" })]}
        onStart={vi.fn()}
        onOpenAttempt={vi.fn()}
        loadChoices={load}
        loadGrades={graded}
      />,
    );
    expect(await screen.findByText(/91% carried/)).toBeInTheDocument();
  });

  it("says a finished run is still being marked rather than showing it as scored", async () => {
    render(
      <SectionLibrary
        attempts={[attempt({ id: "r1" })]}
        onStart={vi.fn()}
        onOpenAttempt={vi.fn()}
        loadChoices={load}
        loadGrades={noGrades}
      />,
    );
    expect(await screen.findByText(/still being marked/)).toBeInTheDocument();
  });

  it("does not offer a way into a run that was never finished", async () => {
    render(
      <SectionLibrary
        attempts={[attempt({ id: "r1", status: "in_progress", completed_at: null })]}
        onStart={vi.fn()}
        onOpenAttempt={vi.fn()}
        loadChoices={load}
        loadGrades={noGrades}
      />,
    );
    expect(await screen.findByText(/not finished/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Attempt 1/ })).not.toBeInTheDocument();
  });
});

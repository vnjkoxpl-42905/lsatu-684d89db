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
  it("shows five sections and holds the rest behind one press", async () => {
    // Twelve sections with a button each were 1,600px of identical rows
    // between the hero and the steps. Five is a choice; twelve is a catalogue.
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: `m${i}`, title: `PT${i} Section 1`, source_section: `PT${i}.S1`,
      stimulus_count: 22, goal_minutes: { standard: 25 },
    }));
    render(<SectionLibrary attempts={[]} onStart={vi.fn()} loadChoices={() => Promise.resolve(many)} loadGrades={noGrades} />);
    await screen.findByText("PT0.S1");
    expect(screen.getByText("PT4.S1")).toBeInTheDocument();
    expect(screen.queryByText("PT5.S1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show 3 more sections" }));
    expect(screen.getByText("PT7.S1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(screen.queryByText("PT7.S1")).not.toBeInTheDocument();
  });

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
    fireEvent.click(screen.getAllByRole("button", { name: "Start section" })[0]);
    await vi.waitFor(() => expect(begin).toHaveBeenCalledWith("a1"));
    await vi.waitFor(() => expect(onStart).toHaveBeenCalledWith("new-assignment"));
  });

  it("says so when a section will not start, rather than hanging", async () => {
    const begin = vi.fn(() => Promise.reject(new Error("nope")));
    render(<SectionLibrary attempts={[]} onStart={vi.fn()} loadChoices={load} beginAttempt={begin} />);
    await screen.findByText("PT102.S3");
    fireEvent.click(screen.getAllByRole("button", { name: "Start section" })[0]);
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

  it("says how long a fresh run has been marking, and tells her to wait", async () => {
    // "Still being marked" is true at four minutes and true at four hours, and
    // she cannot tell those apart from the row.
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    render(
      <SectionLibrary
        attempts={[attempt({ id: "r1", completed_at: fourMinutesAgo })]}
        onStart={vi.fn()}
        onOpenAttempt={vi.fn()}
        loadChoices={load}
        loadGrades={noGrades}
      />,
    );
    expect(await screen.findByText(/marking for 4 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/Check back shortly/)).toBeInTheDocument();
  });

  it("stops telling her to wait once waiting is the wrong advice", async () => {
    const halfAnHourAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    render(
      <SectionLibrary
        attempts={[attempt({ id: "r1", completed_at: halfAnHourAgo })]}
        onStart={vi.fn()}
        onOpenAttempt={vi.fn()}
        loadChoices={load}
        loadGrades={noGrades}
      />,
    );
    // The row opens the marking screen, which now carries a Check again.
    expect(await screen.findByText(/Open it and check again/)).toBeInTheDocument();
    expect(screen.queryByText(/Check back shortly/)).toBeNull();
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

/*
 * Work Joshua assigned, waiting in the library.
 *
 * On 2026-09-08 eight sections were assigned to Yahunathan directly, one row
 * per section, each with its own message and classroom link. The library read
 * every one of those rows as a run: it showed "Attempt 1 - not finished" for
 * sections he had never opened, offered "Run it again", and pressing it called
 * `start_section_attempt`, which DELETES a never-started row for that same
 * section. The row died and the message he had been sent pointed at nothing.
 *
 * A row he has never opened is not an Attempt. It is the assignment itself,
 * and the library opens it rather than replacing it.
 */
describe("a section she was assigned and has not opened", () => {
  const waiting = (over: Partial<ActivityAssignmentSummary> = {}) =>
    attempt({
      id: "assigned-105",
      status: "assigned",
      started_at: null,
      completed_at: null,
      source_section: "PT105.S2",
      ...over,
    });

  it("is not counted as an Attempt", async () => {
    render(
      <SectionLibrary attempts={[waiting()]} onStart={vi.fn()} loadChoices={load} loadGrades={noGrades} />,
    );
    await screen.findByText("PT105.S2");
    expect(screen.queryByText(/Attempt 1/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Not run yet.").length).toBe(2);
  });

  it("offers Start section for an unused assignment", async () => {
    render(
      <SectionLibrary attempts={[waiting()]} onStart={vi.fn()} loadChoices={load} loadGrades={noGrades} />,
    );
    await screen.findByText("PT105.S2");
    expect(screen.queryByRole("button", { name: "Start new attempt" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Start section" }).length).toBe(2);
  });

  it("opens the row he was given instead of creating one that deletes it", async () => {
    const onStart = vi.fn();
    const beginAttempt = vi.fn(() => Promise.resolve("server-made"));
    render(
      <SectionLibrary
        attempts={[waiting()]}
        onStart={onStart}
        loadChoices={load}
        loadGrades={noGrades}
        beginAttempt={beginAttempt}
      />,
    );
    await screen.findByText("PT105.S2");
    fireEvent.click(screen.getAllByRole("button", { name: "Start section" })[1]);
    expect(onStart).toHaveBeenCalledWith("assigned-105");
    expect(beginAttempt).not.toHaveBeenCalled();
  });

  it("still asks the server for a section he was never assigned", async () => {
    const onStart = vi.fn();
    const beginAttempt = vi.fn(() => Promise.resolve("server-made"));
    render(
      <SectionLibrary
        attempts={[waiting()]}
        onStart={onStart}
        loadChoices={load}
        loadGrades={noGrades}
        beginAttempt={beginAttempt}
      />,
    );
    await screen.findByText("PT102.S3");
    fireEvent.click(screen.getAllByRole("button", { name: "Start section" })[0]);
    expect(beginAttempt).toHaveBeenCalledWith("a1");
  });

  it("does not reuse a run he started and walked away from", async () => {
    // A half-run has no valid audio to resume into (ADR 0023). Only a row he
    // has never opened is safe to hand back.
    const onStart = vi.fn();
    const beginAttempt = vi.fn(() => Promise.resolve("server-made"));
    render(
      <SectionLibrary
        attempts={[waiting({ status: "in_progress", started_at: "2026-09-08T18:00:00Z" })]}
        onStart={onStart}
        loadChoices={load}
        loadGrades={noGrades}
        beginAttempt={beginAttempt}
      />,
    );
    await screen.findByText("PT105.S2");
    fireEvent.click(screen.getByRole("button", { name: "Start new attempt" }));
    expect(beginAttempt).toHaveBeenCalledWith("a2");
  });
});

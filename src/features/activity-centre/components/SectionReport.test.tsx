import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { SectionGrade } from "../api/types";
import { SectionReport } from "./SectionReport";

/*
 * The screen navigates now.
 *
 * A Report Card can start a fresh Attempt built from this run's weakest
 * stimuli, and that lands the student in the runner, so `SectionReport` calls
 * `useNavigate` and cannot be rendered outside a Router.
 */
const inRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

const getSectionGrade = vi.fn();
const requestSectionGrading = vi.fn((_id: string) => Promise.resolve());
vi.mock("../api/activitiesClient", () => ({
  getSectionGrade: (id: string) => getSectionGrade(id),
  requestSectionGrading: (id: string) => requestSectionGrading(id),
  // Reached by the card this screen hands over to. A section nobody has been
  // graded on has none of these, which is also what the database returns.
  listModelRuns: () => Promise.resolve({}),
  signSectionRecording: () => Promise.resolve(null),
}));

// The wait between finishing and seeing the Report Card. Everything here is
// about a failure the student would otherwise experience as "the app ate my
// twenty minutes": a lost grading request, or a slow one shown as an error.

const grade: SectionGrade = {
  assignment_id: "a1",
  attempt_no: 1,
  student_id: "s1",
  source_section: "PT105.S2",
  transcript_engine: "deepgram/nova-3",
  transcript_text: null,
  grader_version: 1,
  graded_at: "2026-09-02T00:00:00Z",
  stimuli: [
    {
      slug: "PT105_S2_Q1",
      carried: 20,
      total: 21,
      percent: 95,
      band: "at-the-standard",
      missed: [],
      decoysCarried: [],
      unjudged: [],
      reciting: false,
      listing: false,
      coloured: true,
      colourSpecific: true,
      dead_air_seconds: 0,
    },
  ],
  section: {
    accommodation: "standard",
    goal_minutes: 25,
    total_seconds: 1200,
    within_goal: true,
    mean_coverage: 95,
    stimuli_graded: 1,
    reciting_count: 0,
    listing_count: 0,
    uncoloured_count: 0,
    worst_dead_air_seconds: 0,
    dead_air_threshold_seconds: 4,
    decoy_failures: 0,
    clock: {},
  },
};

beforeEach(() => {
  vi.useFakeTimers();
  getSectionGrade.mockReset();
  requestSectionGrading.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe("waiting for the Report Card", () => {
  it("says the run is being marked, not that anything failed", async () => {
    getSectionGrade.mockResolvedValue(null);
    inRouter(<SectionReport assignmentId="a1" />);
    await vi.waitFor(() => expect(screen.getByText("Marking your run")).toBeInTheDocument());
  });

  it("waits on the card's own ground, not the Activity Centre's", async () => {
    /*
     * The ten seconds after twenty-five unbroken minutes used to cross three
     * grounds: the runner's indigo, a warm cream Activity Centre panel, then
     * the violet card. The wait is the card's first page, so it is drawn in
     * `.rc` and the card replacing it is a change of content, not of place.
     */
    getSectionGrade.mockResolvedValue(null);
    const { container } = inRouter(<SectionReport assignmentId="a1" />);
    await vi.waitFor(() => expect(screen.getByText("Marking your run")).toBeInTheDocument());

    const panel = container.querySelector(".rc");
    expect(panel).not.toBeNull();
    expect(panel).toContainElement(screen.getByText("Marking your run"));
    // The Centre's surface token is what it used to paint itself with.
    expect(container.innerHTML).not.toContain("--ac-surface");
  });

  it("shows the card as soon as the grade lands", async () => {
    getSectionGrade.mockResolvedValue(grade);
    inRouter(<SectionReport assignmentId="a1" />);
    await vi.waitFor(() => expect(screen.getByText("Report Card")).toBeInTheDocument());
  });

  it("keeps waiting when the read itself fails", async () => {
    // A failed read is not a failed run, and must not be shown as one.
    getSectionGrade.mockRejectedValue(new Error("offline"));
    inRouter(<SectionReport assignmentId="a1" />);
    await vi.waitFor(() => expect(screen.getByText("Marking your run")).toBeInTheDocument());
  });

  it("asks for the grade again if none has arrived, and only once", async () => {
    getSectionGrade.mockResolvedValue(null);
    inRouter(<SectionReport assignmentId="a1" />);
    await vi.waitFor(() => expect(getSectionGrade).toHaveBeenCalled());

    // Losing the runner's fire-and-forget ask is the likeliest way a finished
    // run ends up with no Report Card. This screen repairs that itself.
    expect(requestSectionGrading).not.toHaveBeenCalled();
    // Not before the first ask could have finished. At 20 seconds the repeat
    // arrived while the first grading was still running, and both ran: two
    // transcriptions, two sets of verdicts, and a card that disagreed with the
    // database. A real grading takes one to three minutes.
    await vi.advanceTimersByTimeAsync(60000);
    expect(requestSectionGrading).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(70000);
    expect(requestSectionGrading).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(40000);
    expect(requestSectionGrading).toHaveBeenCalledTimes(1);
  });

  it("eventually says it is still being marked rather than spinning for ever", async () => {
    getSectionGrade.mockResolvedValue(null);
    inRouter(<SectionReport assignmentId="a1" />);
    await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
    await vi.waitFor(() => expect(screen.getByText("Still being marked")).toBeInTheDocument());
    // What she needs to know is that leaving does not cost her the run, and
    // where the card turns up. "Your run is saved and your Report Card will be
    // here when you come back to it" promised a screen she had no way back to.
    expect(screen.getByText(/marking carries on whether or not you stay/i)).toBeInTheDocument();
    expect(screen.getByText(/Activity Centre when it lands/i)).toBeInTheDocument();
  });

  it("says how long it has been, so a long wait is a fact rather than a feeling", async () => {
    getSectionGrade.mockResolvedValue(null);
    inRouter(<SectionReport assignmentId="a1" />);
    // Before the give-up she is told what normal looks like.
    expect(screen.getByText(/usually takes one to three minutes/i)).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
    await vi.waitFor(() => expect(screen.getByText("Still being marked")).toBeInTheDocument());
    expect(screen.getByText(/been marking for 4 minutes/i)).toBeInTheDocument();
  });

  it("announces the change, which is otherwise silent to a screen reader", async () => {
    getSectionGrade.mockResolvedValue(null);
    const { container } = inRouter(<SectionReport assignmentId="a1" />);
    const live = container.querySelector('[role="status"]');
    expect(live).not.toBeNull();
    expect(live?.textContent).toMatch(/Marking your run/);
    await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
    await vi.waitFor(() => expect(live?.textContent).toMatch(/Still being marked/));
  });

  it("gives her a way to ask again instead of ending the screen", async () => {
    getSectionGrade.mockResolvedValue(null);
    inRouter(<SectionReport assignmentId="a1" />);
    await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
    await vi.waitFor(() => expect(screen.getByText("Still being marked")).toBeInTheDocument());

    const callsAtGiveUp = getSectionGrade.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));

    // Polling restarts, and the give-up window with it: one more tick is enough
    // to prove the screen is asking again rather than sitting on its verdict.
    // Wrapped, because the elapsed-time interval also lands inside this window.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
    });
    expect(getSectionGrade.mock.calls.length).toBeGreaterThan(callsAtGiveUp);
    expect(screen.getByText("Marking your run")).toBeInTheDocument();
  });

  it("hands her the one thing she could not produce herself", async () => {
    getSectionGrade.mockResolvedValue(null);
    inRouter(<SectionReport assignmentId="a1" />);
    // Before the give-up this is noise: the ordinary wait is one to three
    // minutes and nobody needs a run id for that.
    expect(screen.queryByText(/quote this run/i)).toBeNull();
    await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
    await vi.waitFor(() => expect(screen.getByText(/quote this run/i)).toBeInTheDocument());
    expect(screen.getByText("a1")).toBeInTheDocument();
    // Not a "Tell Joshua" button: gating one on has_chat_access means mounting
    // a hook that redirects on a lost session into the screen that must not
    // navigate away. See the comment in SectionReport.
    expect(screen.queryByRole("button", { name: /tell joshua/i })).toBeNull();
  });

  it("names where its other button goes", async () => {
    getSectionGrade.mockResolvedValue(null);
    const onDone = vi.fn();
    inRouter(<SectionReport assignmentId="a1" onDone={onDone} />);
    // "Done" read as dismissing a Report Card she had not been shown.
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back to the Activity Centre" }));
    expect(onDone).toHaveBeenCalled();
  });
});

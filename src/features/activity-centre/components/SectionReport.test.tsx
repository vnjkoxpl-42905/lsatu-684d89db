import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("eventually tells her the run is saved rather than spinning for ever", async () => {
    getSectionGrade.mockResolvedValue(null);
    inRouter(<SectionReport assignmentId="a1" />);
    await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
    await vi.waitFor(() => expect(screen.getByText("Still being marked")).toBeInTheDocument());
    expect(screen.getByText(/Your run is saved/)).toBeInTheDocument();
  });
});

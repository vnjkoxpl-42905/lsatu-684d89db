vi.mock('@/hooks/useStudentWorkState', () => ({ useLoadedStudentWorkAcknowledgment: vi.fn(), useLoadedPracticeTestAcknowledgment: vi.fn() }));
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityRunner } from "./ActivityRunner";
import type { ActivityItemResponse, ActivityStatus } from "../api/types";
import { keepSectionCompletion } from "../recall/sectionCompletion";
const storedRecording = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [{ id: "audio-1", name: "saved.webm" }], error: null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ list: storedRecording }) } } }));

/**
 * Where a finished Read, Recall, Colour section lands when it is opened again.
 *
 * It has to land on its Report Card, and these pin that, because the Report
 * Card is the only screen that can ever show the grade and it is not ready when
 * she stops. Grading is a post-section job: she finishes, the runner asks for a
 * grade, and the answer arrives minutes later. Coming back is therefore the
 * NORMAL way to read one -- and coming back was the one path that did not lead
 * there. A finished section fell through to the generic per-item completion
 * summary, which for a section has no verdicts to summarise and renders empty,
 * and the Report Card became unreachable for the rest of the run's life.
 *
 * Nothing about it was visible from the outside: the grade existed, the screen
 * existed, and the run looked finished and fine.
 */

const navigate = vi.fn();
const exitPath = vi.hoisted(() => vi.fn().mockResolvedValue('/reading-center/rrc'));
vi.mock('@/features/reading-center/lib/rrcNavigation', () => ({ rrcExitPath: exitPath }));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

const activityState = { assignment: null as unknown, loading: false, error: null as string | null };
vi.mock("../hooks/useStudentActivities", () => ({ useStudentActivity: () => activityState }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/classroomItems", () => ({
  syncClassroomItemStatusBySource: vi.fn().mockResolvedValue(undefined),
}));

const completeAssignment = vi.fn().mockResolvedValue(undefined);
const completeSectionRun = vi.fn().mockResolvedValue(undefined);
const listItemResponses = vi.fn().mockResolvedValue([]);
const getSectionGrade = vi.fn().mockResolvedValue(null);
const getAccommodation = vi.fn().mockResolvedValue("standard");
const requestSectionGrading = vi.fn().mockResolvedValue(undefined);
const readMyRecentSectionGrades = vi.fn().mockResolvedValue({ runs: [], failed: false });

vi.mock("../api/activitiesClient", () => ({
  assignmentBelongsToAnotherAccount: vi.fn().mockResolvedValue(false),
  completeAssignment: (...a: unknown[]) => completeAssignment(...a),
  completeSectionRun: (...a: unknown[]) => completeSectionRun(...a),
  listItemResponses: (...a: unknown[]) => listItemResponses(...a),
  markAssignmentStarted: vi.fn().mockResolvedValue(undefined),
  recordItemResponse: vi.fn().mockResolvedValue(undefined),
  getSectionGrade: (...a: unknown[]) => getSectionGrade(...a),
  getAccommodation: (...a: unknown[]) => getAccommodation(...a),
  requestSectionGrading: (...a: unknown[]) => requestSectionGrading(...a),
  // The section's front door reads her recent runs. This file is about what the
  // runner hands the section runner, so the read is stubbed to "no history".
  readMyRecentSectionGrades: (...a: unknown[]) => readMyRecentSectionGrades(...a),
}));

/*
 * Stubbed because mounting the real one is the failure this guards against.
 * `SectionRunner` opens the microphone and starts a clocked, recording run the
 * moment it mounts, so a regression that sends a finished section back to it
 * must fail as an assertion rather than as a media error.
 */
/** Captures what the runner is handed, which is the whole point below. */
const sectionRunnerProps = vi.fn();
vi.mock("../recall/SectionRunner", () => ({
  SectionRunner: (props: Record<string, unknown>) => {
    sectionRunnerProps(props);
    return <div data-testid="section-runner-mounted" />;
  },
}));
vi.mock("../recall/recoverRecordings", () => ({
  recoverPendingRecordings: vi.fn().mockResolvedValue(0),
  recoverPendingRows: vi.fn().mockResolvedValue(0),
}));

const STIMULI = 3;

function makeSectionAssignment(status: ActivityStatus) {
  return {
    id: "assign-1",
    activity_id: "act-1",
    student_id: "user-1",
    assigned_by: "user-1",
    class_id: "user-1",
    title: "Read, Recall, Colour",
    subtitle: "PT102.S3",
    item_format: "spoken-recall" as const,
    mode: "section",
    source_section: "PT102.S3",
    time_goal_minutes: { standard: 25, accommodation_53: 38, accommodation_70: 50 },
    instructions: { task: "Tell it back in your own words.", rules: ["Out loud."] },
    items: Array.from({ length: STIMULI }, (_, i) => ({
      order: i + 1,
      slug: `PT102_S3_Q${i + 1}`,
      prompt: "",
      credited_answers: [],
      explanation: "",
      chunks: [{ text: "A sentence.", details: [{ text: "It is a claim." }] }],
    })),
    status,
    score: null,
    started_at: new Date().toISOString(),
    completed_at: status === "completed" ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
  };
}

/** One row per stimulus, with no verdict: a section is judged whole, not per item. */
function sectionRows(): ActivityItemResponse[] {
  return Array.from({ length: STIMULI }, (_, i) => ({
    id: `r${i}`,
    assignment_id: "assign-1",
    student_id: "user-1",
    item_order: i + 1,
    attempt_no: 1,
    verdict: null,
    response_text: "said something",
    created_at: new Date().toISOString(),
  }));
}

/**
 * Press Start, the way she does.
 *
 * A section always opens on its briefing now, even one already `in_progress`:
 * it never resumes, because resuming would open the microphone and start the
 * clock with the rules skipped. Reaching the runner therefore takes a
 * deliberate press, in a test exactly as in the product.
 */
async function startTheSection() {
  // The section door labels its action "Start the section"; the editorial intro
  // this replaced said "Start" and rendered it twice, once in the page and once
  // in a sticky dock. Matching both keeps the helper honest about either
  // surface, and taking the first is the same action in both.
  const [start] = await screen.findAllByRole("button", {
    name: /^start( the section)?$/i,
  });
  fireEvent.click(start);
}

function renderRouted(startSection = false) {
  return render(
    <MemoryRouter
      initialEntries={[
        startSection
          ? { pathname: "/activities/assign-1", state: { startSection: true } }
          : "/activities/assign-1",
      ]}
    >
      <Routes>
        <Route path="/activities/:assignmentId" element={<ActivityRunner />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RRC canonical assignment navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    activityState.assignment = makeSectionAssignment('assigned');
    activityState.loading = false;
    activityState.error = null;
    listItemResponses.mockReset().mockResolvedValue([]);
    exitPath.mockResolvedValue('/reading-center/rrc');
  });
  it('preserves the legacy assignment launch query, hash and recorder launch state', async () => {
    const state = { startSection: true, source: 'my-work' };
    render(<MemoryRouter initialEntries={[{ pathname: '/activities/assign-1', search: '?from=my-work', hash: '#attempt', state }]}>
      <Routes><Route path="/activities/:assignmentId" element={<ActivityRunner />} /></Routes>
    </MemoryRouter>);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/reading-center/rrc/attempt/assign-1?from=my-work#attempt', { replace: true, state }));
  });
  it('does not canonicalize an assignment belonging to another student', async () => {
    activityState.assignment = { ...makeSectionAssignment('assigned'), student_id: 'someone-else' };
    renderRouted();
    await screen.findByText(/Admin view of a student/);
    expect(navigate).not.toHaveBeenCalled();
  });
  it('leaves the new section briefing for its RRC collection', async () => {
    render(<MemoryRouter initialEntries={['/reading-center/rrc/attempt/assign-1']}>
      <Routes><Route path="/reading-center/rrc/attempt/:assignmentId" element={<ActivityRunner />} /></Routes>
    </MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /^back$/i }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/reading-center/rrc'));
  });
  it('returns an individually assigned legacy section to assigned work without a library grant', async () => {
    exitPath.mockResolvedValue('/classroom');
    render(<MemoryRouter initialEntries={['/reading-center/rrc/attempt/assign-1']}>
      <Routes><Route path="/reading-center/rrc/attempt/:assignmentId" element={<ActivityRunner />} /></Routes>
    </MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /^back$/i }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/classroom'));
    expect(exitPath).toHaveBeenCalledWith('user-1');
  });
});

describe("recovering an acknowledged-evidence RRC closeout after reload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    completeSectionRun.mockReset().mockResolvedValue(undefined);
    activityState.assignment = makeSectionAssignment("in_progress");
    activityState.loading = false;
    activityState.error = null;
    storedRecording.mockReset().mockResolvedValue({ data: [{ id: "audio-1", name: "saved.webm" }], error: null });
    keepSectionCompletion({ assignmentId: "assign-1", studentId: "user-1", audioPath: "user-1/assign-1/saved.webm", attemptNo: 1, itemOrders: [1, 2, 3] });
    listItemResponses.mockReset().mockResolvedValue(sectionRows().map(row => ({ ...row, rrc: { audio_path: "user-1/assign-1/saved.webm" } })));
  });
  it("retries closeout before mounting the microphone runner", async () => {
    renderRouted();
    await waitFor(() => expect(completeSectionRun).toHaveBeenCalledWith("assign-1"));
    expect(sectionRunnerProps).not.toHaveBeenCalled();
    await waitFor(() => expect(localStorage.getItem("rrc:completion:user-1:assign-1")).toBeNull());
  });
  it("keeps retry saving on a lost completion response", async () => {
    completeSectionRun.mockRejectedValueOnce(new Error("lost response"));
    renderRouted();
    await waitFor(() => expect(screen.getByRole("button", { name: /retry completion/i })).toBeInTheDocument());
    expect(sectionRunnerProps).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /retry completion/i }));
    await waitFor(() => expect(completeSectionRun).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(localStorage.getItem("rrc:completion:user-1:assign-1")).toBeNull());
  });
  it("blocks reopening on a failed evidence read", async () => {
    listItemResponses.mockResolvedValueOnce(sectionRows()).mockRejectedValueOnce(new Error("offline"));
    renderRouted();
    await waitFor(() => expect(screen.getByRole("button", { name: /retry loading/i })).toBeInTheDocument());
    expect(completeSectionRun).not.toHaveBeenCalled();
    expect(sectionRunnerProps).not.toHaveBeenCalled();
    localStorage.removeItem("rrc:completion:user-1:assign-1");
  });
  it("does not mix rows from different takes into completion", async () => {
    listItemResponses.mockResolvedValue(sectionRows());
    renderRouted();
    await waitFor(() => expect(screen.getByRole("button", { name: /retry loading/i })).toBeInTheDocument());
    expect(completeSectionRun).not.toHaveBeenCalled();
    localStorage.removeItem("rrc:completion:user-1:assign-1");
  });
  it("blocks closeout while the recording is absent from account storage", async () => {
    storedRecording.mockResolvedValue({ data: [], error: null });
    renderRouted();
    await waitFor(() => expect(screen.getByRole("button", { name: /retry loading/i })).toBeInTheDocument());
    expect(completeSectionRun).not.toHaveBeenCalled();
    localStorage.removeItem("rrc:completion:user-1:assign-1");
  });
});

describe("reopening a finished Read, Recall, Colour section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSectionGrade.mockResolvedValue(null);
    getAccommodation.mockResolvedValue("standard");
    listItemResponses.mockResolvedValue(sectionRows());
    activityState.assignment = makeSectionAssignment("completed");
    activityState.loading = false;
    activityState.error = null;
  });

  it("opens on the Report Card, not the generic completion summary", async () => {
    const { container } = renderRouted();
    await waitFor(() =>
      expect(container.querySelector('[data-runner="recall-section-report"]')).toBeTruthy(),
    );
    expect(screen.queryByTestId("section-runner-mounted")).not.toBeInTheDocument();
  });

  it("does not put her back into a live recording", async () => {
    const { container } = renderRouted();
    await waitFor(() =>
      expect(container.querySelector('[data-runner="recall-section-report"]')).toBeTruthy(),
    );
    expect(container.querySelector('[data-runner="recall-section"]')).toBeFalsy();
  });

  it("reaches for the grade that was produced after she stopped", async () => {
    getSectionGrade.mockResolvedValue(null);
    renderRouted();
    await waitFor(() => expect(getSectionGrade).toHaveBeenCalledWith("assign-1"));
  });

  // Historical rows can belong to separate abandoned attempts. Without a
  // finished-take marker they cannot prove that this section was completed.
  it("does not treat historical rows without a finished-take marker as closeout evidence", async () => {
    activityState.assignment = makeSectionAssignment("in_progress");
    const { container } = renderRouted();
    await waitFor(() => expect(screen.getAllByRole("button", { name: /start the section/i }).length).toBeGreaterThan(0));
    expect(completeSectionRun).not.toHaveBeenCalled();
    expect(completeAssignment).not.toHaveBeenCalled();
    expect(container.querySelector('[data-runner="recall-section-report"]')).toBeFalsy();
  });
});

/**
 * The goal an accommodated student is timed against.
 *
 * `SectionRunner` has always taken an accommodation and nothing ever passed it,
 * so every run used the standard 25-minute goal. A student with a 70-minute
 * accommodation, whose goal is 50, was recorded as fifteen minutes over on a
 * run she finished ten minutes inside. ADR 0014 gave the section three goals to
 * stop exactly that, and the wire was never connected -- which is invisible
 * from the outside, because a wrong goal still renders as a goal.
 */
describe("the goal an accommodated student is timed against", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSectionGrade.mockResolvedValue(null);
    getAccommodation.mockResolvedValue("standard");
    listItemResponses.mockResolvedValue([]);
    activityState.assignment = makeSectionAssignment("in_progress");
    activityState.loading = false;
    activityState.error = null;
  });

  it("hands the runner her own accommodation, not the standard one", async () => {
    getAccommodation.mockResolvedValue("accommodation_70");
    renderRouted();
    await startTheSection();
    await waitFor(() => expect(sectionRunnerProps).toHaveBeenCalled());
    expect(sectionRunnerProps.mock.calls.at(-1)![0].accommodation).toBe("accommodation_70");
  });

  it("shows the full instructions page first, even when started from the library", async () => {
    const { container } = renderRouted(true);
    await waitFor(() =>
      expect(container.querySelector('[data-runner="section-briefing"]')).toBeTruthy(),
    );
    expect(sectionRunnerProps).not.toHaveBeenCalled();
    await startTheSection();
    await waitFor(() => expect(sectionRunnerProps).toHaveBeenCalled());
    expect(sectionRunnerProps.mock.calls.at(-1)?.[0].timeGoalMinutes).toEqual({
      standard: 25,
      accommodation_53: 38,
      accommodation_70: 50,
    });
  });

  it("asks for it under the student's own id", async () => {
    renderRouted();
    await waitFor(() => expect(getAccommodation).toHaveBeenCalledWith("user-1"));
  });

  it("uses standard when she has none", async () => {
    renderRouted();
    await startTheSection();
    await waitFor(() => expect(sectionRunnerProps).toHaveBeenCalled());
    expect(sectionRunnerProps.mock.calls.at(-1)![0].accommodation).toBe("standard");
  });
});

/**
 * A section never resumes.
 *
 * Every other Activity here does, and should: the log says where she got to and
 * the intro is the front door exactly once. A Read, Recall, Colour section is
 * the one run where resuming is both meaningless and dangerous. Meaningless
 * because the unit judged is the whole section against one unbroken recording,
 * so there is nothing to rejoin. Dangerous because landing on `running` opens
 * the microphone and starts the clock with the briefing skipped -- so once the
 * link had been opened ONCE, every later visit began a live recorded run.
 *
 * The state is sticky, which is what makes this worth a test rather than a
 * comment: an abandoned section leaves the assignment `in_progress` for ever,
 * so the bad path is the permanent one.
 */
describe("a section never resumes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSectionGrade.mockResolvedValue(null);
    getAccommodation.mockResolvedValue("standard");
    listItemResponses.mockResolvedValue([]);
    activityState.loading = false;
    activityState.error = null;
  });

  it("opens an in-progress section on its briefing, not in a live run", async () => {
    activityState.assignment = makeSectionAssignment("in_progress");
    renderRouted();
    expect((await screen.findAllByRole("button", { name: /^start( the section)?$/i })).length).toBeGreaterThan(0);
    expect(sectionRunnerProps).not.toHaveBeenCalled();
  });

  it("opens on the briefing even with stimuli already on record", async () => {
    // An abandoned sitting leaves its rows behind by design -- they are what
    // makes a crashed run recoverable. They must not be read as "she is
    // partway through this one".
    activityState.assignment = makeSectionAssignment("in_progress");
    listItemResponses.mockResolvedValue(sectionRows().slice(0, 1));
    renderRouted();
    expect((await screen.findAllByRole("button", { name: /^start( the section)?$/i })).length).toBeGreaterThan(0);
    expect(sectionRunnerProps).not.toHaveBeenCalled();
  });

  it("reaches the runner once she presses Start", async () => {
    activityState.assignment = makeSectionAssignment("in_progress");
    renderRouted();
    await startTheSection();
    await waitFor(() => expect(sectionRunnerProps).toHaveBeenCalled());
  });
});

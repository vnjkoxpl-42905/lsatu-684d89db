import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityRunner } from "./ActivityRunner";
import { SEED_ACTIVITIES } from "../content";
import type { ActivityItemResponse, ActivityStatus, Verdict } from "../api/types";
import { syncClassroomItemStatusBySource } from "@/lib/classroomItems";

// Resume. The runner used to open every unfinished Activity at its homepage
// with question one and an empty score, even though every attempt was already
// on record: a student who did forty of sixty-two questions and closed the tab
// came back to question one, and the score written at the end counted only
// whatever they managed in the last sitting. These pin the replay.

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

const activityState = { assignment: null as unknown, loading: false, error: null as string | null };

vi.mock("../hooks/useStudentActivities", () => ({
  useStudentActivity: () => activityState,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...a: unknown[]) => toast(...a) }));

const completeAssignment = vi.fn().mockResolvedValue(undefined);
const listItemResponses = vi.fn().mockResolvedValue([]);
const markAssignmentStarted = vi.fn().mockResolvedValue(undefined);
const recordItemResponse = vi.fn().mockResolvedValue(undefined);

vi.mock("../api/activitiesClient", () => ({
  assignmentBelongsToAnotherAccount: vi.fn().mockResolvedValue(false),
  completeAssignment: (...a: unknown[]) => completeAssignment(...a),
  listItemResponses: (...a: unknown[]) => listItemResponses(...a),
  markAssignmentStarted: (...a: unknown[]) => markAssignmentStarted(...a),
  recordItemResponse: (...a: unknown[]) => recordItemResponse(...a),
}));

vi.mock("@/lib/classroomItems", () => ({
  syncClassroomItemStatusBySource: vi.fn().mockResolvedValue(undefined),
}));

/** Titled so it matches no world: these tests are about the run, not the stage. */
function makeAssignment(status: ActivityStatus = "in_progress", count = 6) {
  return {
    id: "assign-1",
    activity_id: "act-1",
    student_id: "user-1",
    assigned_by: "user-1",
    class_id: "user-1",
    title: "An Activity With No World",
    subtitle: "a subtitle",
    item_format: "free-text" as const,
    instructions: {
      task: "Do the thing the Activity asks for.",
      rules: ["One rule."],
    },
    items: Array.from({ length: count }, (_, i) => ({
      order: i + 1,
      prompt: `Statement number ${i + 1}.`,
      credited_answers: [`Answer ${i + 1}.`],
      explanation: "",
    })),
    status,
    score: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
  };
}

let id = 0;
function row(
  item_order: number,
  attempt_no: number,
  verdict: Verdict | null,
  response_text = `wrote ${item_order}`,
): ActivityItemResponse {
  return {
    id: `r${id++}`,
    assignment_id: "assign-1",
    student_id: "user-1",
    item_order,
    attempt_no,
    verdict,
    response_text,
    created_at: new Date().toISOString(),
  };
}

function renderRouted() {
  return render(
    <MemoryRouter initialEntries={["/activities/assign-1"]}>
      <Routes>
        <Route path="/activities/:assignmentId" element={<ActivityRunner />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ActivityRunner resume", () => {
  beforeEach(() => {
    navigate.mockClear();
    toast.mockClear();
    completeAssignment.mockReset().mockResolvedValue(undefined);
    vi.mocked(syncClassroomItemStatusBySource).mockClear();
    listItemResponses.mockClear();
    markAssignmentStarted.mockClear();
    recordItemResponse.mockClear();
    listItemResponses.mockResolvedValue([]);
    activityState.assignment = makeAssignment();
    activityState.loading = false;
    activityState.error = null;
  });

  it("opens on the question the student stopped at, not on question one", async () => {
    listItemResponses.mockResolvedValue([
      row(1, 1, "correct"),
      row(2, 1, "correct"),
      row(3, 1, "correct"),
    ]);
    renderRouted();
    expect(await screen.findByText("Question 4")).toBeInTheDocument();
    expect(screen.getByText("Statement number 4.")).toBeInTheDocument();
  });

  it("restores Observatory dials from correct answers without lighting partial ones", async () => {
    const source = SEED_ACTIVITIES.find((a) => a.slug === "spot-the-relationship")!;
    activityState.assignment = {
      ...makeAssignment(), title: source.title, instructions: source.instructions,
      items: [source.items[1], source.items[4], source.items[8]],
    };
    listItemResponses.mockResolvedValue([
      row(2, 1, "correct", source.items[1].credited_answers[0]),
      row(5, 2, "partial", "causal"),
    ]);
    renderRouted();
    await screen.findByTestId("ob-seal-conditional");
    await waitFor(() => expect(screen.getByTestId("ob-seal-conditional")).toHaveAttribute("data-lit", "true"));
    expect(screen.getByTestId("ob-seal-causal")).not.toHaveAttribute("data-lit");
    expect(screen.getByTestId("ob-seal-comparative")).not.toHaveAttribute("data-lit");
  });

  it("blocks practice on an owned revoked source even when admin reads still return it", async () => {
    activityState.assignment = { ...makeAssignment("assigned"), revoked_at: "2026-09-30T10:00:00Z", revoked_by: "teacher-1" };
    renderRouted();
    expect(await screen.findByText("This Activity is no longer assigned. Your earlier work has been kept.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^start$/i })).not.toBeInTheDocument();
    expect(listItemResponses).not.toHaveBeenCalled();
    expect(markAssignmentStarted).not.toHaveBeenCalled();
    expect(completeAssignment).not.toHaveBeenCalled();
  });

  it("walks past the homepage once the run has been started", async () => {
    listItemResponses.mockResolvedValue([row(1, 1, "correct")]);
    renderRouted();
    await screen.findByText("Question 2");
    expect(screen.queryByRole("button", { name: /^start$/i })).not.toBeInTheDocument();
  });

  it("still opens on the homepage for a run that was never started", async () => {
    activityState.assignment = makeAssignment("assigned");
    renderRouted();
    expect(await screen.findAllByRole("button", { name: /^start$/i })).not.toHaveLength(0);
    expect(screen.getByText("Do the thing the Activity asks for.")).toBeInTheDocument();
  });

  it("hands back the attempt already spent and the words already written", async () => {
    listItemResponses.mockResolvedValue([
      row(1, 1, "correct"),
      row(2, 1, "incorrect", "my half-finished try"),
    ]);
    renderRouted();
    await screen.findByText("Question 2");
    expect(await screen.findByDisplayValue("my half-finished try")).toBeInTheDocument();
    expect(screen.getByText(/attempt 1 of 2 already used/i)).toBeInTheDocument();
  });

  it("scores every sitting, not just the last, when the run turns out to be finished", async () => {
    // Six items: four correct, one partial, one revealed at the cap. The tab
    // went away before Finish, so the run has no completion row yet.
    listItemResponses.mockResolvedValue([
      row(1, 1, "correct"),
      row(2, 1, "correct"),
      row(3, 1, "correct"),
      row(4, 1, "correct"),
      row(5, 1, "partial"),
      row(5, 2, "partial"),
      row(6, 1, "incorrect"),
      row(6, 2, "incorrect"),
    ]);
    renderRouted();
    await waitFor(() => expect(completeAssignment).toHaveBeenCalled());
    // (4 * 1 + 1 * 0.5 + 1 * 0) / 6 judged = 75%. Every item reached a verdict
    // here, so the judged denominator and the item count agree.
    expect(completeAssignment).toHaveBeenCalledWith("assign-1", {
      numerator: 4.5,
      judged: 6,
      total: 6,
      percent: 75,
    });
    expect(await screen.findByText("75%")).toBeInTheDocument();
  });

  it("repairs a status that never moved off assigned when attempts are on record", async () => {
    activityState.assignment = makeAssignment("assigned");
    listItemResponses.mockResolvedValue([row(1, 1, "correct")]);
    renderRouted();
    await screen.findByText("Question 2");
    expect(markAssignmentStarted).toHaveBeenCalledWith("assign-1");
  });

  it("never overwrites real progress with a blank run when the log cannot be read", async () => {
    listItemResponses.mockRejectedValue(new Error("network"));
    renderRouted();
    expect(await screen.findByRole("button", { name: "Retry loading" })).toBeInTheDocument();
    expect(screen.queryByText("Question 1")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^start$/i })).not.toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringMatching(/saved progress/i) }),
    );
  });

  it("reviews a completed run rather than resuming it", async () => {
    activityState.assignment = { ...makeAssignment("completed"), completed_at: new Date().toISOString(), score: 88 };
    listItemResponses.mockResolvedValue([row(1, 1, "correct")]);
    renderRouted();
    expect(await screen.findByText("88%")).toBeInTheDocument();
  });

  it("opens an empty historical completed row without a timestamp on the intro", async () => {
    activityState.assignment = { ...makeAssignment("completed"), score: 88 };
    renderRouted();
    expect(await screen.findAllByRole("button", { name: /^start$/i })).not.toHaveLength(0);
    expect(screen.queryByText("88%")).not.toBeInTheDocument();
    expect(screen.queryByText(/An Activity With No World complete/)).not.toBeInTheDocument();
    expect(completeAssignment).not.toHaveBeenCalled();
  });

  it("restores saved progress from a historical completed row without a timestamp", async () => {
    activityState.assignment = makeAssignment("completed");
    listItemResponses.mockResolvedValue([row(1, 1, "incorrect", "unfinished answer")]);
    renderRouted();
    expect(await screen.findByDisplayValue("unfinished answer")).toBeInTheDocument();
    expect(screen.getByText(/attempt 1 of 2 already used/i)).toBeInTheDocument();
    expect(completeAssignment).not.toHaveBeenCalled();
  });

  it.each([null, "2026-09-30T10:00:00Z"])("blocks false reports when completed-row responses fail to load (timestamp %s)", async (completed_at) => {
    activityState.assignment = { ...makeAssignment("completed"), completed_at, score: 88 };
    listItemResponses.mockRejectedValue(new Error("network"));
    renderRouted();
    expect(await screen.findByRole("button", { name: "Retry loading" })).toBeInTheDocument();
    expect(screen.queryByText("88%")).not.toBeInTheDocument();
    expect(completeAssignment).not.toHaveBeenCalled();
  });

  it("waits for rescued closeout and retries failure with the same answers and score", async () => {
    activityState.assignment = { ...makeAssignment("completed", 2), score: 12 };
    listItemResponses.mockResolvedValue([row(1, 1, "correct", "first answer"), row(2, 2, "partial", "last answer")]);
    let rejectCloseout: (reason: Error) => void;
    completeAssignment.mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectCloseout = reject; }));
    renderRouted();
    await waitFor(() => expect(completeAssignment).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("75%")).not.toBeInTheDocument();
    expect(syncClassroomItemStatusBySource).not.toHaveBeenCalled();
    rejectCloseout!(new Error("offline"));
    fireEvent.click(await screen.findByRole("button", { name: "Retry completion" }));
    expect(await screen.findByText("75%")).toBeInTheDocument();
    expect(screen.getByText("first answer")).toBeInTheDocument();
    expect(screen.getByText("last answer")).toBeInTheDocument();
    expect(screen.queryByText("12%")).not.toBeInTheDocument();
    expect(completeAssignment).toHaveBeenNthCalledWith(2, ...completeAssignment.mock.calls[0]);
    expect(syncClassroomItemStatusBySource).toHaveBeenCalledTimes(1);
  });
});

describe("General practice shows the run's real progress", () => {
  beforeEach(() => {
    navigate.mockClear();
    listItemResponses.mockResolvedValue([]);
    activityState.loading = false;
    activityState.error = null;
  });

  it("draws the progress rail from replayed verdicts across every sitting", async () => {
    const seed = SEED_ACTIVITIES.find((a) => a.slug === "conditional-rephrase")!;
    activityState.assignment = {
      ...makeAssignment("in_progress"),
      title: seed.title,
      subtitle: seed.subtitle,
      instructions: seed.instructions,
      items: seed.items,
    };
    listItemResponses.mockResolvedValue([
      row(1, 1, "correct"),
      row(2, 1, "partial"),
      row(2, 2, "partial"),
      row(3, 1, "correct"),
    ]);

    const { container } = renderRouted();
    // Straight onto the question: the world's 2.5s entrance belongs to Start,
    // not to every reopen of a run already under way.
    await screen.findByRole("progressbar", { name: "Practice progress" });
    // General practice now shows its percentage in the progress rail.
    expect(container.querySelector('[role="progressbar"]')).toHaveAttribute("aria-valuenow", String(Math.round(3 / seed.items.length * 100)));
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityRunner } from "./ActivityRunner";
import { readCachedRuns } from "../conditionals/practiceStore";
import type { ActivityItemResponse, Verdict } from "../api/types";

// The re-drill. The practice path has existed since the beginning and has always
// written nothing, but it could only ever re-run the WHOLE activity, because
// `items` came straight off the assignment snapshot with nowhere to say
// "these ones". These pin the narrowing, and pin that narrowing a run never
// reaches the database.

const navigate = vi.fn();
vi.mock("../conditionals/practiceStore", async () => {
  const actual = await vi.importActual<typeof import("../conditionals/practiceStore")>("../conditionals/practiceStore");
  return { ...actual, syncPracticeRun: vi.fn().mockResolvedValue(undefined) };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

const activityState = { assignment: null as unknown, loading: false, error: null as string | null };

vi.mock("../hooks/useStudentActivities", () => ({
  useStudentActivity: () => activityState,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "s@example.com" } }),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

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

const CATEGORIES = [
  "Negative requirement: unless",
  "Same rule, new seat: unless",
  "Negative requirement: without",
  "Trigger word: if",
  "Trigger word: when",
  "Requirement word: only if",
];

/**
 * Titled "Conditional Rephrase" because the ledger only exists for an Activity
 * whose categories have been grouped, and this test is about the ledger. The
 * world that title selects is the Switchyard, which never mounts here: the run
 * opens on the completion screen.
 */
function makeAssignment() {
  return {
    id: "assign-1",
    activity_id: "act-1",
    student_id: "user-1",
    assigned_by: "user-1",
    class_id: "user-1",
    title: "Conditional Rephrase",
    subtitle: null,
    item_format: "free-text" as const,
    instructions: { task: "Rephrase it.", rules: ["One rule."] },
    items: CATEGORIES.map((category, i) => ({
      order: i + 1,
      prompt: `Statement number ${i + 1}.`,
      credited_answers: [`Answer ${i + 1}.`],
      explanation: "",
      category,
    })),
    status: "completed" as const,
    score: 58,
    score_numerator: 3.5,
    score_judged: 6,
    score_total: 6,
    scoring_version: 2,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

let id = 0;
function row(item_order: number, verdict: Verdict | null, attempt_no = 1): ActivityItemResponse {
  return {
    id: `r${id++}`,
    assignment_id: "assign-1",
    student_id: "user-1",
    item_order,
    attempt_no,
    verdict,
    response_text: `wrote ${item_order}`,
    created_at: new Date().toISOString(),
  };
}

/**
 * The attempt log for an item the student did not get.
 *
 * Two rows, not one. A non-correct attempt below the cap is deliberately NOT
 * resolved -- the student still has a try left -- so a single incorrect row
 * reads as a run parked mid-question rather than as a finished miss. This is the
 * shape the database actually holds for a missed item.
 */
function missed(item_order: number, final: Verdict): ActivityItemResponse[] {
  return [row(item_order, "incorrect", 1), row(item_order, final, 2)];
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

describe("re-drilling the misses", () => {
  beforeEach(() => {
    navigate.mockClear();
    localStorage.clear();
    completeAssignment.mockClear();
    markAssignmentStarted.mockClear();
    recordItemResponse.mockClear();
    activityState.assignment = makeAssignment();
    activityState.loading = false;
    activityState.error = null;
    listItemResponses.mockResolvedValue([
      ...missed(1, "incorrect"),
      ...missed(2, "incorrect"),
      ...missed(3, "partial"),
      row(4, "correct"),
      row(5, "correct"),
      row(6, "correct"),
    ]);
  });

  it("shows the ledger on a completed run, counting the misses", async () => {
    renderRouted();
    expect(await screen.findByTestId("indicator-ledger")).toBeInTheDocument();
    expect(screen.getByText("unless cost you 2 questions.")).toBeInTheDocument();
  });

  it("runs only the missed items, in their original order", async () => {
    renderRouted();
    fireEvent.click(await screen.findByTestId("ledger-redrill"));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    const [run] = readCachedRuns("user-1");
    expect(run.general?.items.map(item => item.order)).toEqual([1, 2, 3]);
    expect(run.position).toBe(0);
    expect(run.stage).toBe("paper");
    expect(navigate).toHaveBeenCalledWith(`/activities/assign-1?practiceRun=${run.id}`, { replace: true });
  });

  it("saves a separate narrowed session without rewriting the assignment", async () => {
    renderRouted();
    fireEvent.click(await screen.findByTestId("ledger-redrill"));
    await waitFor(() => expect(readCachedRuns("user-1")).toHaveLength(1));
    expect(completeAssignment).not.toHaveBeenCalled();
    expect(recordItemResponse).not.toHaveBeenCalled();
    expect(markAssignmentStarted).not.toHaveBeenCalled();
    expect((activityState.assignment as ReturnType<typeof makeAssignment>).score).toBe(58);
  });

  it("offers no re-drill on a clean run", async () => {
    listItemResponses.mockResolvedValue([
      row(1, "correct"),
      row(2, "correct"),
      row(3, "correct"),
      row(4, "correct"),
      row(5, "correct"),
      row(6, "correct"),
    ]);
    renderRouted();
    await screen.findByTestId("indicator-ledger");
    await waitFor(() => {
      expect(screen.queryByTestId("ledger-redrill")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Nothing missed/)).toBeInTheDocument();
  });
});

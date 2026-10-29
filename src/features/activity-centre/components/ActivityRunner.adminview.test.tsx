vi.mock('@/hooks/useStudentWorkState', () => ({ useLoadedStudentWorkAcknowledgment: vi.fn(), useLoadedPracticeTestAcknowledgment: vi.fn() }));
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityRunner } from "./ActivityRunner";
import {
  completeAssignment,
  listItemResponses,
  markAssignmentStarted,
} from "../api/activitiesClient";
import { syncClassroomItemStatusBySource } from "@/lib/classroomItems";

// Joshua hands a student an activity link, opens it himself, and is told the
// activity was assigned to a different account. He is the admin: RLS lets him
// read every assignment, and the only thing standing between him and the row
// was a client-side `student_id` filter. He can open it now.
//
// The half that matters more than the loading: his visit must not be recorded
// as the student's work. Opening a run cannot start it, close it, or move the
// Classroom row, and the answers on the screen must be the STUDENT'S.

const activityState = { assignment: null as unknown, loading: false, error: null as string | null };

vi.mock("../hooks/useStudentActivities", () => ({
  useStudentActivity: () => activityState,
  // The section-library door lists her sections, so it reads her assignments.
  useStudentActivities: () => ({ assignments: [], loading: false, error: null }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1", email: "admin@example.com" } }),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

vi.mock("../api/activitiesClient", () => ({
  assignmentBelongsToAnotherAccount: vi.fn().mockResolvedValue(false),
  completeAssignment: vi.fn().mockResolvedValue(undefined),
  listItemResponses: vi.fn().mockResolvedValue([]),
  markAssignmentStarted: vi.fn().mockResolvedValue(undefined),
  recordItemResponse: vi.fn().mockResolvedValue(undefined),
  listSectionChoices: vi.fn().mockResolvedValue([]),
  listMySectionGrades: vi.fn().mockResolvedValue([]),
  startSectionAttempt: vi.fn().mockResolvedValue("new-assignment"),
}));

vi.mock("@/lib/classroomItems", () => ({
  syncClassroomItemStatusBySource: vi.fn().mockResolvedValue(undefined),
}));

/** A real assignment, issued to a student who is not the signed-in admin. */
function foreignAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: "assign-1",
    student_id: "student-9",
    title: "Negation Station",
    subtitle: "Statement Negation Drill",
    instructions: { tagline: "Negate each statement." },
    status: "assigned",
    mode: "graded",
    item_format: "free-text",
    score: null,
    score_numerator: null,
    score_judged: null,
    score_total: null,
    items: [
      { order: 1, prompt: "All cats are grey.", credited_answers: ["Some cat is not grey."] },
      { order: 2, prompt: "No dogs bark.", credited_answers: ["Some dog barks."] },
    ],
    ...overrides,
  };
}

function renderAt(id = "assign-1") {
  return render(
    <MemoryRouter initialEntries={[`/activities/${id}`]}>
      <Routes>
        <Route path="/activities/:assignmentId" element={<ActivityRunner />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ActivityRunner, admin viewing a student's assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // `clearAllMocks` forgets the calls and keeps the implementation, so a
    // resolved value set inside one test would otherwise be the student's
    // attempt log in every test after it.
    vi.mocked(listItemResponses).mockResolvedValue([]);
    activityState.assignment = foreignAssignment();
    activityState.loading = false;
    activityState.error = null;
  });

  it("opens the activity instead of refusing it", async () => {
    renderAt();
    expect(await screen.findByText(/negate each statement/i)).toBeInTheDocument();
    expect(screen.queryByText(/assigned to a different account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/activity not found/i)).not.toBeInTheDocument();
  });

  it("says on screen that it is an admin view and records nothing", async () => {
    renderAt();
    expect(await screen.findByText(/nothing you do here is recorded/i)).toBeInTheDocument();
  });

  it("reads the attempt log under the student's id, so their answers are what is shown", async () => {
    renderAt();
    await waitFor(() => expect(listItemResponses).toHaveBeenCalled());
    for (const call of vi.mocked(listItemResponses).mock.calls) {
      expect(call[1]).toBe("student-9");
    }
  });

  it("never marks the student's assignment started", async () => {
    activityState.assignment = foreignAssignment({ status: "in_progress" });
    renderAt();
    await waitFor(() => expect(listItemResponses).toHaveBeenCalled());
    expect(markAssignmentStarted).not.toHaveBeenCalled();
    expect(syncClassroomItemStatusBySource).not.toHaveBeenCalled();
  });

  /*
   * The banner made two claims and only one of them was always true. On a
   * section library -- the drill Joshua opens most, which holds no items at all
   * -- it told him the student's saved answers were on screen beside an empty
   * list and a Start button.
   */
  it("claims her saved answers are shown on the screen that shows them", async () => {
    activityState.assignment = foreignAssignment({ status: "completed" });
    vi.mocked(listItemResponses).mockResolvedValue([
      { item_order: 1, response_text: "Some cat is not grey.", verdict: "correct", attempt_no: 1 },
      { item_order: 2, response_text: "Some dog barks.", verdict: "correct", attempt_no: 1 },
    ] as never);
    renderAt();
    expect(await screen.findByText(/their saved answers are shown/i)).toBeInTheDocument();
  });

  it("does not claim saved answers on a drill that has none", async () => {
    renderAt();
    expect(await screen.findByText(/nothing you do here is recorded/i)).toBeInTheDocument();
    expect(screen.queryByText(/their saved answers are shown/i)).not.toBeInTheDocument();
  });

  it("does not claim saved answers on a section library, which has no items", async () => {
    activityState.assignment = foreignAssignment({
      item_format: "spoken-recall",
      mode: "section-library",
      items: [],
    });
    renderAt();
    expect(await screen.findByText(/nothing you do here is recorded/i)).toBeInTheDocument();
    expect(screen.queryByText(/their saved answers are shown/i)).not.toBeInTheDocument();
  });

  it("never closes a run the student left one keystroke from finished", async () => {
    vi.mocked(listItemResponses).mockResolvedValue([
      { item_order: 1, response_text: "Some cat is not grey.", verdict: "correct", attempt_no: 1 },
      { item_order: 2, response_text: "Some dog barks.", verdict: "correct", attempt_no: 1 },
    ] as never);
    renderAt();
    await waitFor(() => expect(listItemResponses).toHaveBeenCalled());
    await waitFor(() => expect(completeAssignment).not.toHaveBeenCalled());
  });
});

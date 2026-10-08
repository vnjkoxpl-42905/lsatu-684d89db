import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityRunner } from "./ActivityRunner";
import { assignmentBelongsToAnotherAccount } from "../api/activitiesClient";

// An assignment issued to one account, opened while signed in as another, used
// to render "Activity not found." That is the same sentence the runner shows
// for an id that was never real, and the two situations want opposite
// responses: one is "check the link", the other is "switch accounts".
//
// This was not hypothetical. A real session opened a real assignment URL,
// read "Activity not found.", and spent three wrong diagnoses on it: a broken
// route, then an RLS policy, then a missing migration. The actual cause was
// that `getStudentAssignment` filters on `student_id` as well as `id`, so
// being an admin does not help. The message was the whole problem.

const activityState = { assignment: null as unknown, loading: false, error: null as string | null };

vi.mock("../hooks/useStudentActivities", () => ({
  useStudentActivity: () => activityState,
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
}));

vi.mock("@/lib/classroomItems", () => ({
  syncClassroomItemStatusBySource: vi.fn().mockResolvedValue(undefined),
}));

function renderAt(id = "assign-1") {
  return render(
    <MemoryRouter initialEntries={[`/activities/${id}`]}>
      <Routes>
        <Route path="/activities/:assignmentId" element={<ActivityRunner />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ActivityRunner, wrong account", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // the client mock is module-level, so calls accumulate
    activityState.assignment = null;
    activityState.loading = false;
    activityState.error = null;
    vi.mocked(assignmentBelongsToAnotherAccount).mockResolvedValue(false);
  });

  it("says the assignment belongs to another account when it really does", async () => {
    vi.mocked(assignmentBelongsToAnotherAccount).mockResolvedValue(true);
    renderAt();
    expect(await screen.findByText(/assigned to a different account/i)).toBeInTheDocument();
    expect(screen.queryByText(/activity not found/i)).not.toBeInTheDocument();
  });

  it("names the account actually signed in, which is the fact that resolves it", async () => {
    vi.mocked(assignmentBelongsToAnotherAccount).mockResolvedValue(true);
    renderAt();
    expect(await screen.findByText(/admin@example\.com/)).toBeInTheDocument();
  });

  it("keeps the plain not-found wording when no such assignment exists", async () => {
    vi.mocked(assignmentBelongsToAnotherAccount).mockResolvedValue(false);
    renderAt();
    expect(await screen.findByText(/activity not found/i)).toBeInTheDocument();
    expect(screen.queryByText(/different account/i)).not.toBeInTheDocument();
  });

  it("still names the signed-in account on a plain not-found, so the next reader can rule it out fast", async () => {
    renderAt();
    expect(await screen.findByText(/signed in as admin@example\.com/i)).toBeInTheDocument();
  });

  // A probe that throws must never be read as "this belongs to someone else":
  // that would tell a student to go and find an account that does not exist.
  it("falls back to plain not-found when the probe fails", async () => {
    vi.mocked(assignmentBelongsToAnotherAccount).mockRejectedValue(new Error("network"));
    renderAt();
    expect(await screen.findByText(/activity not found/i)).toBeInTheDocument();
  });

  // The probe is a wasted round trip on every healthy open, so it must only
  // fire once the load has genuinely come back empty.
  it("does not probe while the assignment is still loading", async () => {
    activityState.loading = true;
    renderAt();
    await waitFor(() => {
      expect(vi.mocked(assignmentBelongsToAnotherAccount)).not.toHaveBeenCalled();
    });
  });

  // Found by adversarial review, not by a student. A boolean starting false
  // rendered "Activity not found." on the first paint and corrected itself once
  // the probe answered, so the wrong sentence flashed before the right one.
  it("shows no verdict at all until the ownership probe has answered", async () => {
    let settle: (v: boolean) => void = () => {};
    vi.mocked(assignmentBelongsToAnotherAccount).mockReturnValue(
      new Promise<boolean>((res) => {
        settle = res;
      }),
    );
    renderAt();
    await waitFor(() => {
      expect(vi.mocked(assignmentBelongsToAnotherAccount)).toHaveBeenCalled();
    });
    expect(screen.queryByText(/activity not found/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/different account/i)).not.toBeInTheDocument();
    settle(true);
    expect(await screen.findByText(/different account/i)).toBeInTheDocument();
  });

  // Found in round 2 of the same review. Holding the spinner until the probe
  // answers is right, but a route with no assignment id never makes that call,
  // so "unknown" would have hung the screen on a spinner with nothing coming.
  it("does not hang on a spinner when there is no assignment id to probe", async () => {
    render(
      <MemoryRouter initialEntries={["/activities"]}>
        <Routes>
          <Route path="/activities" element={<ActivityRunner />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/activity not found/i)).toBeInTheDocument();
    expect(vi.mocked(assignmentBelongsToAnotherAccount)).not.toHaveBeenCalled();
  });

  it("does not probe when the load failed outright, since the error is the message", async () => {
    activityState.error = "boom";
    renderAt();
    expect(await screen.findByText(/could not load this activity: boom/i)).toBeInTheDocument();
    expect(vi.mocked(assignmentBelongsToAnotherAccount)).not.toHaveBeenCalled();
  });
});

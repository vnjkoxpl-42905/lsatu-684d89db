import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES } from "../content";
import { ActivityRunner } from "./ActivityRunner";

// The Activity runner is a full-screen takeover: no sidebar, no header, no
// breadcrumb. Before this, a student who opened an Activity had no route back
// to the Activity Centre from any of its screens, so the only way out was the
// browser's own Back button. These tests pin the exit onto every screen the
// runner can be sitting on, including the not-found dead end.

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

// Deliberately titled so it matches no world: these tests are about the generic
// rail and the exit on it. The world path has its own describe block below.
function makeAssignment() {
  const a = SEED_ACTIVITIES[0];
  return {
    id: "assign-1",
    activity_id: "act-1",
    student_id: "user-1",
    assigned_by: "user-1",
    class_id: "user-1",
    title: "An Activity With No World",
    subtitle: a.subtitle,
    item_format: a.item_format,
    instructions: a.instructions,
    items: a.items,
    status: "assigned",
    score: null,
    started_at: null,
    completed_at: null,
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

/**
 * The intro offers Start twice: the real button at the foot of the page, and
 * the sticky dock that carries it until that button is on screen. Both call the
 * same handler, so a test that only wants to begin the run takes the first.
 */
async function clickStart(pattern: RegExp = /^start$/i) {
  const buttons = await screen.findAllByRole("button", { name: pattern });
  fireEvent.click(buttons[0]);
}

describe("ActivityRunner exit", () => {
  beforeEach(() => {
    navigate.mockClear();
    activityState.assignment = makeAssignment();
    activityState.loading = false;
    activityState.error = null;
  });

  it("offers a way out of the intro screen, and it goes to the Activity Centre", async () => {
    renderRouted();
    const exit = await screen.findByRole("button", { name: /exit/i });
    fireEvent.click(exit);
    expect(navigate).toHaveBeenCalledWith("/activities");
  });

  it("backs out of a question to the Activity's own intro, not the Activity Centre", async () => {
    renderRouted();
    await clickStart();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /exit/i })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /exit/i }));

    // Back on the intro, which is the page the student was reaching for.
    expect(await screen.findAllByRole("button", { name: /^start$/i })).not.toHaveLength(0);
    // And emphatically NOT routed away to the list.
    expect(navigate).not.toHaveBeenCalled();
  });

  it("resumes on the same question after backing out to the intro", async () => {
    renderRouted();
    await clickStart();
    await screen.findByRole("button", { name: /exit/i });
    fireEvent.click(screen.getByRole("button", { name: /exit/i }));
    await clickStart();
    // Item 1 of the run, unchanged: leaving the questions is not a restart.
    await waitFor(() => expect(screen.getByText(/1 \/ 30|1 \//)).toBeInTheDocument());
  });

  it("does not strand the student when the activity cannot be found", async () => {
    activityState.assignment = null;
    activityState.error = null;
    renderRouted();
    const exit = await screen.findByRole("button", { name: /exit/i });
    fireEvent.click(exit);
    expect(navigate).toHaveBeenCalledWith("/activities");
  });

  it("stays out of the way when the runner is embedded in teacher preview", async () => {
    render(
      <MemoryRouter>
        <ActivityRunner assignmentId="assign-1" preview />
      </MemoryRouter>,
    );
    await screen.findByText("An Activity With No World");
    expect(screen.queryByRole("button", { name: /exit/i })).not.toBeInTheDocument();
  });
});

describe("ActivityRunner world", () => {
  it("puts the Activity's own world on the running screen, not the generic rail", async () => {
    const { NEGATION_ITEMS } = await import("../worlds/polarity/polarity");
    activityState.assignment = {
      ...(makeAssignment() as Record<string, unknown>),
      title: "Negation Station",
      items: NEGATION_ITEMS,
    };
    renderRouted();
    await clickStart();

    // The Polarity Chamber's entrance plays first, then the chamber itself.
    await waitFor(() => expect(document.querySelector(".polarity")).not.toBeNull(), {
      timeout: 4000,
    });
  });

  it("falls back to the generic rail for an Activity with no world", async () => {
    activityState.assignment = {
      ...(makeAssignment() as Record<string, unknown>),
      title: "An Activity With No World",
    };
    renderRouted();
    await clickStart();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /exit/i })).toBeInTheDocument(),
    );
    expect(document.querySelector(".polarity")).toBeNull();
    expect(document.querySelector(".ac-hero")).not.toBeNull();
  });
});

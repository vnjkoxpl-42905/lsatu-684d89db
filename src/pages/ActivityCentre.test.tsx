import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES } from "@/features/activity-centre/content";
import ActivityCentre from "./ActivityCentre";

// The Centre was assignment-gated for everyone, which is right for a student
// and wrong for the person doing the assigning: Joshua opened it and read "No
// activities assigned yet" while eight authored Activities sat in the table.
// These pin the admin library onto the page, and pin the student's view as
// unchanged by it.

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

const perms = { is_admin: false };
vi.mock("@/hooks/useUserPermissions", () => ({
  useUserPermissions: () => perms,
}));

const studentState = { assignments: [] as unknown[], loading: false, error: null as string | null };
const libraryState = { activities: [] as unknown[], loading: false, error: null as string | null };

vi.mock("@/features/activity-centre", () => ({
  useStudentActivities: () => studentState,
  useAdminActivities: () => libraryState,
}));

vi.mock("@/components/teacher/library/AssignWorkSheet", () => ({
  AssignWorkSheet: ({ open, items }: { open: boolean; items: { title: string }[] }) =>
    open ? <div data-testid="assign-sheet">{items.map((i) => i.title).join(", ")}</div> : null,
}));

/** An Activity definition, as `activities` rows come back. */
function definition(index: number) {
  const a = SEED_ACTIVITIES[index];
  return {
    id: `act-${a.slug}`,
    slug: a.slug,
    title: a.title,
    subtitle: a.subtitle,
    instructions: a.instructions,
    item_format: a.item_format,
    items: a.items,
    created_by: "admin-1",
    class_id: "class-1",
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ActivityCentre />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  navigate.mockReset();
  perms.is_admin = false;
  studentState.assignments = [];
  studentState.loading = false;
  studentState.error = null;
  libraryState.activities = [];
  libraryState.loading = false;
  libraryState.error = null;
});

describe("Activity Centre, as a student", () => {
  it("says nothing is assigned, and shows no library", () => {
    renderPage();
    expect(screen.getByText(/No activities assigned yet/)).toBeTruthy();
    expect(screen.queryByText("The library")).toBeNull();
  });
});

describe("Activity Centre, as an admin", () => {
  beforeEach(() => {
    perms.is_admin = true;
    libraryState.activities = [definition(0), definition(1)];
  });

  it("shows every Activity in the library, not an empty Centre", () => {
    renderPage();
    expect(screen.getByText("The library")).toBeTruthy();
    expect(screen.getByText(SEED_ACTIVITIES[0].title)).toBeTruthy();
    expect(screen.getByText(SEED_ACTIVITIES[1].title)).toBeTruthy();
    // The student's "your instructor will add them" is not for the instructor.
    expect(screen.queryByText(/No activities assigned yet/)).toBeNull();
  });

  it("opens an Activity through the preview, which writes no row", () => {
    renderPage();
    fireEvent.click(screen.getByText(SEED_ACTIVITIES[0].title));
    expect(navigate).toHaveBeenCalledWith(`/activities/preview/act-${SEED_ACTIVITIES[0].slug}`);
  });

  it("hands the Activity to the one assign sheet", () => {
    renderPage();
    expect(screen.queryByTestId("assign-sheet")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: `Assign ${SEED_ACTIVITIES[0].title}` }));
    expect(screen.getByTestId("assign-sheet").textContent).toBe(SEED_ACTIVITIES[0].title);
  });

  it("calls an empty library a failed read, because the Activities are seeded", () => {
    libraryState.activities = [];
    renderPage();
    expect(screen.getByText(/this is a read failing rather than an empty/)).toBeTruthy();
  });
});

/**
 * One drill, one card, however many times she has run it.
 *
 * Starting a section builds an assignment of its own, so a student who had run
 * three sections saw four Read, Recall, Colour cards: the door and one per run.
 * It read as Joshua having assigned the same drill four times.
 */
describe("Read, Recall, Colour, after she has run some sections", () => {
  const door = {
    id: "door",
    title: "Read, Recall, Colour",
    subtitle: "A whole section, out loud, against the clock",
    mode: "section-library",
    item_format: "spoken-recall",
    status: "assigned",
    created_at: "2026-09-01T00:00:00Z",
    completed_at: null,
    item_count: 0,
  };
  const attempt = (id: string, section: string) => ({
    ...door,
    id,
    mode: "section",
    source_section: section,
    status: "completed",
    completed_at: "2026-09-03T00:00:00Z",
  });

  it("shows one card, not one per run", () => {
    studentState.assignments = [
      door,
      attempt("r1", "PT134.S3"),
      attempt("r2", "PT134.S3"),
      attempt("r3", "PT102.S3"),
    ];
    renderPage();
    expect(screen.getAllByText("Read, Recall, Colour")).toHaveLength(1);
  });

  it("still shows the door when she has never run a section", () => {
    studentState.assignments = [door];
    renderPage();
    expect(screen.getByText("Read, Recall, Colour")).toBeInTheDocument();
  });

  it("does not empty the page when every row she has is an attempt", () => {
    // Not the student's empty state: she has the drill, she has simply run it.
    studentState.assignments = [door, attempt("r1", "PT134.S3")];
    renderPage();
    expect(screen.queryByText(/No activities assigned yet/i)).toBeNull();
  });
});

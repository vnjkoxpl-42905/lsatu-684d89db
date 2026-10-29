import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Classroom from "./Classroom";

const { orientation, permissions } = vi.hoisted(() => ({
  permissions: {
    loading: false,
    is_admin: false,
    has_classroom_access: true,
  },
  orientation: {
    loaded: true,
    completed: false,
    setCompleted: vi.fn(),
    name: "Ada",
    answers: {},
    save: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/components/classroom/OrientationCard", () => ({
  useOrientation: () => orientation,
  OrientationCardView: () => <div>Set up your classroom</div>,
}));
vi.mock("@/components/classroom/AnnouncementBanner", () => ({
  default: () => <div>Announcement</div>,
}));
vi.mock("@/components/classroom/home/ClassroomHome", () => ({
  default: () => <div>Your week</div>,
}));
vi.mock("@/components/LockedModule", () => ({
  default: () => <div>Not open yet</div>,
}));
vi.mock("@/hooks/useUserPermissions", () => ({
  useUserPermissions: () => permissions,
}));

describe("Classroom", () => {
  it("gives the whole stage to the intake until it is finished", () => {
    render(<Classroom />);
    expect(screen.getByText("Set up your classroom")).toBeTruthy();
    // The home used to sit underneath the intake, so a student answering
    // questions about their week was reading a week they had not built.
    expect(screen.queryByText("Your week")).toBeNull();
    expect(screen.queryByText("Announcement")).toBeNull();
  });

  it("draws the classroom once setup is done", () => {
    orientation.completed = true;
    render(<Classroom />);
    expect(screen.getByText("Your week")).toBeTruthy();
    expect(screen.queryByText("Set up your classroom")).toBeNull();
  });

  it("shows the locked notice instead of coursework when classroom access is revoked", () => {
    orientation.completed = true;
    permissions.has_classroom_access = false;
    render(<Classroom />);
    expect(screen.getByText("Not open yet")).toBeTruthy();
    expect(screen.queryByText("Your week")).toBeNull();
    expect(screen.queryByText("Announcement")).toBeNull();
    permissions.has_classroom_access = true;
  });

  it("lets an admin see the home even without the student flag", () => {
    orientation.completed = true;
    permissions.has_classroom_access = false;
    permissions.is_admin = true;
    render(<Classroom />);
    expect(screen.getByText("Your week")).toBeTruthy();
    permissions.has_classroom_access = true;
    permissions.is_admin = false;
  });

  it("draws nothing until the profile read lands", () => {
    orientation.loaded = false;
    const { container } = render(<Classroom />);
    expect(container.textContent).toBe("");
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Classroom from "./Classroom";

const { orientation } = vi.hoisted(() => ({
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

  it("draws nothing until the profile read lands", () => {
    orientation.loaded = false;
    const { container } = render(<Classroom />);
    expect(container.textContent).toBe("");
  });
});

import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

vi.mock("../../store/AppContext", () => ({ useApp: () => ({
  bootcampState: { xpTotal: 0, dailyStreak: 0, aceBadges: [], moduleProgress: {
    m1: { noteComplete: true, drillComplete: true, quizScore: 0, quizTotal: 0 },
  } },
  openModule: vi.fn(), isModuleUnlocked: () => true, isModuleComplete: (id: string) => id === "m1",
}) }));

it("explains the written exercise and shows completion without requiring a quiz", () => {
  render(<Dashboard />);
  expect(screen.getByRole("heading", { name: "How to complete your homework" })).toBeInTheDocument();
  expect(screen.getByText(/Quizzes are optional extra practice/)).toBeInTheDocument();
  expect(screen.getByText(/Reviewing alone does not complete the written exercise/)).toBeInTheDocument();
  expect(screen.getByText("Done · Note: saved · Drill: saved")).toBeInTheDocument();
});

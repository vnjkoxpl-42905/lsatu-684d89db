import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PracticeExamAttempts } from "./PracticeExamPages";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "student-1" } }),
}));
vi.mock("@/hooks/useUserPermissions", () => ({
  useUserPermissions: () => ({ loading: false, is_admin: false, has_practice_access: true, has_drill_access: true }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === "practice-section-attempts" ? [
      { id: "one", kind: "lr-section", status: "in-progress", preptest: 140, section: 1, startedAt: "2026-09-28T10:00:00Z", answered: 3, total: 25, correct: null, href: "/drill?run=one" },
      { id: "two", kind: "rc-section", status: "completed", preptest: 141, section: 2, startedAt: "2026-09-27T10:00:00Z", answered: 27, total: 27, correct: 20, href: "/rc/results/two" },
    ] : [],
    isLoading: false,
    isError: false,
  }),
}));

function RouteProbe() {
  const location = useLocation();
  return <output aria-label="Current route">{location.pathname + location.search}</output>;
}

describe("Practice Exam Attempts filters", () => {
  it("keeps unfinished and completed sittings distinct in the URL", () => {
    render(<MemoryRouter initialEntries={["/practice/exams/attempts"]}>
      <Routes><Route path="/practice/exams/attempts" element={<><PracticeExamAttempts /><RouteProbe /></>} /></Routes>
    </MemoryRouter>);
    expect(screen.getByText(/PrepTest 140 · Logical Reasoning/)).toBeInTheDocument();
    expect(screen.getByText(/PrepTest 141 · Reading Comprehension/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Unfinished (1)" }));
    expect(screen.getByRole("button", { name: "Unfinished (1)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status", { name: "Current route" })).toHaveTextContent("status=unfinished");
    expect(screen.queryByText(/PrepTest 141 · Reading Comprehension/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Completed (1)" }));
    expect(screen.getByText(/PrepTest 141 · Reading Comprehension/)).toBeInTheDocument();
    expect(screen.queryByText(/PrepTest 140 · Logical Reasoning/)).not.toBeInTheDocument();
  });
});

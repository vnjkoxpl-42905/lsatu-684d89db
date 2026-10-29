import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentLibraryLessons from "./StudentLibraryLessons";

const mocks = vi.hoisted(() => ({ permissions: vi.fn(), progress: vi.fn() }));
vi.mock("@/hooks/useUserPermissions", () => ({ useUserPermissions: mocks.permissions }));
vi.mock("@/hooks/useFirstAnswerProgress", () => ({ useFirstAnswerProgress: mocks.progress }));

const answer = (id: string, key: string, correct: boolean, topic = "Main Conclusion") => ({
  attemptId: id, questionKey: key, area: "LR", source: "lr_attempts", mode: "adaptive", correct,
  gradedAt: `2026-09-2${id.slice(-1)}T12:00:00Z`, topic,
});

describe("student written Library topic pilot", () => {
  beforeEach(() => {
    mocks.progress.mockClear();
    mocks.permissions.mockReturnValue({
      loading: false, is_admin: false, has_drill_access: true, has_analytics_access: true,
      has_activity_access: true, has_bootcamp_access: false,
      has_classroom_access: true,
    });
    mocks.progress.mockReturnValue({
      ledger: {
        answers: [answer("a1", "q1", true), answer("a2", "q1", false), answer("a3", "q2", false), answer("a4", "q3", true, "Flaw")],
        coverage: { includedSources: ["lr_attempts"], missingSources: [] },
      },
      loading: false, error: null, resolution: { state: "ready" }, refresh: vi.fn(),
    });
  });

  it("uses the existing written rule and worked example, then launches a Main Conclusion drill", () => {
    render(<MemoryRouter><StudentLibraryLessons /></MemoryRouter>);
    expect(screen.getByText(/First decide whether the stimulus is an argument at all/)).toBeInTheDocument();
    expect(screen.getByText(/The city should extend library hours, because evening attendance/)).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === "P" && !!element.textContent?.includes("1 of 2 distinct Main Conclusion questions correct"))).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Practice this topic" });
    const url = new URL(link.getAttribute("href")!, "https://lsatprep.study");
    expect(url.pathname).toBe("/drill");
    expect(url.searchParams.get("drill")).toBe("filter");
    expect(url.searchParams.get("qtypes")).toBe("Main Conclusion");
  });

  it("does not fetch or expose topic evidence or drill entry without the relevant access", () => {
    mocks.permissions.mockReturnValue({
      loading: false, is_admin: false, has_drill_access: false, has_analytics_access: false,
      has_activity_access: false, has_bootcamp_access: false,
    });
    render(<MemoryRouter><StudentLibraryLessons /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: "Practice this topic" })).not.toBeInTheDocument();
    expect(screen.getByText("Topic progress is locked for your account.")).toBeInTheDocument();
    expect(mocks.progress).not.toHaveBeenCalled();
  });
  it('opens only assigned catalog links through Classroom with retired flags off', () => {
    mocks.permissions.mockReturnValue({ loading: false, is_admin: false, has_classroom_access: true,
      has_activity_access: false, has_bootcamp_access: false });
    render(<MemoryRouter><StudentLibraryLessons /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Activities/ })).toHaveAttribute('href', '/library/activities');
    expect(screen.getByRole('link', { name: /Bootcamps/ })).toHaveAttribute('href', '/library/bootcamps');
    expect(screen.queryByRole('link', { name: 'Practice this topic' })).not.toBeInTheDocument();
  });
  it('keeps assigned catalog links locked when Classroom is off', () => {
    mocks.permissions.mockReturnValue({ loading: false, is_admin: false, has_classroom_access: false,
      has_activity_access: true, has_bootcamp_access: true });
    render(<MemoryRouter><StudentLibraryLessons /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /Activities/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Bootcamps/ })).not.toBeInTheDocument();
  });
});

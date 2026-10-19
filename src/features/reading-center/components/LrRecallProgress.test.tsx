import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LrRecallProgress } from "./LrRecallProgress";
const state = vi.hoisted(() => ({ user: { id: "student" }, theme: "dark", query: { data: undefined as any, isLoading: false, isError: false, dataUpdatedAt: 1, refetch: vi.fn() } }));
vi.mock("../hooks/useReadingCenterData", () => ({ usePreferences: () => ({ data: { theme: state.theme } }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("../hooks/useRecallDashboard", () => ({ useRecallDashboard: () => state.query }));
const assignment = (id: string, student_id = "student", revoked_at: string | null = null) => ({ id, student_id, mode: "section", revoked_at });
const grade = (assignment_id: string, attempt_no = 1) => ({ assignment_id, attempt_no, source_section: `${assignment_id} section`, graded_at: "2026-10-16T10:00:00Z", section: { mean_coverage: 0.8 } });
function setup() {
  return render(<MemoryRouter><Routes><Route path="/" element={<LrRecallProgress />} /><Route path="/reading-center/rrc/attempt/:id" element={<p>Stored report</p>} /></Routes></MemoryRouter>);
}
beforeEach(() => { state.theme = "dark"; state.query.data = { assignments: [], grades: [] }; state.query.isLoading = false; state.query.isError = false; state.query.refetch.mockClear(); });
describe("LR Training Reading Progress", () => {
  it("shows every own run, excludes other accounts and revoked assignments, and opens existing reports", async () => {
    state.query.data = { assignments: [assignment("own"), assignment("other", "else"), assignment("removed", "student", "2026-10-15")], grades: [grade("other"), grade("removed"), ...Array.from({ length: 7 }, (_, i) => grade("own", i + 1)), grade("own")] };
    setup();
    expect(await screen.findByText(/7 graded runs/)).toBeInTheDocument();
    expect(screen.getAllByRole("button").filter(button => button.textContent?.includes("own section"))).toHaveLength(7);
    expect(screen.queryByText("other section")).not.toBeInTheDocument();
    expect(screen.queryByText("removed section")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button").find(button => button.textContent?.includes("own section"))!);
    expect(await screen.findByText("Stored report")).toBeInTheDocument();
  });
  it("has an empty state that sends practice to LR Training rather than below the history", async () => {
    setup();
    expect(await screen.findByText(/Complete an LR Training section, then return here/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Practise LR Training" })).toHaveAttribute("href", "/reading-center/rrc");
  });
  it("uses readable local tokens for both the white workspace and high contrast", async () => {
    const view = setup();
    expect((await screen.findByRole("region", { name: "LR Training progress" })).style.getPropertyValue("--foreground")).toBe("248 25% 15%");
    await screen.findByText(/No graded runs yet/);
    state.theme = "high_contrast";
    view.rerender(<MemoryRouter><LrRecallProgress /></MemoryRouter>);
    await screen.findByText(/No graded runs yet/);
    expect(screen.getByRole("region", { name: "LR Training progress" }).style.getPropertyValue("--foreground")).toBe("0 0% 100%");
    expect(screen.getByRole("region", { name: "LR Training progress" }).style.getPropertyValue("--card")).toBe("0 0% 0%");
  });
  it("shows loading and offers a real retry on failure", () => {
    state.query.isLoading = true;
    const view = setup();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your LR Training history");
    state.query.isLoading = false;
    state.query.isError = true;
    view.rerender(<MemoryRouter><LrRecallProgress /></MemoryRouter>);
    expect(screen.getByRole("alert")).toHaveTextContent("could not load");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(state.query.refetch).toHaveBeenCalledOnce();
  });
});

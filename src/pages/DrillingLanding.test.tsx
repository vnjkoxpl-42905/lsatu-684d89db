import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import DrillsEntry from "@/pages/DrillsEntry";

const built = vi.hoisted(() => ({ items: [] as unknown[] }));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/lib/drillRunLedger", () => ({ listStandaloneDrillRuns: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/rc/api/rcProgress", () => ({
  listSessions: vi.fn().mockResolvedValue([]),
  getSessionAttempts: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/features/rc/lib/rcBank", () => ({ loadAllIndexPassages: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/drillResumeSession", () => ({ loadDrillResumeSession: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/standaloneDrillHistory", () => ({ buildStandaloneDrillHistory: () => built.items }));
vi.mock("@/components/mainhub/AssignedWorkPanel", () => ({ default: () => <div>assigned panel</div> }));
vi.mock("@/pages/AcademyMainhub", () => ({ default: () => <div>full drill hub</div> }));

const run = (n: number, over: Record<string, unknown> = {}) => ({
  key: `k${n}`,
  section: n % 2 ? "lr" : "rc",
  title: `Drill ${n}`,
  detail: `${n} of 20 answered`,
  date: `2026-10-${String(10 + n).padStart(2, "0")}T12:00:00Z`,
  status: "in_progress",
  continueTo: `/resume/${n}`,
  resultsTo: "",
  reviewTo: "",
  ...over,
});

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/practice/drills" element={<><DrillsEntry /><Where /></>} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("Drilling page", () => {
  it("shows the Drilling page on the bare URL and the full hub when a section is named", async () => {
    built.items = [];
    renderAt("/practice/drills");
    expect(await screen.findByTestId("drilling-landing")).toBeInTheDocument();
    cleanup();
    renderAt("/practice/drills?section=rc");
    expect(await screen.findByText("full drill hub")).toBeInTheDocument();
  });

  it("opens the RC and LR setup from the two cards", async () => {
    built.items = [];
    renderAt("/practice/drills");
    fireEvent.click(await screen.findByRole("button", { name: /New RC Drill/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/practice/drills?section=rc&view=create");
    cleanup();
    renderAt("/practice/drills");
    fireEvent.click(await screen.findByRole("button", { name: /New LR Drill/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/practice/drills?section=lr&view=create");
  });

  it("has a My Drills button in the header", async () => {
    built.items = [];
    renderAt("/practice/drills");
    fireEvent.click(await screen.findByRole("button", { name: /My Drills/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/practice/drills/saved");
  });

  it("lists the 5 most recent unfinished drills, newest first, and Continue reopens the saved one", async () => {
    built.items = [1, 2, 3, 4, 5, 6, 7].map((n) => run(n));
    built.items.push(run(8, { status: "completed" }));
    renderAt("/practice/drills");
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Continue" })).toHaveLength(5));
    const titles = screen.getAllByText(/^Drill \d$/).map((el) => el.textContent);
    expect(titles).toEqual(["Drill 7", "Drill 6", "Drill 5", "Drill 4", "Drill 3"]);
    fireEvent.click(screen.getAllByRole("button", { name: "Continue" })[0]);
    expect(screen.getByTestId("where")).toHaveTextContent("/resume/7");
  });

  it("says so when nothing is in progress", async () => {
    built.items = [];
    renderAt("/practice/drills");
    expect(await screen.findByText(/don.t have any in-progress drills/)).toBeInTheDocument();
  });
});

vi.mock('@/hooks/useClassroomDestinationAcknowledgment',()=>({useClassroomDestinationAcknowledgment:vi.fn()}));
vi.mock('@/hooks/useClassroomItems', () => ({ useClassroomItems:()=>({data:[],isLoading:false,isError:false}) }));
vi.mock('@/hooks/useStudentWorkState', () => ({ useLoadedStudentWorkAcknowledgment: vi.fn(), useLoadedPracticeTestAcknowledgment: vi.fn() }));
// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReadingCenterHome from "./ReadingCenterHome";

const state = vi.hoisted(() => ({ recall: { data: { assignments: [], grades: [] }, isLoading: false, isError: false, refetch: vi.fn() },
  sessions: { data: [], isLoading: false, isError: false, refetch: vi.fn() }, passages: { data: [], isLoading: false, isError: false, refetch: vi.fn() },
  progress: { data: [], isLoading: false, isError: false, refetch: vi.fn() } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("../hooks/useRecallDashboard", () => ({ useRecallDashboard: () => state.recall, useDashboardSessions: () => state.sessions, useDashboardProgress: () => state.progress, useDashboardPassages: () => state.passages }));
vi.mock("../components/RcTrainingProgress", () => ({ RcTrainingProgress: ({ compact }: { compact?: boolean }) => <section aria-label="RC Training progress">{compact ? "RC summary" : "RC detail"}</section> }));
vi.mock("recharts", () => ({ ResponsiveContainer: () => null, CartesianGrid: () => null, Line: () => null, LineChart: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null }));

let node: HTMLDivElement;
let root: Root;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  for (const query of Object.values(state)) { query.isLoading = false; query.isError = false; query.refetch.mockClear(); }
  state.recall.data = { assignments: [], grades: [] };
  state.sessions.data = []; state.passages.data = []; state.progress.data = [];
  node = document.createElement("div"); document.body.append(node); root = createRoot(node);
});
afterEach(() => { act(() => root.unmount()); node.remove(); });
const render = () => act(() => root.render(<MemoryRouter><ReadingCenterHome /></MemoryRouter>));

describe("Reading dashboard", () => {
  it("starts with truthful empty states and links to separate activities", () => {
    render();
    expect(node.querySelector("h1")?.textContent).toBe("Your reading dashboard");
    expect(node.textContent).toContain("No graded LR runs yet");
    expect(node.textContent).toContain("No recorded reading sessions yet");
    expect(node.querySelector('a[href="/reading-center/rrc"]')).not.toBeNull();
    expect(node.querySelector('a[href="/reading-center/speed-reading"]')).not.toBeNull();
    expect(node.textContent).not.toContain("Choose your reading activity");
  });

  it("includes RC Training beside the other activities", () => {
    render();
    expect(node.querySelector('[aria-label="RC Training progress"]')?.textContent).toBe("RC summary");
  });

  it("keeps RC practice within the single RC Training experience", () => {
    render();
    expect(node.querySelectorAll('[aria-label="RC Training progress"]')).toHaveLength(1);
    expect(node.querySelector('[aria-label="RC Practice"]')).toBeNull();
    expect(node.querySelector('a[href="/practice/exams?view=section&section=rc"]')).toBeNull();
  });

  it("shows a failed query as unavailable with retry rather than a false zero", () => {
    state.recall.isError = true;
    render();
    expect(node.querySelector('[aria-label="LR drills completed"]')?.textContent).toContain("Unavailable");
    expect(node.querySelector('[aria-label="LR Training progress"]')?.textContent).not.toContain("No graded LR runs");
    const retry = [...node.querySelectorAll("button")].find(button => button.textContent === "Try again")!;
    act(() => retry.click());
    expect(state.recall.refetch).toHaveBeenCalledTimes(1);
    expect(node.textContent).toContain("No recorded reading sessions yet");
  });

  it("keeps an available LR resume link when the passage collection fails", () => {
    state.recall.data.assignments = [{ id: "owned", student_id: "me", mode: "section", status: "in_progress", title: "PT101.S2", started_at: "2026-10-16T10:00:00Z" }] as never[];
    state.passages.isError = true;
    render();
    expect(node.querySelector('a[href="/reading-center/rrc/attempt/owned"]')?.textContent).toContain("Resume");
    expect(node.textContent).toContain("Some recent practice could not load");
  });
});

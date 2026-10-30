// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadDashboardPassages, loadDashboardProgress, loadDashboardSessions, loadRecallDashboard, useRecallDashboard } from "./useRecallDashboard";
import { readingDashboard } from "../lib/dashboard";

const state = vi.hoisted(() => ({ userId: "me", calls: [] as unknown[][],
  rows: {} as Record<string, unknown[]>, errors: {} as Record<string, string> }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.userId ? { id: state.userId } : null }) }));
vi.mock("@/features/activity-centre/api/activityRevocation", () => ({ activityRevocationAvailable: async () => false }));
vi.mock("../lib/db", () => ({ rcDb: (table: string) => {
  const builder: Record<string, unknown> = {};
  let start = 0; let end = 999;
  for (const method of ["select", "eq", "or", "order", "range"]) builder[method] = (...args: unknown[]) => {
    state.calls.push([table, method, ...args]);
    if (method === "range") { start = Number(args[0]); end = Number(args[1]); }
    return builder;
  };
  builder.then = (resolve: (result: unknown) => unknown) => Promise.resolve(resolve({ data: (state.rows[table] ?? []).slice(start, end + 1), error: state.errors[table] ? { message: state.errors[table] } : null }));
  return builder;
} }));

beforeEach(() => { state.userId = "me"; state.calls = []; state.rows = {}; state.errors = {}; });
describe("Dashboard paginated reads", () => {
  it("scopes both LR sources to the account and includes records beyond the API's first 1000", async () => {
    state.rows.activity_assignments = Array.from({ length: 1001 }, (_, index) => ({ id: `a${index}`, student_id: "me", mode: "section", status: "completed" }));
    state.rows.activity_section_grades = Array.from({ length: 1001 }, (_, index) => ({ assignment_id: `a${index}`, attempt_no: 1, source_section: `Section ${index}`, graded_at: new Date(index * 60000).toISOString(), section: { total_seconds: 60, mean_coverage: 0.8 } }));
    const result = await loadRecallDashboard("me");
    expect(result.assignments).toHaveLength(1001);
    expect(result.grades).toHaveLength(1001);
    expect(state.calls).toContainEqual(["activity_assignments", "eq", "item_format", "spoken-recall"]);
    for (const table of ["activity_assignments", "activity_section_grades"]) {
      expect(state.calls).toContainEqual([table, "eq", "student_id", "me"]);
      expect(state.calls).toContainEqual([table, "range", 1000, 1999]);
    }
    const derived = readingDashboard("me", result.assignments, result.grades, [], [], []);
    expect(derived.completedLr).toBe(1001);
    expect(derived.practiceSeconds).toBe(60060);
    expect(derived.recallTrend.at(-1)?.label).toBe("Section 1000");
    expect(state.calls.filter(call => call[1] === "select").every(call => !String(call[2]).includes("transcript"))).toBe(true);
  });

  it("includes latest reading sessions and completion totals past 1000, without changing reader hooks", async () => {
    state.rows.reading_center_sessions = Array.from({ length: 1001 }, (_, index) => ({ id: `s${index}`, passage_id: "p", active_ms: 60000, words_read: index + 1, ended_at: new Date(index * 60000).toISOString() }));
    state.rows.reading_center_progress = Array.from({ length: 1001 }, (_, index) => ({ passage_id: `p${index}`, completed_at: "2026-10-16" }));
    const sessions = await loadDashboardSessions("me");
    const progress = await loadDashboardProgress("me");
    expect(sessions).toHaveLength(1001);
    expect(progress).toHaveLength(1001);
    const derived = readingDashboard("me", [], [], sessions, [], progress);
    expect(derived.practiceSeconds).toBe(60060);
    expect(derived.completedPassages).toBe(1001);
    expect(derived.speedTrend.at(-1)?.value).toBe(1001);
    for (const table of ["reading_center_sessions", "reading_center_progress"]) {
      expect(state.calls).toContainEqual([table, "eq", "user_id", "me"]);
      expect(state.calls).toContainEqual([table, "range", 1000, 1999]);
    }
  });

  it("loads lightweight passage labels, honoring private titles and hidden metadata", async () => {
    state.rows.reading_center_passages = [{ id: "p", slug: "plants", title: "Plants" }, { id: "hidden", title: "Hidden" }];
    state.rows.reading_center_passage_metadata = [{ passage_id: "p", title_override: "My Plants" }, { passage_id: "hidden", hidden: true }];
    expect(await loadDashboardPassages("me")).toEqual([{ id: "p", slug: "plants", title: "My Plants" }]);
    expect(state.calls).toContainEqual(["reading_center_passages", "or", "owner_id.is.null,owner_id.eq.me"]);
    expect(state.calls).toContainEqual(["reading_center_passages", "select", "id,slug,title"]);
    expect(state.calls).toContainEqual(["reading_center_passage_metadata", "eq", "user_id", "me"]);
  });

  it("reports unreadable data instead of returning empty success", async () => {
    state.errors.activity_section_grades = "Report read unavailable";
    await expect(loadRecallDashboard("me")).rejects.toThrow("Report read unavailable");
  });

  it("does not keep the preceding account's dashboard visible after switching accounts", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const hook = renderHook(() => useRecallDashboard(), { wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    state.userId = "second"; hook.rerender();
    await waitFor(() => expect(state.calls).toContainEqual(["activity_assignments", "eq", "student_id", "second"]));
    expect(state.calls).toContainEqual(["activity_section_grades", "eq", "student_id", "second"]);
    expect(client.getQueryData(["reading-center", "me", "recall-dashboard"])).toBeDefined();
  });
});

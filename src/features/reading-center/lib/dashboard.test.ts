import { describe, expect, it } from "vitest";
import type { ActivityAssignmentSummary, SectionGradeStub } from "@/features/activity-centre/api/types";
import type { Passage, Progress, ReadingSession } from "./types";
import { readingDashboard, recordedTime } from "./dashboard";

const assignment = (id: string, overrides = {}): ActivityAssignmentSummary => ({
  id, student_id: "me", activity_id: null, title: "LR section", subtitle: null,
  status: "completed", mode: "section", score: null, instructions: {}, created_at: "2026-10-15T10:00:00Z",
  started_at: "2026-10-15T10:00:00Z", completed_at: "2026-10-15T11:00:00Z", item_count: 25, ...overrides,
} as ActivityAssignmentSummary);
const grade = (id: string, attempt: number, overrides = {}): SectionGradeStub => ({ assignment_id: id, attempt_no: attempt,
  source_section: "PT101.S2", graded_at: "2026-10-15T11:00:00Z", section: { mean_coverage: 0.75, total_seconds: 120 }, ...overrides,
} as SectionGradeStub);
const passage = { id: "p", slug: "my passage", title: "Plants" } as Passage;
const progress = { passage_id: "p", word_index: 30, completed_at: null, last_opened_at: "2026-10-16T10:00:00Z", hidden_from_recent: false } as Progress;
const session = { id: "s", passage_id: "p", active_ms: 30000, paused_ms: 90000, words_read: 100, wpm: 999,
  started_at: "2026-10-16T10:00:00Z", ended_at: "2026-10-16T10:02:00Z", reading_mode: "serial" } as ReadingSession;

describe("Reading Center dashboard", () => {
  it("counts only own unrevoked completed LR sections and keeps activities separate", () => {
    const result = readingDashboard("me", [assignment("done"), assignment("other", { student_id: "someone-else" }),
      assignment("door", { mode: "section-library" }), assignment("abandoned", { status: "abandoned" }),
      assignment("revoked", { revoked_at: "2026-10-16" })],
    [grade("done", 1), grade("other", 1)], [session], [passage], [{ ...progress, completed_at: "2026-10-16" }]);
    expect(result.completedLr).toBe(1);
    expect(result.completedPassages).toBe(1);
    expect(result.recallTrend).toHaveLength(1);
    expect(result.recallTrend[0].value).toBe(75);
    expect(result.speedTrend[0].value).toBe(200); // actual active time, not configured WPM
    expect(result.practiceSeconds).toBe(150); // no paused time or wall-clock estimates
    expect(result.recent.every(row => !row.to.includes("other"))).toBe(true);
  });

  it("does not double count saved reports or session retries and normalizes coverage", () => {
    const result = readingDashboard("me", [assignment("a")], [grade("a", 1), grade("a", 1), grade("a", 2,
      { graded_at: "2026-10-16T10:00:00Z", section: { mean_coverage: 80, total_seconds: 180 } })], [session, session], [], []);
    expect(result.practiceSeconds).toBe(330);
    expect(result.recallTrend.map(p => p.value)).toEqual([75, 80]);
  });

  it("routes resumable own sections and available passages to their existing saved work", () => {
    const result = readingDashboard("me", [assignment("active", { status: "in_progress", completed_at: null })], [], [], [passage], [progress]);
    expect(result.recent.map(row => [row.action, row.to])).toEqual([
      ["Resume", "/reading-center/read/my%20passage"], ["Resume", "/reading-center/rrc/attempt/active"],
    ]);
    expect(readingDashboard("me", [], [], [], [], [progress]).recent).toEqual([]);
    expect(readingDashboard("me", [], [], [], [passage], [{ ...progress, hidden_from_recent: true }]).recent).toEqual([]);
  });

  it("leaves empty graphs empty and never invents practice time", () => {
    const result = readingDashboard("me", [], [], [], [], []);
    expect(result).toMatchObject({ completedLr: 0, completedPassages: 0, practiceSeconds: 0, recallTrend: [], speedTrend: [], recent: [] });
    expect(recordedTime(0)).toBe("0 min");
    expect(recordedTime(30)).toBe("<1 min");
    expect(recordedTime(3660)).toBe("1h 1m");
  });
});

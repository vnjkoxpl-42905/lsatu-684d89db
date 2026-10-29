import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ pages: {} as Record<string, any[]>, queries: [] as any[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (name: string) => {
  const query = { name, filters: [] as any[], range: [] as number[] };
  const builder: any = { select: () => builder, eq: (...args: any[]) => { query.filters.push(args); return builder; }, order: () => builder,
    range: (...args: number[]) => { query.range = args; return builder; }, then: (resolve: any, reject: any) => {
      state.queries.push(query); return Promise.resolve(state.pages[name]?.shift() ?? { data: [], error: null }).then(resolve, reject);
    } };
  return builder;
} } }));
import { getSelectionProgress, loadSelectionProgress } from "./selectionProgress";
import type { AttemptRow, RecapRow } from "./attempts";
const attempt = (overrides: Partial<AttemptRow> = {}): AttemptRow => ({ id: "a", student_id: "owner", mode: "rc_recall", preptest: 140, section: 4, passage_ids: [15], confirmation_scope: "all_read", started_at: "2026-10-20T10:00:00Z", finished_at: null, completed: false, elapsed_seconds: null, segmentation_version: 2, ...overrides });
const recap = (overrides: Partial<RecapRow> = {}): RecapRow => ({ id: "r", attempt_id: "a", student_id: "owner", recap_key: "p1-para1-recall", passage_position: 1, kind: "recall", voice: "spoken", recording_state: "saved", object_path: "owner/a/r.webm", mime_type: "audio/webm", duration_ms: 1000, ...overrides });
const input = { passageIds: [15], paragraphCountsByVersion: { 15: { 1: 3, 2: 4 } }, attempts: [attempt()], recaps: [] as RecapRow[] };
beforeEach(() => { state.pages = {}; state.queries = []; });
describe("selection progress", () => {
  it("does not count merely opening a paragraph", () => {
    expect(getSelectionProgress(input)).toMatchObject({ state: "in_progress", completedParagraphs: 0, totalParagraphs: 4 });
  });
  it("counts only unique validated saved recall cycles", () => {
    const recaps = [recap(), recap({ id: "duplicate" }), recap({ recap_key: "p1-para2-recall", recording_state: "pending" }), recap({ recap_key: "p1-para3-recall", recording_state: "failed" }), recap({ recap_key: "p1-passage-recap", kind: "passage_recap" }), recap({ recap_key: "p1-para5-recall" }), recap({ student_id: "other", recap_key: "p1-para4-recall" }), recap({ passage_position: 2, recap_key: "p1-para4-recall" }), recap({ recap_key: "p1-para2-recall", voice: "silent", recording_state: "not_recorded" })];
    expect(getSelectionProgress({ ...input, recaps }).completedParagraphs).toBe(2);
  });
  it("uses original segmentation for historical attempts", () => {
    expect(getSelectionProgress({ ...input, attempts: [attempt({ segmentation_version: undefined })], recaps: [recap({ recap_key: "p1-para4-recall" })] })).toMatchObject({ completedParagraphs: 0, totalParagraphs: 3 });
  });
  it("makes the newest reset ready while preserving previous practice", () => {
    const older = attempt({ id: "old", started_at: "2026-10-19T10:00:00Z", completed: true, finished_at: "2026-10-19T11:00:00Z" });
    expect(getSelectionProgress({ ...input, attempts: [older, attempt({ finished_at: "2026-10-20T11:00:00Z" })], recaps: [recap()] })).toMatchObject({ state: "ready", completedParagraphs: 0, startedAt: null, completedAt: null, hasPriorPractice: true });
  });
  it("uses newest started date and deterministic identity, not array order", () => {
    expect(getSelectionProgress({ ...input, attempts: [attempt({ id: "z", finished_at: "2026-10-20T11:00:00Z" }), attempt()] }).state).toBe("ready");
  });
  it("supports explicit older unfinished sessions and section passage positions", () => {
    const section = attempt({ id: "section", passage_ids: [14, 15], started_at: "2026-10-19T10:00:00Z" });
    expect(getSelectionProgress({ ...input, attempts: [section, attempt({ finished_at: "2026-10-20T11:00:00Z" })], attemptId: "section", recaps: [recap({ attempt_id: "section", passage_position: 2, recap_key: "p2-para1-recall" })] })).toMatchObject({ state: "in_progress", completedParagraphs: 1, totalParagraphs: 4 });
  });
  it("renders server-finalized completion without inventing an active start", () => {
    expect(getSelectionProgress({ ...input, attempts: [attempt({ completed: true, finished_at: "2026-10-20T11:00:00Z" })] })).toMatchObject({ state: "completed", completedParagraphs: 4, completedAt: "2026-10-20T11:00:00Z", startedAt: null });
  });
  it("does not invent a denominator when source text is unavailable", () => {
    expect(getSelectionProgress({ ...input, paragraphCountsByVersion: {} }).totalParagraphs).toBeNull();
  });
  it("recognizes a saved completed passage in an unfinished section, but never overrides reset", () => {
    const passageProgress = [{ attempt_id: "a", student_id: "owner", passage_id: 15, passage_position: 1, active_ms: 3000, completed: true, completed_at: "2026-10-20T11:00:00Z", created_at: "2026-10-20T10:00:00Z", updated_at: "2026-10-20T11:00:00Z" }];
    expect(getSelectionProgress({ ...input, passageProgress }).state).toBe("completed");
    expect(getSelectionProgress({ ...input, passageProgress, attempts: [attempt({ finished_at: "2026-10-20T11:30:00Z" })] }).state).toBe("ready");
    expect(getSelectionProgress({ ...input, passageProgress: passageProgress.map(row => ({ ...row, student_id: "other" })) }).state).toBe("in_progress");
  });
  it("paginates both owner-scoped datasets past server and history limits", async () => {
    state.pages.rc_recall_attempts = [{ data: Array.from({ length: 1000 }, (_, i) => attempt({ id: String(i) })), error: null }, { data: [attempt({ id: "old" })], error: null }];
    state.pages.rc_recall_recaps = [{ data: Array.from({ length: 1000 }, (_, i) => recap({ id: String(i) })), error: null }, { data: [recap({ id: "old" })], error: null }];
    const result = await loadSelectionProgress("owner");
    expect(result.attempts).toHaveLength(1001); expect(result.recaps).toHaveLength(1001);
    expect(state.queries.every(q => q.filters.some(([key, value]: string[]) => key === "student_id" && value === "owner"))).toBe(true);
    expect(state.queries.filter(q => q.name === "rc_recall_attempts").map(q => q.range)).toEqual([[0, 999], [1000, 1999]]);
  });
  it("propagates read failures rather than claiming empty progress", async () => {
    state.pages.rc_recall_recaps = [{ data: null, error: { message: "offline" } }];
    await expect(loadSelectionProgress("owner")).rejects.toMatchObject({ message: "offline" });
  });
});
